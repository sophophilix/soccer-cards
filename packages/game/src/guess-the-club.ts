import type { Random } from './random.ts';
import { MIN_TRAIL_SPELLS } from './transfer-trail.ts';
import type { Career, ClubId, PlayerId, Spell } from './transfer-trail.ts';

/** The most questions in one Guess the Club round. */
export const GUESS_QUESTIONS = 5;
/** The clubs a child chooses from in one question. */
export const GUESS_OPTIONS = 4;
const WRONG_OPTIONS = GUESS_OPTIONS - 1;

/** One question: a player, the club hidden in the career, and the clubs to choose from. */
export interface GuessQuestion {
	readonly playerId: PlayerId;
	readonly hiddenClub: ClubId;
	/** Positions in the career of every spell at the hidden club. */
	readonly hiddenSpells: readonly number[];
	readonly options: readonly ClubId[];
}

/** A round in progress. */
export interface GuessRound {
	readonly questions: readonly GuessQuestion[];
}

interface Candidate {
	readonly playerId: PlayerId;
	readonly hiddenClub: ClubId;
	readonly hiddenSpells: readonly number[];
	readonly strangers: readonly ClubId[];
}

const unique = (clubs: readonly ClubId[]): ClubId[] => Array.from(new Set(clubs));

function withoutDuplicateIds(careers: readonly Career[]): Career[] {
	const counts = new Map<PlayerId, number>();
	for (const career of careers) {
		counts.set(career.playerId, (counts.get(career.playerId) ?? 0) + 1);
	}
	return careers.filter((career) => counts.get(career.playerId) === 1);
}

function hiddenClubOf(spells: readonly Spell[]): ClubId | undefined {
	let best: Spell | undefined;
	for (const spell of spells) {
		if (spell.games !== undefined && (best?.games === undefined || spell.games > best.games)) {
			best = spell;
		}
	}
	return best?.clubId;
}

function candidatesFor(careers: readonly Career[]): Candidate[] {
	const allClubs = unique(careers.flatMap((career) => career.spells.map((spell) => spell.clubId)));
	const found: Candidate[] = [];
	for (const career of careers) {
		const hiddenClub = hiddenClubOf(career.spells);
		if (career.spells.length < MIN_TRAIL_SPELLS || hiddenClub === undefined) {
			continue;
		}
		const played = new Set(career.spells.map((spell) => spell.clubId));
		const strangers = allClubs.filter((clubId) => !played.has(clubId));
		if (strangers.length >= WRONG_OPTIONS) {
			const hiddenSpells = career.spells.flatMap((spell, index) =>
				spell.clubId === hiddenClub ? [index] : []
			);
			found.push({ playerId: career.playerId, hiddenClub, hiddenSpells, strangers });
		}
	}
	return found;
}

/** Picks players with a known career and deals the clubs to choose from for each. */
export function startGuessRound(
	careers: readonly Career[],
	random: Random
):
	| { readonly ok: true; readonly value: GuessRound }
	| { readonly ok: false; readonly reason: 'no-players' } {
	const candidates = candidatesFor(withoutDuplicateIds(careers));
	if (candidates.length === 0) {
		return { ok: false, reason: 'no-players' };
	}
	const picked = random.sample(candidates, Math.min(GUESS_QUESTIONS, candidates.length));
	const questions = picked.map((item): GuessQuestion => ({
		playerId: item.playerId,
		hiddenClub: item.hiddenClub,
		hiddenSpells: item.hiddenSpells,
		options: random.sample(
			[item.hiddenClub, ...random.sample(item.strangers, WRONG_OPTIONS)],
			GUESS_OPTIONS
		)
	}));
	return { ok: true, value: { questions } };
}
