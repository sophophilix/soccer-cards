import { DIVISIONS, createPlayerState, toCardId } from '@soccer-cards/game';
import type { PlayerState } from '@soccer-cards/game';
import fc from 'fast-check';
import { describe, expect, onTestFinished, test, vi } from 'vitest';
import {
	BACKUP_KEY,
	SAVED_EVENT,
	STATE_KEY,
	browserStorage,
	clearPlayerStorage,
	createPlayerStore
} from './player-store.ts';
import type { LoadOutcome, SaveResult, TabChange } from './player-store.ts';
type Failure = 'none' | 'read' | 'write' | 'full';

/** A stand-in for localStorage that can be made to throw as a browser does. */
function aStorage(saved: Readonly<Record<string, string>> = {}, failure: Failure = 'none') {
	const items = new Map(Object.entries(saved));
	const refuse = (when: Failure): void => {
		if (failure === when) throw new DOMException('no', when === 'full' ? 'QuotaExceededError' : '');
	};
	const getItem = (key: string): string | null => {
		refuse('read');
		return items.get(key) ?? null;
	};
	const setItem = (key: string, value: string): void => {
		refuse(failure === 'full' ? 'full' : 'write');
		items.set(key, value);
	};
	return { storage: { getItem, setItem }, items };
}

const aState = (changes: Partial<PlayerState>): PlayerState => ({
	...createPlayerState(),
	...changes
});
const fresh = createPlayerState();

/** A store that has loaded, as a view does, and now listens for another tab's change. */
function aListeningStore(saved: Readonly<Record<string, string>> = {}) {
	const { storage, items } = aStorage(saved);
	const store = createPlayerStore(() => storage);
	store.load();
	const onChange = vi.fn<(change: TabChange) => void>();
	return { store, items, onChange, stop: store.subscribe(onChange) };
}

describe('the player store', () => {
	test('asks for no storage until the first load, so prerendering reads nothing', () => {
		const getStorage = vi.fn(() => undefined);

		createPlayerStore(getStorage);

		expect(getStorage).not.toHaveBeenCalled();
	});

	test('starts a new player, then saves the state as JSON under one key with its version', () => {
		const { storage, items } = aStorage();
		const store = createPlayerStore(() => storage);

		expect(store.load()).toEqual({ state: fresh, outcome: 'new-player' });
		expect(store.save(aState({ coins: 9 }))).toEqual({ ok: true });
		expect([...items.keys()]).toEqual([STATE_KEY]);
		expect(JSON.parse(items.get(STATE_KEY) ?? '')).toMatchObject({ version: 2, coins: 9 });
	});

	test.each<[string, string, LoadOutcome]>([
		['text that is not JSON', '{coins:', 'replaced-invalid'],
		['a state that fails the check', JSON.stringify(aState({ coins: -1 })), 'replaced-invalid'],
		['a newer version', JSON.stringify({ ...fresh, version: 3 }), 'replaced-newer-version']
	])('backs up %s and starts again', (_name, text, outcome) => {
		const { storage, items } = aStorage({ [STATE_KEY]: text });

		expect(createPlayerStore(() => storage).load()).toEqual({ state: fresh, outcome });
		expect(items.get(BACKUP_KEY)).toBe(text);
		expect(items.get(STATE_KEY)).toBe(JSON.stringify(fresh));
	});

	test('keeps the old progress and stops saving when the backup cannot be written', () => {
		const { storage, items } = aStorage({ [STATE_KEY]: 'not json' }, 'full');
		const store = createPlayerStore(() => storage);

		expect(store.load().outcome).toBe('not-saving');
		expect(store.save(fresh)).toEqual({ ok: false, reason: 'not-saving' });
		expect(items.get(STATE_KEY)).toBe('not json');
	});

	test.each([
		['missing', undefined],
		['throwing on read, as in private browsing', aStorage({}, 'read').storage]
	])('plays for the session without saving when storage is %s', (_name, storage) => {
		const store = createPlayerStore(() => storage);

		expect(store.load()).toEqual({ state: fresh, outcome: 'not-saving' });
		expect(store.save(fresh)).toEqual({ ok: false, reason: 'not-saving' });
	});

	test.each<[Failure, SaveResult]>([
		['full', { ok: false, reason: 'storage-full' }],
		['write', { ok: false, reason: 'not-saving' }]
	])('tells the caller when a save fails with storage %s', (failure, result) => {
		const store = createPlayerStore(() => aStorage({}, failure).storage);
		store.load();

		expect(store.save(fresh)).toEqual(result);
	});

	test('fires the saved event with no state in it after a save', () => {
		const { storage } = aStorage();
		const store = createPlayerStore(() => storage);
		store.load();
		const heard = vi.fn<(event: Event) => void>();
		window.addEventListener(SAVED_EVENT, heard);
		onTestFinished(() => {
			window.removeEventListener(SAVED_EVENT, heard);
		});

		store.save(aState({ coins: 9 }));

		expect(heard).toHaveBeenCalledOnce();
		expect(heard.mock.calls[0]?.[0]).not.toBeInstanceOf(CustomEvent);
		expect(heard.mock.calls[0]?.[0]).not.toHaveProperty('detail');
	});

	test('refuses to overwrite progress another tab saved since this tab loaded', () => {
		const { storage } = aStorage();
		const [stale, other] = [createPlayerStore(() => storage), createPlayerStore(() => storage)];
		stale.load();
		other.load();
		other.save(aState({ coins: 20 }));

		const refused = stale.save(aState({ coins: 1 }));

		expect(refused).toEqual({ ok: false, reason: 'changed-in-another-tab' });
		expect(stale.load().state.coins).toBe(20);
	});

	test('hears a save from another tab through the storage event, until it stops', () => {
		const { store, items, onChange, stop } = aListeningStore();
		const state = aState({ wins: 5 });
		items.set(STATE_KEY, JSON.stringify(state));

		window.dispatchEvent(new StorageEvent('storage', { key: STATE_KEY }));
		window.dispatchEvent(new StorageEvent('storage', { key: 'another-key' }));
		stop();
		window.dispatchEvent(new StorageEvent('storage', { key: null }));

		expect(onChange).toHaveBeenCalledExactlyOnceWith({ state, outcome: 'loaded' });
		expect(store.save(aState({ wins: 6 }))).toEqual({ ok: true });
	});

	test('writes nothing and stops saving when another tab saves a state it cannot read', () => {
		const { store, items, onChange, stop } = aListeningStore();
		const newer = JSON.stringify({ ...fresh, version: 3 });
		items.set(STATE_KEY, newer);

		window.dispatchEvent(new StorageEvent('storage', { key: STATE_KEY }));
		stop();

		expect(onChange).toHaveBeenCalledExactlyOnceWith({ outcome: 'not-saving' });
		expect(store.save(fresh)).toEqual({ ok: false, reason: 'not-saving' });
		expect(Object.fromEntries(items)).toEqual({ [STATE_KEY]: newer });
	});

	test('starts a new player and keeps saving when another tab clears storage', () => {
		const saved = JSON.stringify(aState({ coins: 4 }));
		const { store, items, onChange, stop } = aListeningStore({ [STATE_KEY]: saved });
		items.clear();

		window.dispatchEvent(new StorageEvent('storage', { key: null }));
		stop();

		expect(onChange).toHaveBeenCalledExactlyOnceWith({ state: fresh, outcome: 'new-player' });
		expect(store.save(aState({ coins: 1 }))).toEqual({ ok: true });
	});

	test('keeps an earlier backup and puts a new one beside it', () => {
		const { storage, items } = aStorage({ [STATE_KEY]: 'second', [BACKUP_KEY]: 'first' });

		expect(createPlayerStore(() => storage).load().outcome).toBe('replaced-invalid');
		expect(items.get(BACKUP_KEY)).toBe('first');
		expect(items.get(`${BACKUP_KEY}:2`)).toBe('second');
	});

	test('finds the browser storage in a browser', () => {
		expect(browserStorage()).toBe(window.localStorage);
	});

	test('plays on without saving when reading localStorage itself throws, as with blocked data', () => {
		vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
			throw new DOMException('blocked', 'SecurityError');
		});
		onTestFinished(() => {
			vi.restoreAllMocks();
		});
		const store = createPlayerStore(browserStorage);

		expect(store.load()).toEqual({ state: fresh, outcome: 'not-saving' });
		expect(store.save(fresh)).toEqual({ ok: false, reason: 'not-saving' });
	});

	test('gives back any valid state it saved', () => {
		const count = fc.nat(1000);
		const cardId = fc.string({ minLength: 1 }).filter((text) => text.trim() !== '');
		const cardIds = fc.array(cardId.map(toCardId));
		const validState: fc.Arbitrary<PlayerState> = fc.record({
			version: fc.constant(2 as const),
			...{ freePacks: count, coins: count, divisionWins: count, wins: count, losses: count },
			collection: fc.dictionary(cardId, count),
			favourites: cardIds,
			pendingPack: fc.option(fc.record({ kind: fc.constantFrom('standard', 'jumbo'), cardIds })),
			division: fc.constantFrom(...DIVISIONS.map((division) => division.id))
		});

		fc.assert(
			fc.property(validState, (state) => {
				const { storage } = aStorage();
				const writer = createPlayerStore(() => storage);
				writer.load();
				writer.save(state);

				expect(createPlayerStore(() => storage).load()).toEqual({ state, outcome: 'loaded' });
			}),
			{ seed: 20261120 }
		);
	});
});

/** A stand-in for localStorage with the parts a clear needs. */
function aClearableStorage(saved: Readonly<Record<string, string>>, failsToRemove = false) {
	const items = new Map(Object.entries(saved));
	const storage = {
		get length() {
			return items.size;
		},
		key: (index: number): string | null => [...items.keys()][index] ?? null,
		removeItem: (key: string): void => {
			if (failsToRemove) throw new DOMException('no', 'SecurityError');
			items.delete(key);
		}
	};
	return { storage, items };
}

describe('clearPlayerStorage', () => {
	test('removes the state and all three numbered backups, and leaves other keys alone', () => {
		const { storage, items } = aClearableStorage({
			[STATE_KEY]: '{}',
			[BACKUP_KEY]: 'first',
			[`${BACKUP_KEY}:2`]: 'second',
			[`${BACKUP_KEY}:3`]: 'third',
			'another-game:player-state': 'theirs'
		});

		expect(clearPlayerStorage(() => storage)).toEqual({ ok: true });
		expect(Object.fromEntries(items)).toEqual({ 'another-game:player-state': 'theirs' });
	});

	test.each([
		['missing', undefined],
		['throwing during the clear', aClearableStorage({ [STATE_KEY]: '{}' }, true).storage]
	])('tells the caller when storage is %s', (_name, storage) => {
		expect(clearPlayerStorage(() => storage)).toEqual({ ok: false, reason: 'not-cleared' });
	});
});
