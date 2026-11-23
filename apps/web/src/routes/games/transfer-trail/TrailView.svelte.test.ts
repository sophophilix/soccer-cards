import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import {
	browserStorage,
	clearPlayerStorage,
	createPlayerStore
} from '../../../lib/state/player-store.ts';
import TrailView from './TrailView.svelte';

const IDS = ['p-1', 'p-2', 'p-3', 'p-4', 'p-5'];
const CLUBS = ['Alpha FC', 'Beta United', 'Gamma Town'];
const RATINGS = { pace: 80, shooting: 70, passing: 60, dribbling: 75, defending: 40, physical: 65 };

function summary(id: string, tier = 'BASE'): unknown {
	return {
		name: `players/${id}`,
		displayName: `Name ${id}`,
		state: 'ACTIVE',
		club: 'clubs/c0',
		nationalTeamCode: 'ENG',
		position: 'FORWARD',
		tier,
		cardNumber: 9,
		outfieldRatings: RATINGS,
		playStats: { attack: 70, defence: 60, control: 65, overall: 70 }
	};
}

const career = {
	careerSpells: [
		{ club: 'clubs/c0', startYear: 2000, endYear: 2004 },
		{ club: 'clubs/c1', startYear: 2004, endYear: 2008 },
		{ club: 'clubs/c2', startYear: 2008 }
	]
};

function serve(careersLoad: boolean, brokenIds: readonly string[] = []): void {
	vi.stubGlobal('fetch', (path: string) => {
		const json = (body: unknown): Promise<Response> =>
			Promise.resolve(new Response(JSON.stringify(body)));
		if (path.endsWith('/players.json'))
			return json({
				players: [
					...IDS.map((id) => summary(id)),
					summary('p-rare', 'RARE'),
					summary('p-legend', 'LEGEND'),
					summary('p-icon', 'ICON')
				]
			});
		if (path.endsWith('/clubs.json')) {
			return json({
				clubs: CLUBS.map((displayName, i) => ({ name: `clubs/c${String(i)}`, displayName }))
			});
		}
		if (brokenIds.some((id) => path.includes(`${id}.json`)))
			return Promise.resolve(new Response('', { status: 404 }));
		return careersLoad ? json(career) : Promise.resolve(new Response('', { status: 404 }));
	});
}

beforeEach(() => {
	clearPlayerStorage(browserStorage);
});
afterEach(() => {
	vi.unstubAllGlobals();
	vi.useRealTimers();
});

/** Lets the board's short guard after a check pass, so Next can be pressed. */
async function letGuardPass(): Promise<void> {
	await vi.advanceTimersByTimeAsync(1000);
}

test('five right trails finish the round and say what was earned', async () => {
	serve(true);
	vi.useFakeTimers();
	const screen = await render(TrailView);

	for (let player = 0; player < IDS.length; player++) {
		await screen.getByRole('button', { name: CLUBS[0] ?? '' }).click();
		await screen.getByRole('button', { name: CLUBS[1] ?? '' }).click();
		await screen.getByRole('button', { name: CLUBS[2] ?? '' }).click();
		await screen.getByRole('button', { name: 'Check' }).click();
		await letGuardPass();
		await screen
			.getByRole('button', { name: player === IDS.length - 1 ? 'Finish round' : 'Next player' })
			.click();
	}

	await expect.element(screen.getByRole('heading', { name: 'Round finished!' })).toBeVisible();
	await expect
		.element(
			screen.getByText(
				'You put 5 trails right out of 5. You earned 7 coins: 5 coins for the trails and 2 for finishing.'
			)
		)
		.toBeVisible();
	await expect.element(screen.getByRole('button', { name: 'Play again' })).toBeVisible();
	await expect
		.element(screen.getByRole('link', { name: 'Back to games' }))
		.toHaveAttribute('href', '/games');
	const saved = createPlayerStore(browserStorage).load().state;
	expect(saved.coins).toBe(7);
});

test('says the game cannot start when no career loads, with a way back', async () => {
	serve(false);
	const screen = await render(TrailView);

	await expect.element(screen.getByText("The game can't start right now")).toBeVisible();
	await expect
		.element(screen.getByRole('link', { name: 'Back to games' }))
		.toHaveAttribute('href', '/games');
});

test('a failed save is said in words and the round goes on', async () => {
	serve(true);
	vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
		throw new DOMException('full', 'QuotaExceededError');
	});
	const screen = await render(TrailView);

	await screen.getByRole('button', { name: CLUBS[0] ?? '' }).click();
	await screen.getByRole('button', { name: CLUBS[1] ?? '' }).click();
	await screen.getByRole('button', { name: CLUBS[2] ?? '' }).click();
	await screen.getByRole('button', { name: 'Check' }).click();

	await expect.element(screen.getByText(/your coins were not saved/)).toBeVisible();
	await expect.element(screen.getByRole('button', { name: 'Next player' })).toBeVisible();
	vi.restoreAllMocks();
});

test('leaves out a player whose career does not load and plays the rest', async () => {
	serve(true, ['p-1', 'p-2', 'p-3', 'p-4']);
	const screen = await render(TrailView);

	await expect.element(screen.getByText('Player 1 of 4')).toBeVisible();
});

test('a second tap on Check, then on Finish, pays nothing more', async () => {
	serve(true);
	vi.useFakeTimers();
	const screen = await render(TrailView);

	for (let player = 0; player < IDS.length; player++) {
		await screen.getByRole('button', { name: CLUBS[0] ?? '' }).click();
		await screen.getByRole('button', { name: CLUBS[1] ?? '' }).click();
		await screen.getByRole('button', { name: CLUBS[2] ?? '' }).click();
		const check = screen.getByRole('button', { name: 'Check' }).element() as HTMLElement;
		check.click();
		check.click();
		await letGuardPass();
		const isLast = player === IDS.length - 1;
		const nextName = isLast ? 'Finish round' : 'Next player';
		await expect.element(screen.getByRole('button', { name: nextName })).toBeVisible();
		const next = screen.getByRole('button', { name: nextName }).element() as HTMLElement;
		next.click();
		if (isLast) next.click();
	}

	await expect.element(screen.getByRole('heading', { name: 'Round finished!' })).toBeVisible();
	expect(createPlayerStore(browserStorage).load().state.coins).toBe(7);
});
