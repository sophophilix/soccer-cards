import { expect, test } from 'vitest';
import { render } from 'vitest-browser-svelte';
import CardFront from './CardFront.svelte';
import type { CardFrontProps } from './card-front.ts';

// An invented player (AGENTS.md rule 6).
function aCard(overrides: Partial<CardFrontProps> = {}): CardFrontProps {
	return {
		displayName: 'Tomas Example',
		position: 'FORWARD',
		nationalTeamCode: 'ESP',
		clubName: 'Riverside Rovers',
		shirtNumber: 9,
		tier: 'BASE',
		overall: 84,
		attack: 88,
		defence: 41,
		control: 79,
		...overrides
	};
}

test('the card has one name with the player, position, tier, overall and play stats', async () => {
	const screen = await render(CardFront, aCard({ tier: 'LEGEND' }));

	await expect
		.element(screen.getByRole('img'))
		.toHaveAccessibleName(
			'Tomas Example, Forward, Legend card. Overall 84. Attack 88, defence 41, control 79.'
		);
});

test.each([
	['BASE', 'Base'],
	['RARE', 'Rare'],
	['LEGEND', 'Legend'],
	['ICON', 'Icon']
] as const)('a %s card writes its tier in words', async (tier, words) => {
	const screen = await render(CardFront, aCard({ tier }));

	await expect.element(screen.getByText(words, { exact: true })).toBeVisible();
});

test('a card with no photo shows the kit avatar with the shirt number', async () => {
	const screen = await render(CardFront, aCard({ shirtNumber: 10 }));

	expect(screen.container.querySelector('img')).toBeNull();
	expect(screen.container.querySelector('svg.avatar')?.textContent.trim()).toBe('10');
});

test('a photo has its size, loads lazily and has an empty alt', async () => {
	const photo = { src: '/photos/test-player.webp', widthPx: 400, heightPx: 500 };

	const screen = await render(CardFront, aCard({ photo }));

	const image = screen.container.querySelector('img');
	expect(screen.container.querySelector('svg.avatar')).toBeNull();
	expect(image?.getAttribute('src')).toBe(photo.src);
	expect(image?.getAttribute('width')).toBe('400');
	expect(image?.getAttribute('height')).toBe('500');
	expect(image?.getAttribute('loading')).toBe('lazy');
	expect(image?.getAttribute('alt')).toBe('');
});

test('markup in a name, club or title shows as text', async () => {
	const screen = await render(
		CardFront,
		aCard({ displayName: '<b>Bold</b>', clubName: '<i>Club</i>', cardTitle: '<u>Title</u>' })
	);

	await expect.element(screen.getByText('<b>Bold</b>')).toBeVisible();
	await expect.element(screen.getByText('<i>Club</i>')).toBeVisible();
	await expect.element(screen.getByText('<u>Title</u>')).toBeVisible();
	expect(screen.container.querySelector('b b, i, u')).toBeNull();
});

test('a one-word name with an accent shows as written', async () => {
	const screen = await render(CardFront, aCard({ displayName: 'Pelé' }));

	await expect.element(screen.getByText('Pelé', { exact: true })).toBeVisible();
});

test.each([96, 180, 360])(
	'at %i pixels wide the card is 5 by 7, sized from its width, with a long name inside it',
	async (widthPx) => {
		const name = 'Maximiliano Bartholomew Featherstonehaugh';
		const club = 'Athletic Club of Green Meadows';
		const screen = await render(CardFront, aCard({ displayName: name, clubName: club }));
		screen.container.style.width = `${String(widthPx)}px`;

		const card = screen.getByRole('img').element().getBoundingClientRect();
		const tierFontPx = getComputedStyle(screen.getByText('Base').element()).fontSize;
		expect(card.width).toBe(widthPx);
		expect(card.height).toBeCloseTo((widthPx * 7) / 5, 0);
		// The tier label is 4% of the card's width at every size.
		expect(Number.parseFloat(tierFontPx)).toBeCloseTo(widthPx * 0.04, 1);
		const nameBox = screen.getByText(name).element().getBoundingClientRect();
		const clubBox = screen.getByText(club).element().getBoundingClientRect();
		expect(nameBox.right).toBeLessThanOrEqual(card.right);
		expect(clubBox.right).toBeLessThanOrEqual(card.right);
	}
);

test('the card runs no animation, so reduced motion has nothing to stop', async () => {
	const screen = await render(CardFront, aCard({ tier: 'ICON' }));

	expect(screen.getByRole('img').element().getAnimations({ subtree: true })).toHaveLength(0);
});
