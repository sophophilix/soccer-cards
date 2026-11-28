import { expect, test, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import GuessBoard from './GuessBoard.svelte';

const player = {
	displayName: 'Ana Diaz',
	position: 'FORWARD',
	tier: 'BASE',
	overall: 70,
	attack: 70,
	defence: 60,
	control: 65
} as const;
const spells = [
	{ clubName: 'Alpha FC', isHidden: false, startYear: 2005, endYear: 2008, games: 30, goals: 4 },
	{ clubName: 'Chelsea F.C.', isHidden: true, startYear: 2008, endYear: 2012, games: 9 },
	{ clubName: 'Delta', isHidden: false, startYear: 2012 }
];
const options = [
	{ clubId: 'a', name: 'Chelsea F.C.' },
	{ clubId: 'b', name: 'Beta United' },
	{ clubId: 'c', name: 'Real Madrid Club de Fútbol' },
	{ clubId: 'd', name: 'Delta Town' }
];
function props(extra: Record<string, unknown> = {}) {
	return { player, spells, options, isLast: false, onPick: vi.fn(), onNext: vi.fn(), ...extra };
}
const result = (pickedClubId: string) => ({ pickedClubId, rightClubId: 'a' });

test('the career is a list and the hidden spell shows ? with text for a screen reader', async () => {
	const screen = await render(GuessBoard, props());

	expect(screen.container.querySelectorAll('ol li')).toHaveLength(3);
	await expect.element(screen.getByText('hidden club')).toBeInTheDocument();
	await expect
		.element(screen.getByText('?', { exact: true }))
		.toHaveAttribute('aria-hidden', 'true');
	await expect.element(screen.getByText('2005 to 2008, 30 games, 4 goals')).toBeVisible();
	await expect.element(screen.getByText('2008 to 2012, 9 games, goals not known')).toBeVisible();
	await expect.element(screen.getByText('2012 to now, games not known')).toBeVisible();
	expect(screen.container.querySelector('ol')?.textContent).not.toContain('Chelsea');
});

test('a tap tells the page the pick, and a double tap answers once', async () => {
	const p = props();
	const screen = await render(GuessBoard, p);

	await screen.getByRole('button', { name: 'Beta United' }).dblClick();

	expect(p.onPick).toHaveBeenCalledExactlyOnceWith('b');
});

test('a repeated Enter on a club answers once', async () => {
	const p = props();
	const screen = await render(GuessBoard, p);
	screen.getByRole('button', { name: 'Delta Town' }).element().focus();

	await userEvent.keyboard('{Enter}{Enter}{Enter}');

	expect(p.onPick).toHaveBeenCalledTimes(1);
});

test('a right answer says so and fills in the hidden club', async () => {
	const screen = await render(GuessBoard, props({ result: result('a') }));

	await expect.element(screen.getByText('Right! The hidden club was Chelsea F.C.')).toBeVisible();
	await expect.element(screen.getByText('hidden club', { exact: true })).not.toBeInTheDocument();
	expect(screen.container.querySelector('ol li.hit')?.textContent).toContain('Chelsea F.C.');
});

test('a wrong answer marks the right club and the pick in words and fills in the hidden club', async () => {
	const screen = await render(GuessBoard, props({ result: result('b') }));

	await expect
		.element(screen.getByText('Not this one. The hidden club was Chelsea F.C.'))
		.toBeVisible();
	await expect.element(screen.getByText('right', { exact: true })).toBeVisible();
	await expect.element(screen.getByText('not this one', { exact: true })).toBeVisible();
	expect(screen.container.querySelector('ol li.hit')?.textContent).toContain('Chelsea F.C.');
});

test('Next ignores a repeated Enter for a moment, then carries on', async () => {
	vi.useFakeTimers();
	try {
		const p = props({ result: result('a') });
		const screen = await render(GuessBoard, p);
		const next = screen.getByRole('button', { name: 'Next' });

		await expect.element(next).toHaveAttribute('aria-disabled', 'true');
		await userEvent.keyboard('{Enter}{Enter}{Enter}');
		expect(p.onNext).not.toHaveBeenCalled();

		await vi.advanceTimersByTimeAsync(1000);
		await next.click();

		expect(p.onNext).toHaveBeenCalledTimes(1);
	} finally {
		vi.useRealTimers();
	}
});

test('the last question offers Finish round', async () => {
	const screen = await render(GuessBoard, props({ result: result('a'), isLast: true }));

	await expect.element(screen.getByRole('button', { name: 'Finish round' })).toBeVisible();
	await expect.element(screen.getByRole('button', { name: 'Next' })).not.toBeInTheDocument();
});
