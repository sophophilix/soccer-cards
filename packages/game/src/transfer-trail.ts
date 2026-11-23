import type { Random } from './random.ts';

/** The players in one Transfer Trail round. */
export const TRAIL_ROUND_PLAYERS = 5;
/** The fewest spells a player needs to make a trail. */
export const MIN_TRAIL_SPELLS = 3;
// Deals tried before a swap makes the order wrong; the same limit as the prototype.
const MAX_DEAL_TRIES = 10;

/** The id of a player in a career. */
export type PlayerId = string;
/** The id of a club. */
export type ClubId = string;

/** One stay at a club. A spell with no end year is the current club. */
export interface Spell {
	readonly clubId: ClubId;
	readonly startYear: number;
	readonly endYear?: number;
}

/** A player's published spells, in the order the career gives them. */
export interface Career {
	readonly playerId: PlayerId;
	readonly spells: readonly Spell[];
}

/** One player's trail in a round: the right spells and the clubs as they were dealt. */
export interface TrailStep {
	readonly playerId: PlayerId;
	readonly spells: readonly Spell[];
	readonly dealt: readonly ClubId[];
}

/** A round in progress. */
export interface TrailRound {
	readonly steps: readonly TrailStep[];
}

/** Returns the spells in the order the player joined the clubs. Equal start years keep their order. */
export function trailOrder(career: Career): Spell[] {
	return career.spells
		.map((spell, index) => ({ spell, index }))
		.sort((a, b) => a.spell.startYear - b.spell.startYear || a.index - b.index)
		.map(({ spell }) => spell);
}

function dealClubs(career: Career, random: Random): ClubId[] {
	const right = trailOrder(career).map((spell) => spell.clubId);
	const isRightOrder = (order: readonly ClubId[]): boolean =>
		order.every((clubId, place) => clubId === right[place]);
	const places = right.map((_, place) => place);
	const deal = (): ClubId[] =>
		random.sample(places, places.length).flatMap((place) => right[place] ?? []);
	let dealt = deal();
	for (let tries = 1; tries < MAX_DEAL_TRIES && isRightOrder(dealt); tries++) {
		dealt = deal();
	}
	if (isRightOrder(dealt)) {
		// Swap two different clubs. With one club only, every order is right.
		const other = dealt.findIndex((clubId) => clubId !== dealt[0]);
		const first = dealt[0];
		const second = dealt[other];
		if (other > 0 && first !== undefined && second !== undefined) {
			dealt[0] = second;
			dealt[other] = first;
		}
	}
	return dealt;
}

function eligibleCareers(careers: readonly Career[]): Career[] {
	const counts = new Map<PlayerId, number>();
	for (const career of careers) {
		counts.set(career.playerId, (counts.get(career.playerId) ?? 0) + 1);
	}
	return careers.filter(
		(career) => counts.get(career.playerId) === 1 && career.spells.length >= MIN_TRAIL_SPELLS
	);
}

/** Picks the players for a round and deals each one's clubs out of order. */
export function startTrailRound(
	careers: readonly Career[],
	random: Random
):
	| { readonly ok: true; readonly value: TrailRound }
	| { readonly ok: false; readonly reason: 'no-eligible-players' } {
	const eligible = eligibleCareers(careers);
	if (eligible.length === 0) {
		return { ok: false, reason: 'no-eligible-players' };
	}
	const picked = random.sample(eligible, Math.min(TRAIL_ROUND_PLAYERS, eligible.length));
	const steps = picked.map((career) => ({
		playerId: career.playerId,
		spells: trailOrder(career),
		dealt: dealClubs(career, random)
	}));
	return { ok: true, value: { steps } };
}

/** The result of checking a trail: whether it is all right, and whether each place is. */
export interface TrailCheck {
	readonly isRight: boolean;
	readonly places: readonly boolean[];
}

/** Why an answer is not checked: it is not a trail of this career. */
export type TrailRefusal = 'wrong-length' | 'unknown-club' | 'club-used-too-often';

const countClubs = (clubs: readonly ClubId[]): Map<ClubId, number> => {
	const counts = new Map<ClubId, number>();
	for (const clubId of clubs) {
		counts.set(clubId, (counts.get(clubId) ?? 0) + 1);
	}
	return counts;
};

/** Checks the clubs a child put in order against the career, place by place. */
export function checkTrail(
	career: Career,
	answer: readonly ClubId[]
):
	| { readonly ok: true; readonly value: TrailCheck }
	| { readonly ok: false; readonly reason: TrailRefusal } {
	const right = trailOrder(career).map((spell) => spell.clubId);
	if (answer.length !== right.length) {
		return { ok: false, reason: 'wrong-length' };
	}
	const available = countClubs(right);
	if (answer.some((clubId) => !available.has(clubId))) {
		return { ok: false, reason: 'unknown-club' };
	}
	for (const [clubId, used] of countClubs(answer)) {
		if (used > (available.get(clubId) ?? 0)) {
			return { ok: false, reason: 'club-used-too-often' };
		}
	}
	const places = right.map((clubId, place) => answer[place] === clubId);
	return { ok: true, value: { isRight: places.every(Boolean), places } };
}
