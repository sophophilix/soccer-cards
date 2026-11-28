import { checkCardSet } from '@soccer-cards/game';
import type { Card, CardId, CardSetResult, CheckedCardSet } from '@soccer-cards/game';
import { cardFaceFromSummary, clubNamesFromList } from './card-face-from-summary.ts';
import type { CardFace } from './card-face-from-summary.ts';
import { cardFromSummary } from './card-from-summary.ts';

/** Where the site serves the list of players, on its own origin (ADR 0003 D5, ADR 0005 D8). */
export const PLAYERS_PATH = '/api/v1/players.json';
/** Where the site serves the list of clubs, for the club name on a card. */
export const CLUBS_PATH = '/api/v1/clubs.json';

/** Fetches one file from the site. `fetch`, or the `fetch` a SvelteKit load function gets. */
export type FetchFile = (path: string) => Promise<Response>;

/** The checked card set, each card's face fields, and how many summaries were left out, or why there is none. */
export type LoadCardSetResult =
	| {
			readonly ok: true;
			readonly value: CheckedCardSet;
			readonly faces: ReadonlyMap<CardId, CardFace>;
			readonly leftOutCount: number;
	  }
	| { readonly ok: false; readonly reason: 'network-error' | 'bad-response' | 'not-a-player-list' }
	| Extract<CardSetResult, { readonly ok: false }>;

const NOT_JSON = Symbol('not JSON');

type BodyResult =
	| { readonly ok: true; readonly body: unknown }
	| { readonly ok: false; readonly reason: 'network-error' | 'bad-response' };

async function fetchBody(fetchFile: FetchFile, path: string): Promise<BodyResult> {
	const response = await fetchFile(path).catch(() => undefined);
	if (response === undefined) return { ok: false, reason: 'network-error' };
	// A body that is not JSON is a bad response, the same as a failed status.
	const body: unknown = response.ok ? await response.json().catch(() => NOT_JSON) : NOT_JSON;
	return body === NOT_JSON ? { ok: false, reason: 'bad-response' } : { ok: true, body };
}

function summariesOf(body: unknown): readonly unknown[] | undefined {
	if (typeof body !== 'object' || body === null || !('players' in body)) return undefined;
	return Array.isArray(body.players) ? body.players : undefined;
}

/** Adds the player's national team code, which the API requires, to the card. */
function withNationalTeam(card: Card | undefined, summary: unknown): Card | undefined {
	if (card === undefined || typeof summary !== 'object' || summary === null) return undefined;
	const code = 'nationalTeamCode' in summary ? summary.nationalTeamCode : undefined;
	return typeof code === 'string' ? { ...card, nationalTeam: code } : undefined;
}

/** Fetches players.json and clubs.json from the site and turns them into the checked card set and its faces. */
export async function loadCardSet(fetchFile: FetchFile): Promise<LoadCardSetResult> {
	const [fetched, fetchedClubs] = await Promise.all([
		fetchBody(fetchFile, PLAYERS_PATH),
		fetchBody(fetchFile, CLUBS_PATH)
	]);
	if (!fetched.ok) return fetched;
	const summaries = summariesOf(fetched.body);
	if (summaries === undefined) return { ok: false, reason: 'not-a-player-list' };
	// Without clubs.json the cards still show, with no club name.
	const clubNames = clubNamesFromList(fetchedClubs.ok ? fetchedClubs.body : undefined);
	const faces = new Map<CardId, CardFace>();
	const cards: Card[] = [];
	for (const summary of summaries) {
		const card = withNationalTeam(cardFromSummary(summary), summary);
		const face = cardFaceFromSummary(summary, clubNames);
		if (card === undefined || face === undefined) continue;
		cards.push(card);
		faces.set(card.id, face);
	}
	const checked = checkCardSet(cards);
	if (!checked.ok) return checked;
	return { ok: true, value: checked.value, faces, leftOutCount: summaries.length - cards.length };
}
