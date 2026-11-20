import { checkCardSet } from '@soccer-cards/game';
import type { Card, CardSetResult, CheckedCardSet } from '@soccer-cards/game';
import { cardFromSummary } from './card-from-summary.ts';

/** Where the site serves the list of players, on its own origin (ADR 0003 D5, ADR 0005 D8). */
export const PLAYERS_PATH = '/api/v1/players.json';

/** Fetches one file from the site. `fetch`, or the `fetch` a SvelteKit load function gets. */
export type FetchFile = (path: string) => Promise<Response>;

/** The checked card set and how many summaries were left out as unknown, or why there is none. */
export type LoadCardSetResult =
	| { readonly ok: true; readonly value: CheckedCardSet; readonly leftOutCount: number }
	| { readonly ok: false; readonly reason: 'network-error' | 'bad-response' | 'not-a-player-list' }
	| Extract<CardSetResult, { readonly ok: false }>;

const NOT_JSON = Symbol('not JSON');

type BodyResult =
	| { readonly ok: true; readonly body: unknown }
	| { readonly ok: false; readonly reason: 'network-error' | 'bad-response' };

async function fetchBody(fetchFile: FetchFile): Promise<BodyResult> {
	const response = await fetchFile(PLAYERS_PATH).catch(() => undefined);
	if (response === undefined) return { ok: false, reason: 'network-error' };
	// A body that is not JSON is a bad response, the same as a failed status.
	const body: unknown = response.ok ? await response.json().catch(() => NOT_JSON) : NOT_JSON;
	return body === NOT_JSON ? { ok: false, reason: 'bad-response' } : { ok: true, body };
}

function summariesOf(body: unknown): readonly unknown[] | undefined {
	if (typeof body !== 'object' || body === null || !('players' in body)) return undefined;
	return Array.isArray(body.players) ? body.players : undefined;
}

/** Fetches players.json from the site and turns it into the game's checked card set. */
export async function loadCardSet(fetchFile: FetchFile): Promise<LoadCardSetResult> {
	const fetched = await fetchBody(fetchFile);
	if (!fetched.ok) return fetched;
	const summaries = summariesOf(fetched.body);
	if (summaries === undefined) return { ok: false, reason: 'not-a-player-list' };
	const cards = summaries.map(cardFromSummary).filter((card): card is Card => card !== undefined);
	const checked = checkCardSet(cards);
	if (!checked.ok) return checked;
	return { ok: true, value: checked.value, leftOutCount: summaries.length - cards.length };
}
