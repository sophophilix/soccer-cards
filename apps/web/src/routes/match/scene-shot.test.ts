import { toCardId } from '@soccer-cards/game';
import type { Moment } from '@soccer-cards/game';
import { describe, expect, test } from 'vitest';
import type { CardFrontProps } from '../../lib/cards/card-front.ts';
import { shotOfKick, shotOfMoment } from './scene-shot.ts';

const FRONT: CardFrontProps = {
	displayName: 'Ann Example',
	position: 'FORWARD',
	tier: 'BASE',
	overall: 80,
	attack: 80,
	defence: 40,
	control: 60
};

function aMoment(changes: Partial<Moment>): Moment {
	return {
		minute: 18,
		side: 'home',
		ballWinner: toCardId('ann-example'),
		shooter: toCardId('ann-example'),
		keeper: toCardId('kim-keeper'),
		outcome: 'goal',
		...changes
	};
}

describe('shotOfMoment', () => {
	test('a goal beats the dive, puts the AI in goal and brings the scorer', () => {
		const shot = shotOfMoment(aMoment({ outcome: 'goal' }), FRONT);

		expect(shot.end).toBe('goal');
		expect(shot.dive).not.toBe(shot.aim);
		expect(shot.keeper).toBe('ai');
		expect(shot.scorer).toEqual({ cardId: 'ann-example', front: FRONT });
	});

	test('a save meets the shot, with the player in goal for an AI attack', () => {
		const shot = shotOfMoment(aMoment({ outcome: 'save', side: 'away' }), FRONT);

		expect(shot).toMatchObject({ end: 'save', keeper: 'player' });
		expect(shot.dive).toBe(shot.aim);
		expect(shot.scorer).toBeUndefined();
	});

	test('a wide shot goes past a post while the keeper stays in the middle', () => {
		const shot = shotOfMoment(aMoment({ outcome: 'wide', minute: 7 }), FRONT);

		expect(shot).toMatchObject({ end: 'wide', dive: 'middle' });
		expect(['left', 'right']).toContain(shot.aim);
	});

	test('the same moment always looks the same', () => {
		expect(shotOfMoment(aMoment({}), FRONT)).toEqual(shotOfMoment(aMoment({}), FRONT));
	});
});

test('a penalty kick uses the corners the kicker and the keeper chose', () => {
	const shot = shotOfKick({ kicker: 'player', shot: 'left', dive: 'right', outcome: 'miss' }, 2);

	expect(shot).toEqual({ key: 'kick-2', aim: 'left', dive: 'right', end: 'wide', keeper: 'ai' });
});
