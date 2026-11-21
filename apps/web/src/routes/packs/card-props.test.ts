import { toCardId } from '@soccer-cards/game';
import type { Card } from '@soccer-cards/game';
import { expect, test } from 'vitest';
import type { CardFace } from '../../lib/data/card-face-from-summary.ts';
import { cardPropsOf } from './card-props.ts';

function aCard(overrides: Partial<Card> = {}): Card {
	return {
		id: toCardId('tavi-brightwell'),
		tier: 'rare',
		position: 'FW',
		overall: 84,
		attack: 86,
		defence: 45,
		control: 79,
		...overrides
	};
}

const PHOTO = {
	src: '/api/v1/photos/tavi-brightwell.webp',
	widthPx: 600,
	heightPx: 800,
	credit: { author: 'Ina Vented', licenseCode: 'CC-BY-SA-4.0' }
};
const RATINGS = {
	kind: 'outfield',
	pace: 88,
	shooting: 84,
	passing: 71,
	dribbling: 86,
	defending: 38,
	physical: 67
} as const;

function aFace(): CardFace {
	return {
		displayName: 'Tavi Brightwell',
		nationalTeamCode: 'ENG',
		clubName: 'Harbour Rovers',
		cardTitle: 'Speedster',
		cardNumber: 9,
		photo: PHOTO,
		ratings: RATINGS
	};
}

test('puts the card number on the front as the shirt number', () => {
	const { front } = cardPropsOf(aCard(), aFace());

	expect(front).toMatchObject({
		shirtNumber: 9,
		cardTitle: 'Speedster',
		clubName: 'Harbour Rovers',
		photo: { src: PHOTO.src }
	});
});

test.each([
	['base', 'BASE'],
	['rare', 'RARE'],
	['legend', 'LEGEND'],
	['icon', 'ICON']
] as const)('names the %s tier %s on the card front', (tier, expected) => {
	const { front } = cardPropsOf(aCard({ tier }), aFace());

	expect(front.tier).toBe(expected);
});

test.each([
	['GK', 'GOALKEEPER'],
	['DF', 'DEFENDER'],
	['MF', 'MIDFIELDER'],
	['FW', 'FORWARD']
] as const)('names the %s position %s on the card front', (position, expected) => {
	const { front } = cardPropsOf(aCard({ position }), aFace());

	expect(front.position).toBe(expected);
});

test('gives the back the ratings and the photo credit', () => {
	const { back } = cardPropsOf(aCard(), aFace());

	expect(back).toMatchObject({
		ratings: { kind: 'outfield', pace: 88 },
		photoCredit: { author: 'Ina Vented', licenseCode: 'CC-BY-SA-4.0' }
	});
});

test('gives no back and no photo when the data has neither', () => {
	const { displayName } = aFace();

	const { front, back } = cardPropsOf(aCard(), { displayName });

	expect(back).toBeUndefined();
	expect(front.photo).toBeUndefined();
});
