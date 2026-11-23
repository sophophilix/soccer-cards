import type { Random } from './random.ts';
import type { Career, ClubId, PlayerId } from './transfer-trail.ts';

/** The most questions in one Connections round. */
export const CONNECTIONS_QUESTIONS = 5;
/** The clubs a child chooses from in one question. */
export const CONNECTIONS_OPTIONS = 4;
const WRONG_OPTIONS = CONNECTIONS_OPTIONS - 1;

/** One question: two players, a club both played for, and the clubs to choose from. */
export interface ConnectionsQuestion {
	readonly playerIds: readonly [PlayerId, PlayerId];
	readonly answer: ClubId;
	readonly options: readonly ClubId[];
}

/** A round in progress. */
export interface ConnectionsRound {
	readonly questions: readonly ConnectionsQuestion[];
}

interface Candidate {
	readonly first: Career;
	readonly second: Career;
	readonly shared: readonly ClubId[];
	readonly near: readonly ClubId[];
	readonly far: readonly ClubId[];
}

const unique = (clubs: readonly ClubId[]): ClubId[] => Array.from(new Set(clubs));
const clubsOf = (career: Career): ClubId[] => unique(career.spells.map((spell) => spell.clubId));

function withoutDuplicateIds(careers: readonly Career[]): Career[] {
	const counts = new Map<PlayerId, number>();
	for (const career of careers) {
		counts.set(career.playerId, (counts.get(career.playerId) ?? 0) + 1);
	}
	return careers.filter((career) => counts.get(career.playerId) === 1);
}

function candidatesFor(careers: readonly Career[]): Candidate[] {
	const allClubs = unique(careers.flatMap(clubsOf));
	const found: Candidate[] = [];
	careers.forEach((first, index) => {
		for (const second of careers.slice(index + 1)) {
			const secondClubs = clubsOf(second);
			const shared = clubsOf(first).filter((clubId) => secondClubs.includes(clubId));
			if (shared.length === 0) {
				continue;
			}
			const notShared = (clubId: ClubId): boolean => !shared.includes(clubId);
			const near = unique([...clubsOf(first), ...secondClubs]).filter(notShared);
			const far = allClubs.filter((clubId) => notShared(clubId) && !near.includes(clubId));
			if (near.length + far.length >= WRONG_OPTIONS) {
				found.push({ first, second, shared, near, far });
			}
		}
	});
	return found;
}

function dealQuestion(candidate: Candidate, random: Random): ConnectionsQuestion {
	const answer = random.sample(candidate.shared, 1)[0] ?? '';
	const nearWrong = random.sample(candidate.near, Math.min(WRONG_OPTIONS, candidate.near.length));
	const farWrong = random.sample(candidate.far, WRONG_OPTIONS - nearWrong.length);
	return {
		playerIds: [candidate.first.playerId, candidate.second.playerId],
		answer,
		options: random.sample([answer, ...nearWrong, ...farWrong], CONNECTIONS_OPTIONS)
	};
}

/** Picks pairs of players who share a club and deals four clubs for each pair. */
export function startConnectionsRound(
	careers: readonly Career[],
	random: Random
):
	| { readonly ok: true; readonly value: ConnectionsRound }
	| { readonly ok: false; readonly reason: 'no-pairs' } {
	const candidates = candidatesFor(withoutDuplicateIds(careers));
	if (candidates.length === 0) {
		return { ok: false, reason: 'no-pairs' };
	}
	const picked = random.sample(candidates, Math.min(CONNECTIONS_QUESTIONS, candidates.length));
	return { ok: true, value: { questions: picked.map((item) => dealQuestion(item, random)) } };
}
