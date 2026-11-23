import { expect, test, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
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

async function fill(screen: Awaited<ReturnType<typeof render>>, names: readonly string[]) {
	for (const name of names) await screen.getByRole('button', { name }).click();
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

	await fill(screen, ['Alpha FC', 'Beta United', 'Real Madrid Club de Fútbol']);

	await expect.element(screen.getByRole('button', { name: 'Check' })).toBeVisible();
});

test('a wrong trail shows the right order with years and says which places are wrong', async () => {
	const screen = await render(TrailBoard, props(anyCheck));
	await fill(screen, ['Alpha FC', 'Real Madrid Club de Fútbol', 'Beta United']);

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
	await fill(screen, ['Alpha FC', 'Beta United', 'Real Madrid Club de Fútbol']);

	await screen.getByRole('button', { name: 'Check' }).click();

	await expect
		.element(screen.getByText('Right! That is Ana Diaz’s trail. You earned 1 coin.'))
		.toBeVisible();
});

test('the last player offers Finish round', async () => {
	const screen = await render(TrailBoard, { ...props(anyCheck), isLast: true });
	await fill(screen, ['Alpha FC', 'Beta United', 'Real Madrid Club de Fútbol']);

	await screen.getByRole('button', { name: 'Check' }).click();

	await expect.element(screen.getByRole('button', { name: 'Finish round' })).toBeVisible();
});

async function checked(onNext = vi.fn(), onCheck = vi.fn(anyCheck)) {
	const screen = await render(TrailBoard, { ...props(onCheck), onNext });
	await fill(screen, ['Alpha FC', 'Beta United', 'Real Madrid Club de Fútbol']);
	return { screen, onNext, onCheck };
}

test('a double click on Check keeps the result on screen', async () => {
	vi.useFakeTimers();
	try {
		const { screen, onNext, onCheck } = await checked();

		await screen.getByRole('button', { name: 'Check' }).click({ clickCount: 2 });

		expect(onCheck).toHaveBeenCalledTimes(1);
		expect(onNext).not.toHaveBeenCalled();
		await expect.element(screen.getByRole('button', { name: 'Next player' })).toBeVisible();
	} finally {
		vi.useRealTimers();
	}
});

test('a repeated Enter on Check does not press Next player', async () => {
	vi.useFakeTimers();
	try {
		const { screen, onNext } = await checked();
		screen.getByRole('button', { name: 'Check' }).element().focus();

		await userEvent.keyboard('{Enter}{Enter}{Enter}');

		expect(onNext).not.toHaveBeenCalled();
		await expect.element(screen.getByText(/^Not this time\./)).toBeVisible();
	} finally {
		vi.useRealTimers();
	}
});

test('Next player works once the moment has passed', async () => {
	vi.useFakeTimers();
	try {
		const { screen, onNext } = await checked();
		await screen.getByRole('button', { name: 'Check' }).click();
		await screen.getByRole('button', { name: 'Next player' }).click();
		expect(onNext).not.toHaveBeenCalled();

		await vi.advanceTimersByTimeAsync(1000);
		await screen.getByRole('button', { name: 'Next player' }).click();

		expect(onNext).toHaveBeenCalledTimes(1);
	} finally {
		vi.useRealTimers();
	}
});

test('a double click on a club places it once', async () => {
	const screen = await render(TrailBoard, props(anyCheck));

	await screen.getByRole('button', { name: 'Alpha FC' }).click({ clickCount: 2 });

	await expect.element(screen.getByRole('list').getByRole('button')).toHaveLength(1);
});

test('two clubs with the same name both show and either can go first', async () => {
	const twins: TrailStep = {
		playerId: 'p-2',
		spells: [
			{ clubId: 'x1', startYear: 2008, endYear: 2012 },
			{ clubId: 'x2', startYear: 2012 }
		],
		dealt: ['x2', 'x1']
	};
	const names = (clubId: string) => (clubId.startsWith('x') ? 'City FC' : clubId);
	const screen = await render(TrailBoard, { ...props(anyCheck), step: twins, nameOf: names });

	await screen.getByRole('button', { name: 'City FC' }).first().click();

	await expect.element(screen.getByRole('list').getByRole('button')).toBeVisible();
});
