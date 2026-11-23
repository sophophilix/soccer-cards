import { expect, test, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import ConnectionsBoard from './ConnectionsBoard.svelte';

const front = (displayName: string) =>
	({
		displayName,
		position: 'FORWARD',
		tier: 'BASE',
		overall: 70,
		attack: 70,
		defence: 60,
		control: 65
	}) as const;
const options = [
	{ clubId: 'a', name: 'Chelsea F.C.' },
	{ clubId: 'b', name: 'Beta United' },
	{ clubId: 'c', name: 'Real Madrid Club de Fútbol' },
	{ clubId: 'd', name: 'Delta' }
];
const result = (pickedClubId: string) => ({
	pickedClubId,
	rightClubId: 'a',
	years: [{ startYear: 2008, endYear: 2012 }, { startYear: 2019 }] as const
});
function props(extra: Record<string, unknown> = {}) {
	return {
		players: [front('Ana Diaz'), front('Bo Lee')] as const,
		options,
		isLast: false,
		onPick: vi.fn(),
		onNext: vi.fn(),
		...extra
	};
}

test('a tap tells the page the pick, and a double tap answers once', async () => {
	const p = props();
	const screen = await render(ConnectionsBoard, p);

	await screen.getByRole('button', { name: 'Beta United' }).dblClick();

	expect(p.onPick).toHaveBeenCalledExactlyOnceWith('b');
});

test('a repeated Enter on a club answers once', async () => {
	const p = props();
	const screen = await render(ConnectionsBoard, p);
	screen.getByRole('button', { name: 'Delta' }).element().focus();

	await userEvent.keyboard('{Enter}{Enter}{Enter}');

	expect(p.onPick).toHaveBeenCalledTimes(1);
});

test('a right answer says so and shows both years', async () => {
	const screen = await render(ConnectionsBoard, props({ result: result('a') }));

	await expect.element(screen.getByText('Right! Both played for Chelsea F.C.')).toBeVisible();
	await expect.element(screen.getByText('Ana Diaz at Chelsea F.C.: 2008 to 2012')).toBeVisible();
	await expect.element(screen.getByText('Bo Lee at Chelsea F.C.: 2019 to now')).toBeVisible();
});

test('a wrong answer marks the right club and the picked one in words', async () => {
	const screen = await render(ConnectionsBoard, props({ result: result('b') }));

	await expect
		.element(screen.getByText(/^Not this one\. Both played for Chelsea F\.C\./))
		.toBeVisible();
	await expect.element(screen.getByText('right', { exact: true })).toBeVisible();
	await expect.element(screen.getByText('not this one', { exact: true })).toBeVisible();
});

test('Next ignores a repeated Enter for a moment, then carries on', async () => {
	vi.useFakeTimers();
	try {
		const p = props({ result: result('a') });
		const screen = await render(ConnectionsBoard, p);
		const next = screen.getByRole('button', { name: 'Next' });

		await expect.element(next).toHaveAttribute('aria-disabled', 'true');
		await userEvent.keyboard('{Enter}{Enter}{Enter}');
		expect(p.onNext).not.toHaveBeenCalled();

		await vi.advanceTimersByTimeAsync(1000);
		await next.click();

		expect(p.onNext).toHaveBeenCalledTimes(1);
		await expect.element(next).not.toHaveAttribute('aria-disabled');
	} finally {
		vi.useRealTimers();
	}
});

test('the last question offers Finish round', async () => {
	const screen = await render(ConnectionsBoard, props({ result: result('a'), isLast: true }));

	await expect.element(screen.getByRole('button', { name: 'Finish round' })).toBeVisible();
	await expect.element(screen.getByRole('button', { name: 'Next' })).not.toBeInTheDocument();
});
