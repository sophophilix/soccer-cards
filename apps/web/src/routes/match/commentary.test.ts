import { toCardId } from '@soccer-cards/game';
import type { CardId, Kick, Moment } from '@soccer-cards/game';
import { describe, expect, it } from 'vitest';
import { edgeBanner, kickLine, momentLine } from './commentary.ts';

const nameOf = (id: CardId): string => id.toUpperCase();
const aMoment = (changes: Partial<Moment>): Moment => ({
	minute: 7,
	side: 'home',
	ballWinner: toCardId('mid'),
	shooter: toCardId('fwd'),
	keeper: toCardId('gk'),
	outcome: 'goal',
	...changes
});

describe('momentLine', () => {
	it('tells of a goal for the player', () => {
		expect(momentLine(aMoment({}), nameOf)).toEqual({
			text: "7' MID wins the ball for you. FWD shoots… GOAL for you!",
			isGoal: true
		});
	});

	it('tells of a goal for the AI', () => {
		const line = momentLine(aMoment({ side: 'away' }), nameOf);

		expect(line.text).toBe("7' MID wins the ball for the AI. FWD shoots… GOAL for the AI!");
		expect(line.isGoal).toBe(true);
	});

	it('names the keeper who made a save', () => {
		const line = momentLine(aMoment({ outcome: 'save' }), nameOf);

		expect(line).toEqual({
			text: "7' MID wins the ball for you. FWD shoots… saved by GK.",
			isGoal: false
		});
	});

	it('says a shot went just wide', () => {
		const line = momentLine(aMoment({ outcome: 'wide', side: 'away' }), nameOf);

		expect(line.text).toBe("7' MID wins the ball for the AI. FWD shoots… just wide.");
		expect(line.isGoal).toBe(false);
	});
});

describe('kickLine', () => {
	const aKick = (changes: Partial<Kick>): Kick => ({
		kicker: 'player',
		shot: 'left',
		dive: 'right',
		outcome: 'goal',
		...changes
	});

	it('tells of the player scoring', () => {
		expect(kickLine(aKick({}))).toEqual({
			text: 'You shoot left, the keeper goes right: GOAL!',
			isGoal: true
		});
	});

	it('tells of a save', () => {
		const line = kickLine(aKick({ shot: 'middle', dive: 'middle', outcome: 'save' }));

		expect(line).toEqual({
			text: 'You shoot the middle, the keeper goes the middle: SAVED!',
			isGoal: false
		});
	});

	it('tells of a kick over the bar', () => {
		expect(kickLine(aKick({ outcome: 'miss' })).text).toBe(
			'You shoot left, the keeper goes right: over the bar!'
		);
	});

	it('tells of the other side kicking at the player keeper', () => {
		const line = kickLine(aKick({ kicker: 'opponent', shot: 'right', dive: 'middle' }));

		expect(line.text).toBe('They shoot right, your keeper goes the middle: GOAL!');
	});
});

describe('edgeBanner', () => {
	it('praises the player who read the AI', () => {
		expect(edgeBanner('home', 'attack', 'defend')).toBe(
			'Good read! All-out attack beats Park the bus. Your whole team plays better.'
		);
	});

	it('says the AI out-thought the player', () => {
		expect(edgeBanner('away', 'attack', 'counter')).toBe(
			'The AI out-thought you. Counter-attack beats All-out attack. Its whole team plays better.'
		);
	});

	it('says nothing when neither side has the edge', () => {
		expect(edgeBanner('none', 'attack', 'attack')).toBeUndefined();
	});
});
