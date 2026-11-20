import { afterEach, expect, test } from 'vitest';
import { cdp, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import FlipCard from './FlipCard.svelte';
import type { CardBackProps } from './card-back.ts';
import type { CardFrontProps } from './card-front.ts';

const FRONT_NAME = 'Tomas Example card, showing the front. Press to see the back.';
const BACK_NAME = 'Tomas Example card, showing the back. Press to see the front.';

function aFlipCard(): { front: CardFrontProps; back: CardBackProps } {
	return {
		front: {
			displayName: 'Tomas Example',
			position: 'FORWARD',
			nationalTeamCode: 'ESP',
			clubName: 'Riverside Rovers',
			shirtNumber: 9,
			tier: 'RARE',
			overall: 84,
			attack: 88,
			defence: 41,
			control: 79
		},
		back: {
			ratings: {
				kind: 'outfield',
				pace: 97,
				shooting: 91,
				passing: 81,
				dribbling: 92,
				defending: 36,
				physical: 77
			},
			clubGoalCount: 250
		}
	};
}

async function emulateReducedMotion(value: 'reduce' | 'no-preference'): Promise<void> {
	await cdp().send('Emulation.setEmulatedMedia', {
		features: [{ name: 'prefers-reduced-motion', value }]
	});
}

afterEach(async () => {
	await emulateReducedMotion('no-preference');
});

/** The computed style of the part of the card that turns. */
function turningPart(container: HTMLElement): CSSStyleDeclaration {
	return getComputedStyle(container.querySelector('.inner') ?? container);
}

test('the card starts on its front, and the button says so', async () => {
	const screen = await render(FlipCard, aFlipCard());

	await expect.element(screen.getByRole('button')).toHaveAccessibleName(FRONT_NAME);
	await expect.element(screen.getByRole('img', { name: /Tomas Example, Forward/ })).toBeVisible();
});

test('a tap turns the card to its back', async () => {
	const screen = await render(FlipCard, aFlipCard());

	await screen.getByRole('button', { name: FRONT_NAME }).click();

	await expect.element(screen.getByRole('button')).toHaveAccessibleName(BACK_NAME);
});

test.each(['{Enter}', ' '])('the key %j turns the card over and back', async (key) => {
	const screen = await render(FlipCard, aFlipCard());
	const button = screen.getByRole('button');
	button.element().focus();

	await userEvent.keyboard(key);
	await expect.element(button).toHaveAccessibleName(BACK_NAME);
	await userEvent.keyboard(key);
	await expect.element(button).toHaveAccessibleName(FRONT_NAME);
});

test('after two quick taps the card is back on its front', async () => {
	const screen = await render(FlipCard, aFlipCard());
	const button = screen.getByRole('button');

	await button.dblClick();

	await expect.element(button).toHaveAccessibleName(FRONT_NAME);
	expect(screen.container.querySelector('.front')?.hasAttribute('inert')).toBe(false);
});

test('on the front a screen reader gets the front and nothing of the back', async () => {
	const screen = await render(FlipCard, aFlipCard());

	const back = screen.container.querySelector('.back');
	expect(back?.getAttribute('aria-hidden')).toBe('true');
	expect(back?.hasAttribute('inert')).toBe(true);
	expect(screen.container.querySelector('.front')?.hasAttribute('aria-hidden')).toBe(false);
	// A role query skips what a screen reader can't reach, unlike a text query.
	await expect.element(screen.getByRole('term').first()).not.toBeInTheDocument();
});

test('on the back a screen reader gets the back and nothing of the front', async () => {
	const screen = await render(FlipCard, aFlipCard());

	await screen.getByRole('button').click();

	const front = screen.container.querySelector('.front');
	expect(front?.getAttribute('aria-hidden')).toBe('true');
	expect(front?.hasAttribute('inert')).toBe(true);
	expect(screen.container.querySelector('.back')?.hasAttribute('aria-hidden')).toBe(false);
	await expect.element(screen.getByRole('img')).not.toBeInTheDocument();
	expect(
		screen
			.getByRole('term')
			.elements()
			.map((term) => term.textContent.trim())
	).toContain('PACE');
});

test('the button is the only stop in the tab order on either side', async () => {
	const screen = await render(FlipCard, aFlipCard());
	const tabStops = (): number =>
		[...screen.container.querySelectorAll<HTMLElement>('*')].filter(
			(element) => element.tabIndex >= 0 && !element.closest('[inert]')
		).length;

	expect(tabStops()).toBe(1);
	await screen.getByRole('button').click();
	expect(tabStops()).toBe(1);
});

test('the turn animates the transform only', async () => {
	const screen = await render(FlipCard, aFlipCard());

	await screen.getByRole('button').click();

	const turning = turningPart(screen.container);
	expect(turning.transitionProperty).toBe('transform');
	expect(turning.transitionDuration).not.toBe('0s');
});

test('with reduced motion the sides swap with no movement', async () => {
	await emulateReducedMotion('reduce');
	const screen = await render(FlipCard, aFlipCard());

	await screen.getByRole('button').click();

	await expect.element(screen.getByRole('button')).toHaveAccessibleName(BACK_NAME);
	expect(turningPart(screen.container).transitionDuration).toBe('0s');
	expect(turningPart(screen.container).transform).not.toBe('none');
});

test('reduced motion turned on while the back shows keeps the back, still', async () => {
	const screen = await render(FlipCard, aFlipCard());
	await screen.getByRole('button').click();

	await emulateReducedMotion('reduce');

	await expect.element(screen.getByRole('button')).toHaveAccessibleName(BACK_NAME);
	expect(turningPart(screen.container).transitionDuration).toBe('0s');
	expect(turningPart(screen.container).transform).not.toBe('none');
});
