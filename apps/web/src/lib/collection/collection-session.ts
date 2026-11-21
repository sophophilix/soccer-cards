import type { CardId, CheckedCardSet, PlayerState } from '@soccer-cards/game';
import type { CardFace } from '../data/card-face-from-summary.ts';
import { loadCardSet } from '../data/load-card-set.ts';
import { browserStorage, createPlayerStore } from '../state/player-store.ts';
import type { LoadOutcome, PlayerStore, SaveResult } from '../state/player-store.ts';

/** The player's state and the card set, ready for the Cards and Guide views, or why not. */
export type CollectionSession =
	| {
			readonly ok: true;
			readonly store: PlayerStore;
			readonly state: PlayerState;
			readonly outcome: LoadOutcome;
			readonly cardSet: CheckedCardSet;
			readonly faces: ReadonlyMap<CardId, CardFace>;
	  }
	| { readonly ok: false; readonly state: PlayerState };

/** Loads the saved state and the card set. Runs in the browser, never while prerendering. */
export async function openCollection(): Promise<CollectionSession> {
	const store = createPlayerStore(browserStorage);
	const { state, outcome } = store.load();
	const set = await loadCardSet((path) => fetch(path));
	if (!set.ok) return { ok: false, state };
	return { ok: true, store, state, outcome, cardSet: set.value, faces: set.faces };
}

const SAVE_NOTICES = {
	'not-saving': "Your cards can't be saved on this device.",
	'storage-full': 'This device is full, so your cards were not saved.',
	'changed-in-another-tab': 'The game is open in another tab, so your cards were not saved here.'
} as const;

/** The words for a refused save, or nothing when the save worked. */
export function saveNotice(result: SaveResult): string | undefined {
	return result.ok ? undefined : SAVE_NOTICES[result.reason];
}
