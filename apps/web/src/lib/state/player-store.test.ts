import { DIVISIONS, createPlayerState, toCardId } from '@soccer-cards/game';
import type { PlayerState } from '@soccer-cards/game';
import fc from 'fast-check';
import { describe, expect, test, vi } from 'vitest';
import { BACKUP_KEY, STATE_KEY, browserStorage, createPlayerStore } from './player-store.ts';
import type { LoadOutcome, LoadResult, SaveResult } from './player-store.ts';

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

const aState = (overrides: Partial<PlayerState>): PlayerState => ({
	...createPlayerState(),
	...overrides
});
const fresh = createPlayerState();

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

	test('refuses to overwrite progress another tab saved since this tab loaded', () => {
		const { storage } = aStorage();
		const [stale, other] = [createPlayerStore(() => storage), createPlayerStore(() => storage)];
		stale.load();
		other.load();
		other.save(aState({ coins: 20 }));

		expect(stale.save(aState({ coins: 1 }))).toEqual({
			ok: false,
			reason: 'changed-in-another-tab'
		});
		expect(stale.load().state.coins).toBe(20);
	});

	test('hears a save from another tab through the storage event, until it stops', () => {
		const { storage, items } = aStorage();
		const store = createPlayerStore(() => storage);
		const onChange = vi.fn<(result: LoadResult) => void>();
		const stop = store.subscribe(onChange);
		items.set(STATE_KEY, JSON.stringify(aState({ wins: 5 })));

		window.dispatchEvent(new StorageEvent('storage', { key: STATE_KEY }));
		window.dispatchEvent(new StorageEvent('storage', { key: 'another-key' }));
		stop();
		window.dispatchEvent(new StorageEvent('storage', { key: null }));

		expect(onChange).toHaveBeenCalledExactlyOnceWith({
			state: aState({ wins: 5 }),
			outcome: 'loaded'
		});
		expect(store.save(aState({ wins: 6 }))).toEqual({ ok: true });
	});

	test('finds the browser storage in a browser', () => {
		expect(browserStorage()).toBe(window.localStorage);
	});

	test('gives back any valid state it saved', () => {
		const count = fc.nat(1000);
		const cardId = fc
			.string()
			.filter((text) => text.trim() !== '')
			.map(toCardId);
		const pendingPack = fc.record({
			kind: fc.constantFrom('standard', 'jumbo'),
			cardIds: fc.array(cardId)
		});
		const validState: fc.Arbitrary<PlayerState> = fc.record({
			version: fc.constant(2 as const),
			...{ freePacks: count, coins: count, divisionWins: count, wins: count, losses: count },
			collection: fc.array(fc.tuple(cardId, count)).map((entries) => Object.fromEntries(entries)),
			favourites: fc.array(cardId),
			pendingPack: fc.option(pendingPack),
			division: fc.constantFrom(...DIVISIONS.map((division) => division.id))
		});

		fc.assert(
			fc.property(validState, (state) => {
				const { storage } = aStorage();
				const [writer, reader] = [
					createPlayerStore(() => storage),
					createPlayerStore(() => storage)
				];
				writer.load();
				writer.save(state);

				expect(reader.load()).toEqual({ state, outcome: 'loaded' });
			}),
			{ seed: 20261120 }
		);
	});
});
