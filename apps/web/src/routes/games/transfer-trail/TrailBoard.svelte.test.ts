import { expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import type { TrailCheck, TrailStep } from '@soccer-cards/game';
import TrailBoard from './TrailBoard.svelte';

const NAMES: Record<string, string> = {
	a: 'Alpha FC',
	b: 'Beta United',
	c: 'Real Madrid Club de Fútbol'
};
const step: TrailStep = {
	playerId: 'p-1',
	spells: [
		{ clubId: 'a', startYear: 2008, endYear: 2012 },
		{ clubId: 'b', startYear: 2012, endYear: 2016 },
		{ clubId: 'c', startYear: 2016 }
	],
	dealt: ['c', 'a', 'b']
};
const front = {
	displayName: 'Ana Diaz',
	position: 'FORWARD',
	tier: 'BASE',
	overall: 70,
	attack: 70,
	defence: 60,
	control: 65
} as const;

function props(onCheck: (answer: readonly string[]) => TrailCheck | undefined) {
	return {
		step,
		front,
		nameOf: (clubId: string) => NAMES[clubId] ?? clubId,
		isLast: false,
		onCheck,
		onNext: vi.fn()
	};
}

const anyCheck = (): TrailCheck => ({ isRight: false, places: [true, false, false] });

test('a tap moves a club into the trail and a tap in the trail takes it back', async () => {
	const screen = await render(TrailBoard, props(anyCheck));

	await screen.getByRole('button', { name: 'Alpha FC' }).click();

	await expect
		.element(screen.getByRole('list').getByRole('button', { name: 'Alpha FC' }))
		.toBeVisible();
	await screen.getByRole('list').getByRole('button', { name: 'Alpha FC' }).click();
	await expect.element(screen.getByRole('list').getByRole('button')).not.toBeInTheDocument();
});

test('Check appears only when the trail is full', async () => {
	const screen = await render(TrailBoard, props(anyCheck));
	await expect.element(screen.getByRole('button', { name: 'Check' })).not.toBeInTheDocument();

	for (const name of ['Alpha FC', 'Beta United', 'Real Madrid Club de Fútbol']) {
		await screen.getByRole('button', { name }).click();
	}

	await expect.element(screen.getByRole('button', { name: 'Check' })).toBeVisible();
});

test('a wrong trail shows the right order with years and says which places are wrong', async () => {
	const screen = await render(TrailBoard, props(anyCheck));
	for (const name of ['Alpha FC', 'Real Madrid Club de Fútbol', 'Beta United']) {
		await screen.getByRole('button', { name }).click();
	}

	await screen.getByRole('button', { name: 'Check' }).click();

	await expect.element(screen.getByText(/^Not this time\./)).toBeVisible();
	await expect.element(screen.getByText('2008 to 2012 (right place)')).toBeVisible();
	await expect
		.element(screen.getByText('2012 to 2016 (you put Real Madrid Club de Fútbol here)'))
		.toBeVisible();
	await expect.element(screen.getByText('2016 to now (you put Beta United here)')).toBeVisible();
	await expect.element(screen.getByRole('button', { name: 'Next player' })).toBeVisible();
});

test('a right trail says so', async () => {
	const right = (): TrailCheck => ({ isRight: true, places: [true, true, true] });
	const screen = await render(TrailBoard, props(right));
	for (const name of ['Alpha FC', 'Beta United', 'Real Madrid Club de Fútbol']) {
		await screen.getByRole('button', { name }).click();
	}

	await screen.getByRole('button', { name: 'Check' }).click();

	await expect
		.element(screen.getByText('Right! That is Ana Diaz’s trail. You earned 1 coin.'))
		.toBeVisible();
});

test('the last player offers Finish round', async () => {
	const screen = await render(TrailBoard, { ...props(anyCheck), isLast: true });
	for (const name of ['Alpha FC', 'Beta United', 'Real Madrid Club de Fútbol']) {
		await screen.getByRole('button', { name }).click();
	}

	await screen.getByRole('button', { name: 'Check' }).click();

	await expect.element(screen.getByRole('button', { name: 'Finish round' })).toBeVisible();
});

test('the second tap of a double tap does not skip the result', async () => {
	const onNext = vi.fn();
	const screen = await render(TrailBoard, { ...props(anyCheck), onNext });
	for (const name of ['Alpha FC', 'Beta United', 'Real Madrid Club de Fútbol']) {
		await screen.getByRole('button', { name }).click();
	}
	await screen.getByRole('button', { name: 'Check' }).click();

	await screen.getByRole('button', { name: 'Next player' }).click({ clickCount: 2 });

	expect(onNext).toHaveBeenCalledTimes(1);
});
