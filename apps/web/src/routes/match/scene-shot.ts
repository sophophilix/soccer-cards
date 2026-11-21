import type { Kick, Moment } from '@soccer-cards/game';
import type { CardFrontProps } from '../../lib/cards/card-front.ts';
import type { ShotAim, ShotEnd } from '../../lib/ui/motion.ts';

/** One shot for the goal scene to play. A new `key` plays it. */
export interface SceneShot {
	readonly key: string;
	readonly aim: ShotAim;
	readonly dive: ShotAim;
	readonly end: ShotEnd;
	/** Whose keeper is in goal: the player's or the AI's. */
	readonly keeper: 'player' | 'ai';
	/** The scorer, for a goal in open play. A penalty goal has none. */
	readonly scorer?: { readonly cardId: string; readonly front: CardFrontProps } | undefined;
}

const AIMS = ['left', 'right', 'middle'] as const satisfies readonly ShotAim[];

/**
 * A match moment as a shot. The game doesn't say where a shot went, so the minute picks the
 * corner: the same match always looks the same. A goal beats the keeper's dive, a save meets it,
 * and a wide shot goes past a post while the keeper stays up.
 */
export function shotOfMoment(moment: Moment, scorerFront: CardFrontProps | undefined): SceneShot {
	const aim = AIMS[moment.minute % AIMS.length] ?? 'left';
	const key = `moment-${String(moment.minute)}`;
	const keeper = moment.side === 'home' ? 'ai' : 'player';
	if (moment.outcome === 'goal') {
		const dive = AIMS[(moment.minute + 1) % AIMS.length] ?? 'right';
		const scorer = scorerFront && { cardId: moment.shooter, front: scorerFront };
		return { key, aim, dive, end: 'goal', keeper, scorer };
	}
	if (moment.outcome === 'save') return { key, aim, dive: aim, end: 'save', keeper };
	return {
		key,
		aim: moment.minute % 2 === 0 ? 'left' : 'right',
		dive: 'middle',
		end: 'wide',
		keeper
	};
}

/** A penalty kick as a shot, with the corners the kicker and the keeper really chose. */
export function shotOfKick(kick: Kick, index: number): SceneShot {
	return {
		key: `kick-${String(index)}`,
		aim: kick.shot,
		dive: kick.dive,
		end: kick.outcome === 'miss' ? 'wide' : kick.outcome,
		keeper: kick.kicker === 'player' ? 'ai' : 'player'
	};
}
