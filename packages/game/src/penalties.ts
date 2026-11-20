import type { Random } from './random.ts';

/** The corners a kick can go to and a keeper can dive to. */
export const CORNERS = ['left', 'middle', 'right'] as const;

/** A corner of the goal. */
export type Corner = (typeof CORNERS)[number];

/** Who takes a kick: the player's side or the other side. */
export type Kicker = 'player' | 'opponent';

// The kicks each side takes before the shoot-out goes to one pair at a time.
const KICKS_EACH = 5;
// When both pick the same corner, a keeper of the base strength saves at the base
// chance, and each point of strength above it adds to that, within the limits.
const BASE_SAVE_CHANCE = 0.6;
const BASE_KEEPER_STRENGTH = 80;
const SAVE_CHANCE_PER_POINT = 0.01;
const MIN_SAVE_CHANCE = 0.3;
const MAX_SAVE_CHANCE = 0.9;
// How often a kick that isn't saved misses the goal.
const MISS_CHANCE = 0.05;

/** One kick: who took it, where it went, where the keeper dived and how it ended. */
export interface Kick {
	readonly kicker: Kicker;
	readonly shot: Corner;
	readonly dive: Corner;
	readonly outcome: 'goal' | 'save' | 'miss';
}

/** A penalty shoot-out after a drawn match, moved on by one kick at a time. */
export interface ShootOut {
	/** The goalkeeper strength of each side, from the match. */
	readonly goalkeepers: Readonly<Record<Kicker, number>>;
	readonly kicks: readonly Kick[];
	readonly score: Readonly<Record<Kicker, number>>;
	readonly status:
		| { readonly kind: 'kicking'; readonly next: Kicker }
		| { readonly kind: 'over'; readonly winner: Kicker };
}

/** The shoot-out after the kick, or the reason the kick was refused. */
export type KickResult =
	| { readonly ok: true; readonly value: ShootOut }
	| { readonly ok: false; readonly reason: 'shoot-out-over' | 'not-a-corner' };

/** Starts a shoot-out with no kicks taken. The player kicks first. */
export function startShootOut(goalkeepers: Readonly<Record<Kicker, number>>): ShootOut {
	return {
		goalkeepers,
		kicks: [],
		score: { player: 0, opponent: 0 },
		status: { kind: 'kicking', next: 'player' }
	};
}

/** The probability that a keeper of this strength saves a kick to the corner it dived to. */
export function saveChance(keeperStrength: number): number {
	const chance = BASE_SAVE_CHANCE + (keeperStrength - BASE_KEEPER_STRENGTH) * SAVE_CHANCE_PER_POINT;
	return Math.min(MAX_SAVE_CHANCE, Math.max(MIN_SAVE_CHANCE, chance));
}

function isCorner(value: string): value is Corner {
	return CORNERS.some((corner) => corner === value);
}

function winnerOf(kicks: readonly Kick[], score: ShootOut['score']): Kicker | undefined {
	const taken = (kicker: Kicker): number => kicks.filter((kick) => kick.kicker === kicker).length;
	// Each side has its five kicks, and after those the kick that finishes the current pair.
	const rounds = Math.max(KICKS_EACH, taken('player'), taken('opponent'));
	const canCatch = (behind: Kicker, ahead: Kicker): boolean =>
		score[behind] + rounds - taken(behind) >= score[ahead];
	if (!canCatch('opponent', 'player')) {
		return 'player';
	}
	return canCatch('player', 'opponent') ? undefined : 'opponent';
}

/**
 * Takes the next kick. The player's corner is the shot on the player's kick and the
 * dive on the other side's kick. The other side's corner comes from `random`.
 */
export function takeKick(shootOut: ShootOut, corner: string, random: Random): KickResult {
	if (shootOut.status.kind === 'over') {
		return { ok: false, reason: 'shoot-out-over' };
	}
	if (!isCorner(corner)) {
		return { ok: false, reason: 'not-a-corner' };
	}
	const kicker = shootOut.status.next;
	const keeper: Kicker = kicker === 'player' ? 'opponent' : 'player';
	const other = CORNERS[random.nextInt(0, CORNERS.length - 1)] ?? 'middle';
	const [shot, dive] = kicker === 'player' ? [corner, other] : [other, corner];
	const isSaved = shot === dive && random.chance(saveChance(shootOut.goalkeepers[keeper]));
	const isMissed = !isSaved && random.chance(MISS_CHANCE);
	const outcome = isSaved ? 'save' : isMissed ? 'miss' : 'goal';
	const kicks = [...shootOut.kicks, { kicker, shot, dive, outcome } satisfies Kick];
	const score = {
		...shootOut.score,
		[kicker]: shootOut.score[kicker] + (isSaved || isMissed ? 0 : 1)
	};
	const winner = winnerOf(kicks, score);
	return {
		ok: true,
		value: {
			goalkeepers: shootOut.goalkeepers,
			kicks,
			score,
			status: winner === undefined ? { kind: 'kicking', next: keeper } : { kind: 'over', winner }
		}
	};
}
