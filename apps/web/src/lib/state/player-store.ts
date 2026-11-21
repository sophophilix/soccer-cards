import { createPlayerState } from '@soccer-cards/game';
import type { PlayerState } from '@soccer-cards/game';
import { checkPlayerState } from './check-player-state.ts';

/** The one key that holds the player's progress, as JSON. */
export const STATE_KEY = 'soccer-cards:player-state';
/** Where the first saved state the game couldn't use is kept. Later ones get `:2`, `:3` and on. */
export const BACKUP_KEY = 'soccer-cards:player-state:backup';

/** The part of the browser's storage the store uses. */
export type ItemStorage = Pick<Storage, 'getItem' | 'setItem'>;
/** What loading found. Every outcome but `loaded` is something a view tells the player. */
export type LoadOutcome =
	'loaded' | 'new-player' | 'replaced-invalid' | 'replaced-newer-version' | 'not-saving';
/** The state to play with, and what loading found. */
interface LoadResult {
	readonly state: PlayerState;
	readonly outcome: LoadOutcome;
}
/** What another tab's change means here. On `not-saving`, play on with the state in hand. */
export type TabChange =
	| { readonly outcome: 'loaded' | 'new-player'; readonly state: PlayerState }
	| { readonly outcome: 'not-saving' };
type SaveRefusal = 'not-saving' | 'storage-full' | 'changed-in-another-tab';
/** The state was saved, or why it wasn't. A refused save writes nothing. */
export type SaveResult =
	{ readonly ok: true } | { readonly ok: false; readonly reason: SaveRefusal };

/** Loads, saves, and hears about a change in another tab until the returned function stops it. */
export interface PlayerStore {
	readonly load: () => LoadResult;
	readonly save: (state: PlayerState) => SaveResult;
	readonly subscribe: (onChange: (change: TabChange) => void) => () => void;
}

/** The part of the browser's storage a clear uses, to find each key the store owns. */
export type ClearableStorage = Pick<Storage, 'length' | 'key' | 'removeItem'>;
/** Every key the store owns is gone, or the caller must tell the player it isn't. */
export type ClearResult =
	{ readonly ok: true } | { readonly ok: false; readonly reason: 'not-cleared' };

/** The event this tab fires after each save. It carries no state: a listener reads it through `load()`. */
export const SAVED_EVENT = 'soccer-cards:saved';

function announceSaved(): void {
	if (typeof window === 'undefined') return;
	window.dispatchEvent(new Event(SAVED_EVENT));
}

/** Returns the browser's storage, or nothing while prerendering or when the browser refuses it. */
export function browserStorage(): Storage | undefined {
	if (typeof window === 'undefined') return undefined;
	try {
		return window.localStorage;
	} catch {
		// Private browsing and blocked site data can throw here. The game plays without saving.
		return undefined;
	}
}

function parse(text: string): unknown {
	try {
		return JSON.parse(text);
	} catch {
		return undefined;
	}
}

/** The first backup key with nothing in it, so no earlier backup is ever overwritten. */
function freeBackupKey(storage: ItemStorage, number = 1): string {
	const key = number === 1 ? BACKUP_KEY : `${BACKUP_KEY}:${String(number)}`;
	return storage.getItem(key) === null ? key : freeBackupKey(storage, number + 1);
}

/** Creates the store for the player's progress. Storage is first asked for on the first load. */
export function createPlayerStore(getStorage: () => ItemStorage | undefined): PlayerStore {
	let storage: ItemStorage | undefined;
	// The text this tab last loaded or saved, to tell when another tab has saved since.
	let knownText: string | null = null;
	const notSaving = (): LoadResult => {
		storage = undefined;
		return { state: createPlayerState(), outcome: 'not-saving' };
	};
	// Undefined means storage is missing or throws.
	const read = (from: ItemStorage | undefined): string | null | undefined => {
		try {
			return from?.getItem(STATE_KEY);
		} catch {
			return undefined;
		}
	};

	const load = (): LoadResult => {
		const from = (storage ??= getStorage());
		const text = read(from);
		if (from === undefined || text === undefined) return notSaving();
		knownText = text;
		if (text === null) return { state: createPlayerState(), outcome: 'new-player' };
		const checked = checkPlayerState(parse(text));
		if (checked.ok) return { state: checked.value, outcome: 'loaded' };
		const state = createPlayerState();
		try {
			from.setItem(freeBackupKey(from), text);
			from.setItem(STATE_KEY, JSON.stringify(state));
		} catch {
			// Without a backup the old progress must not be overwritten, so stop saving.
			return notSaving();
		}
		knownText = JSON.stringify(state);
		return { state, outcome: `replaced-${checked.reason}` };
	};

	// Another tab owns what it wrote, so this never writes. A state it can't use stops saving here.
	const hear = (): TabChange => {
		const text = read(storage);
		const checked = typeof text === 'string' ? checkPlayerState(parse(text)) : undefined;
		if (text === undefined || checked?.ok === false) {
			storage = undefined;
			return { outcome: 'not-saving' };
		}
		knownText = text;
		return checked === undefined
			? { state: createPlayerState(), outcome: 'new-player' }
			: { state: checked.value, outcome: 'loaded' };
	};

	const save = (state: PlayerState): SaveResult => {
		if (storage === undefined) return { ok: false, reason: 'not-saving' };
		try {
			if (storage.getItem(STATE_KEY) !== knownText) {
				return { ok: false, reason: 'changed-in-another-tab' };
			}
			const text = JSON.stringify(state);
			storage.setItem(STATE_KEY, text);
			knownText = text;
			announceSaved();
			return { ok: true };
		} catch (error) {
			const isFull = error instanceof DOMException && error.name === 'QuotaExceededError';
			return { ok: false, reason: isFull ? 'storage-full' : 'not-saving' };
		}
	};

	const subscribe = (onChange: (change: TabChange) => void): (() => void) => {
		if (typeof window === 'undefined') return () => undefined;
		// A key of null means another tab cleared everything, as "Start again" does.
		const listener = ({ key }: StorageEvent): void => {
			if (key === STATE_KEY || key === null) onChange(hear());
		};
		window.addEventListener('storage', listener);
		return () => {
			window.removeEventListener('storage', listener);
		};
	};

	return { load, save, subscribe };
}

/** Removes the state and every backup, as "Start again" does. Other keys are left alone. */
export function clearPlayerStorage(getStorage: () => ClearableStorage | undefined): ClearResult {
	const storage = getStorage();
	if (storage === undefined) return { ok: false, reason: 'not-cleared' };
	try {
		const keys = Array.from({ length: storage.length }, (_, index) => storage.key(index));
		// The backups are STATE_KEY with a suffix, numbered without an upper bound.
		const isOwned = (key: string | null): key is string =>
			key === STATE_KEY || key?.startsWith(`${STATE_KEY}:`) === true;
		for (const key of keys.filter(isOwned)) storage.removeItem(key);
		return { ok: true };
	} catch {
		return { ok: false, reason: 'not-cleared' };
	}
}
