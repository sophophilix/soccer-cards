import { createPlayerState } from '@soccer-cards/game';
import type { PlayerState } from '@soccer-cards/game';
import { checkPlayerState } from './check-player-state.ts';

/** The one key that holds the player's progress, as JSON. */
export const STATE_KEY = 'soccer-cards:player-state';
/** Where a saved state the game couldn't use is kept, so nothing is destroyed silently. */
export const BACKUP_KEY = 'soccer-cards:player-state:backup';

/** The part of the browser's storage the store uses. */
export type ItemStorage = Pick<Storage, 'getItem' | 'setItem'>;
/** What loading found. Every outcome but `loaded` is something a view tells the player. */
export type LoadOutcome =
	'loaded' | 'new-player' | 'replaced-invalid' | 'replaced-newer-version' | 'not-saving';
/** The state to play with, and what loading found. */
export interface LoadResult {
	readonly state: PlayerState;
	readonly outcome: LoadOutcome;
}
type SaveRefusal = 'not-saving' | 'storage-full' | 'changed-in-another-tab';
/** The state was saved, or why it wasn't. A refused save writes nothing. */
export type SaveResult =
	{ readonly ok: true } | { readonly ok: false; readonly reason: SaveRefusal };

/** Loads, saves, and hears about a save in another tab until the returned function stops it. */
export interface PlayerStore {
	readonly load: () => LoadResult;
	readonly save: (state: PlayerState) => SaveResult;
	readonly subscribe: (onChange: (result: LoadResult) => void) => () => void;
}

/** Returns the browser's storage, or nothing while prerendering or when the browser refuses it. */
export function browserStorage(): ItemStorage | undefined {
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

/** Creates the store for the player's progress. Storage is first asked for on the first load. */
export function createPlayerStore(getStorage: () => ItemStorage | undefined): PlayerStore {
	let storage: ItemStorage | undefined;
	// The text this tab last loaded or saved, to tell when another tab has saved since.
	let knownText: string | null = null;
	const notSaving = (): LoadResult => {
		storage = undefined;
		return { state: createPlayerState(), outcome: 'not-saving' };
	};

	const load = (): LoadResult => {
		storage ??= getStorage();
		if (storage === undefined) return notSaving();
		let text: string | null;
		try {
			text = storage.getItem(STATE_KEY);
		} catch {
			return notSaving();
		}
		knownText = text;
		if (text === null) return { state: createPlayerState(), outcome: 'new-player' };
		const checked = checkPlayerState(parse(text));
		if (checked.ok) return { state: checked.value, outcome: 'loaded' };
		const state = createPlayerState();
		try {
			storage.setItem(BACKUP_KEY, text);
			storage.setItem(STATE_KEY, JSON.stringify(state));
		} catch {
			// Without a backup the old progress must not be overwritten, so stop saving.
			return notSaving();
		}
		knownText = JSON.stringify(state);
		return { state, outcome: `replaced-${checked.reason}` };
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
			return { ok: true };
		} catch (error) {
			const isFull = error instanceof DOMException && error.name === 'QuotaExceededError';
			return { ok: false, reason: isFull ? 'storage-full' : 'not-saving' };
		}
	};

	const subscribe = (onChange: (result: LoadResult) => void): (() => void) => {
		// A key of null means another tab cleared everything, as "Start again" does.
		const listener = ({ key }: StorageEvent): void => {
			if (key === STATE_KEY || key === null) onChange(load());
		};
		window.addEventListener('storage', listener);
		return () => {
			window.removeEventListener('storage', listener);
		};
	};

	return { load, save, subscribe };
}
