import { expect, test } from 'vitest';
import { render } from 'vitest-browser-svelte';
import CardFront from './CardFront.svelte';
import type { CardFrontProps } from './card-front.ts';

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

		const card = screen.getByRole('img').element();
		const box = card.getBoundingClientRect();
		const text = (words: string): Element => screen.getByText(words).element();
		const px = (element: Element, property: 'fontSize' | 'borderTopLeftRadius'): number =>
			Number.parseFloat(getComputedStyle(element)[property]);
		expect(box.width).toBe(widthPx);
		expect(box.height).toBeCloseTo((widthPx * 7) / 5, 0);
		expect(px(text('Base'), 'fontSize')).toBeCloseTo(widthPx * 0.04, 1);
		expect(px(text('ESP'), 'fontSize')).toBeCloseTo(widthPx * 0.042, 1);
		expect(px(text(club), 'fontSize')).toBeCloseTo(widthPx * 0.042, 1);
		expect(px(card, 'borderTopLeftRadius')).toBeCloseTo(widthPx * 0.05, 1);
		expect(text(name).getBoundingClientRect().right).toBeLessThanOrEqual(box.right);
		expect(text(club).getBoundingClientRect().right).toBeLessThanOrEqual(box.right);
	}
);

test('in a flex row the card fills its slot and keeps its 5 by 7 size', async () => {
	const screen = await render(CardFront, aCard());
	screen.container.style.display = 'flex';
	screen.container.style.width = '180px';

	const box = screen.getByRole('img').element().getBoundingClientRect();
	expect(box.width).toBe(180);
	expect(box.height).toBeCloseTo(252, 0);
});

test('the avatar and the star burst take their colours from the card ink and booking tokens', async () => {
	const screen = await render(CardFront, aCard());
	screen.container.style.setProperty('--card-ink', 'rgb(1, 2, 3)');
	screen.container.style.setProperty('--booking', 'rgb(4, 5, 6)');

	const fill = (selector: string): string =>
		getComputedStyle(screen.container.querySelector(selector) ?? screen.container).fill;
	expect(fill('.avatar circle')).toBe('rgb(1, 2, 3)');
	expect(fill('.burst')).toBe('rgb(4, 5, 6)');
});

test.each(['RARE', 'LEGEND', 'ICON'] as const)(
	'a %s card has its own class, frame, second star burst and foil',
	async (tier) => {
		const base = await render(CardFront, aCard());
		const lucky = await render(CardFront, aCard({ tier }));
		const frame = (element: HTMLElement): string =>
			getComputedStyle(element.querySelector('.frame') ?? element).backgroundImage;

		expect(lucky.container.querySelector('.card')?.classList).toContain(tier.toLowerCase());
		expect(frame(lucky.container)).not.toBe(frame(base.container));
		expect(lucky.container.querySelectorAll('.burst')).toHaveLength(2);
		expect(lucky.container.querySelector('.foil')).not.toBeNull();
	}
);

test('a base card keeps its class, one star burst and no foil', async () => {
	const screen = await render(CardFront, aCard());

	const classes = [...(screen.container.querySelector('.card')?.classList ?? [])];
	expect(classes.filter((name) => !name.startsWith('svelte-'))).toEqual(['card', 'base']);
	expect(screen.container.querySelectorAll('.burst')).toHaveLength(1);
	expect(screen.container.querySelector('.foil')).toBeNull();
});

// Nothing on the card moves, so it is still with or without reduced motion.
test.each(['RARE', 'LEGEND', 'ICON'] as const)(
	'the foil on a %s card stays still',
	async (tier) => {
		const screen = await render(CardFront, aCard({ tier }));

		const foil = getComputedStyle(screen.container.querySelector('.foil') ?? screen.container);
		expect(foil.animationName).toBe('none');
		expect(foil.transitionDuration).toBe('0s');
	}
);

/** The WCAG contrast ratio of two `rgb()` colours. */
function contrast(first: string, second: string): number {
	const luminance = (colour: string): number => {
		const [red = 0, green = 0, blue = 0] = (colour.match(/[\d.]+/g) ?? []).map((part) => {
			const channel = Number(part) / 255;
			return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
		});
		return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
	};
	const [light = 0, dark = 0] = [luminance(first), luminance(second)].sort((a, b) => b - a);
	return (light + 0.05) / (dark + 0.05);
}

test.each([
	['BASE', 'Base'],
	['RARE', 'Rare'],
	['LEGEND', 'Legend'],
	['ICON', 'Icon']
] as const)(
	'the %s tier word meets AA contrast on every colour of its ground',
	async (tier, words) => {
		const screen = await render(CardFront, aCard({ tier }));
		screen.container.style.setProperty('--card-ink', '#0e1512');
		screen.container.style.setProperty('--card-paper', '#ffffff');

		const style = getComputedStyle(screen.getByText(words, { exact: true }).element());
		const colours = `${style.backgroundColor} ${style.backgroundImage}`.match(/rgba?\([^)]*\)/g);
		// A fully clear colour isn't part of the ground the word sits on.
		const ground = (colours ?? []).filter((colour) => colour !== 'rgba(0, 0, 0, 0)');
		const ratios = ground.map((colour) => contrast(style.color, colour));
		expect(ratios.length).toBeGreaterThan(0);
		expect(Math.min(...ratios)).toBeGreaterThanOrEqual(4.5);
	}
);
