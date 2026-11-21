import { TEAM_SIZE, bestTeam, lineUp } from '@soccer-cards/game';
import type { Card, CardId, CheckedCardSet, Formation, LineUp, Position } from '@soccer-cards/game';
import { LINES } from './match-words.ts';

/** The team after a tap, or why the tap changed nothing. */
export type TogglePickResult =
	| { readonly ok: true; readonly team: readonly CardId[] }
	| { readonly ok: false; readonly reason: 'team-full' };

/** Takes a picked player out, or puts one in while the team has room. */
export function togglePick(team: readonly CardId[], id: CardId): TogglePickResult {
	if (team.includes(id)) return { ok: true, team: team.filter((each) => each !== id) };
	if (team.length >= TEAM_SIZE) return { ok: false, reason: 'team-full' };
	return { ok: true, team: [...team, id] };
}

/** The strongest team the player owns for the formation. */
export function pickBest(
	cardSet: CheckedCardSet,
	owned: readonly CardId[],
	formation: Formation
): readonly CardId[] {
	return bestTeam(cardSet, owned, formation);
}

/** The team with nobody in it. */
export function clearTeam(): readonly CardId[] {
	return [];
}

/** The owned cards once each, by line from the front, then highest rating first. */
export function sortOwned(cardSet: CheckedCardSet, owned: readonly CardId[]): readonly Card[] {
	const wanted = new Set(owned);
	const rank = (card: Card): number => LINES.indexOf(card.position);
	return cardSet
		.filter((card) => wanted.has(card.id))
		.toSorted((a, b) => rank(a) - rank(b) || b.overall - a.overall || (a.id < b.id ? -1 : 1));
}

/** Where the picked players stand: placed for the formation at 11, in their own line before. */
export function arrangeTeam(
	team: readonly CardId[],
	cardSet: CheckedCardSet,
	formation: Formation
): LineUp {
	const placed = lineUp(team, cardSet, formation);
	if (placed.ok) return placed.value;
	const lines: Record<Position, CardId[]> = { FW: [], MF: [], DF: [], GK: [] };
	const positionOf = new Map(cardSet.map((card) => [card.id, card.position]));
	for (const id of team) {
		const position = positionOf.get(id);
		if (position !== undefined) lines[position].push(id);
	}
	return { lines, outOfPosition: [] };
}
