import { TRAIL_FINISH_COINS, TRAIL_RIGHT_COINS } from './economy.ts';
import type { Random } from './random.ts';
import type { PlayerState } from './state.ts';

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

/** A round in progress. It remembers what was paid, so repeating an action pays nothing. */
export interface TrailRound {
	readonly steps: readonly TrailStep[];
	/** The players whose trail has had its first check. */
	readonly checked: readonly PlayerId[];
	readonly isFinished: boolean;
}

/** What a check says: the whole trail, and each place. */
export interface TrailCheck {
	readonly isRight: boolean;
	readonly places: readonly boolean[];
}

/** Why an answer was refused. It is not a wrong trail. */
export type TrailRefusal = 'wrong-length' | 'unknown-club';
/** Why a round action was refused. */
export type TrailRoundRefusal = TrailRefusal | 'unknown-player' | 'trails-unchecked';

/** A value, or the reason it was refused. */
export type TrailResult<Value, Reason extends string> =
	{ readonly ok: true; readonly value: Value } | { readonly ok: false; readonly reason: Reason };

/** Returns the spells in the order the player joined the clubs. Equal start years keep their order. */
export function trailOrder(spells: readonly Spell[]): Spell[] {
	return spells
		.map((spell, index) => ({ spell, index }))
		.sort((a, b) => a.spell.startYear - b.spell.startYear || a.index - b.index)
		.map(({ spell }) => spell);
}

const rightClubs = (spells: readonly Spell[]): ClubId[] =>
	trailOrder(spells).map((spell) => spell.clubId);

/** Says whether the clubs are in the right order, and which places are right. */
export function checkTrail(
	spells: readonly Spell[],
	answer: readonly ClubId[]
): TrailResult<TrailCheck, TrailRefusal> {
	const right = rightClubs(spells);
	if (answer.length !== right.length) {
		return { ok: false, reason: 'wrong-length' };
	}
	if (answer.some((clubId) => !right.includes(clubId))) {
		return { ok: false, reason: 'unknown-club' };
	}
	const places = right.map((clubId, place) => answer[place] === clubId);
	return { ok: true, value: { isRight: places.every(Boolean), places } };
}

function dealClubs(spells: readonly Spell[], random: Random): ClubId[] {
	const right = rightClubs(spells);
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
): TrailResult<TrailRound, 'no-eligible-players'> {
	const eligible = eligibleCareers(careers);
	if (eligible.length === 0) {
		return { ok: false, reason: 'no-eligible-players' };
	}
	const picked = random.sample(eligible, Math.min(TRAIL_ROUND_PLAYERS, eligible.length));
	const steps = picked.map((career) => ({
		playerId: career.playerId,
		spells: trailOrder(career.spells),
		dealt: dealClubs(career.spells, random)
	}));
	return { ok: true, value: { steps, checked: [], isFinished: false } };
}

/** Checks a player's trail in the round. Only the first check pays, and a wrong trail costs nothing. */
export function checkTrailInRound(
	round: TrailRound,
	state: PlayerState,
	playerId: PlayerId,
	answer: readonly ClubId[]
): TrailResult<
	{ readonly check: TrailCheck; readonly round: TrailRound; readonly state: PlayerState },
	'unknown-player' | TrailRefusal
> {
	const step = round.steps.find((candidate) => candidate.playerId === playerId);
	if (step === undefined) {
		return { ok: false, reason: 'unknown-player' };
	}
	const checked = checkTrail(step.spells, answer);
	if (!checked.ok) {
		return checked;
	}
	if (round.checked.includes(playerId)) {
		return { ok: true, value: { check: checked.value, round, state } };
	}
	return {
		ok: true,
		value: {
			check: checked.value,
			round: { ...round, checked: [...round.checked, playerId] },
			state: checked.value.isRight ? { ...state, coins: state.coins + TRAIL_RIGHT_COINS } : state
		}
	};
}

/** Finishes the round once every trail is checked, and pays for finishing once. */
export function finishTrailRound(
	round: TrailRound,
	state: PlayerState
): TrailResult<{ readonly round: TrailRound; readonly state: PlayerState }, 'trails-unchecked'> {
	if (round.isFinished) {
		return { ok: true, value: { round, state } };
	}
	if (round.checked.length < round.steps.length) {
		return { ok: false, reason: 'trails-unchecked' };
	}
	return {
		ok: true,
		value: {
			round: { ...round, isFinished: true },
			state: { ...state, coins: state.coins + TRAIL_FINISH_COINS }
		}
	};
}
