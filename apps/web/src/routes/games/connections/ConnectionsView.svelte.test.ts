import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import {
	browserStorage,
	clearPlayerStorage,
	createPlayerStore
} from '../../../lib/state/player-store.ts';
import ConnectionsView from './ConnectionsView.svelte';

const IDS = ['p-1', 'p-2', 'p-3', 'p-4', 'p-5'];
const SHARED_CLUB = 'Alpha FC';
const RATINGS = { pace: 80, shooting: 70, passing: 60, dribbling: 75, defending: 40, physical: 65 };
const requested: string[] = [];

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

function careerOf(id: string, isShared: boolean): unknown {
	const slot = IDS.indexOf(id) * 2;
	const own = [1, 2].map((offset, i) => ({
		club: `clubs/c${String(slot + offset)}`,
		startYear: 2004 + i * 4
	}));
	return { careerSpells: isShared ? [{ club: 'clubs/c0', startYear: 2000 }, ...own] : own };
}

function serve(isShared: boolean, broken: readonly string[] = []): void {
	vi.stubGlobal('fetch', (path: string) => {
		requested.push(path);
		const json = (body: unknown): Promise<Response> =>
			Promise.resolve(new Response(JSON.stringify(body)));
		if (path.endsWith('/players.json')) {
			const extras = ['RARE', 'LEGEND', 'ICON'].map((tier) => summary(`p-${tier}`, tier));
			return json({ players: [...IDS.map((id) => summary(id)), ...extras] });
		}
		if (path.endsWith('/clubs.json')) {
			const names = Array.from({ length: 11 }, (_, i) =>
				i === 0 ? SHARED_CLUB : `Club ${String(i)}`
			);
			return json({
				clubs: names.map((displayName, i) => ({ name: `clubs/c${String(i)}`, displayName }))
			});
		}
		const id = IDS.find((candidate) => path.includes(`${candidate}.json`));
		if (id === undefined || broken.includes(id))
			return Promise.resolve(new Response('', { status: 404 }));
		return json(careerOf(id, isShared));
	});
}

async function playRound(screen: Awaited<ReturnType<typeof render>>, taps: number): Promise<void> {
	for (let question = 0; question < IDS.length; question++) {
		const nextName = question === IDS.length - 1 ? 'Finish round' : 'Next';
		await expect.element(screen.getByRole('button', { name: SHARED_CLUB })).toBeVisible();
		const club = screen.getByRole('button', { name: SHARED_CLUB }).element() as HTMLElement;
		for (let tap = 0; tap < taps; tap++) club.click();
		await vi.advanceTimersByTimeAsync(1000); // past the Next guard
		await expect.element(screen.getByRole('button', { name: nextName })).toBeVisible();
		const next = screen.getByRole('button', { name: nextName }).element() as HTMLElement;
		for (let tap = 0; tap < taps; tap++) next.click();
	}
	await expect.element(screen.getByRole('heading', { name: 'Round finished!' })).toBeVisible();
}

beforeEach(() => {
	clearPlayerStorage(browserStorage);
});
afterEach(() => {
	vi.unstubAllGlobals();
	vi.useRealTimers();
	vi.restoreAllMocks();
});

test('five right answers finish the round, pay 7 coins and save them', async () => {
	serve(true);
	vi.useFakeTimers();
	const screen = await render(ConnectionsView);
	await playRound(screen, 1);

	await expect
		.element(
			screen.getByText(
				'You got 5 answers right out of 5. You earned 7 coins: 5 coins for the answers and 2 for finishing.'
			)
		)
		.toBeVisible();
	await expect.element(screen.getByRole('link', { name: 'Back to games' })).toBeVisible();
	expect(createPlayerStore(browserStorage).load().state.coins).toBe(7);
	expect(requested.every((path) => path.startsWith('/'))).toBe(true);
});

test('leaves out a player whose career does not load and plays the rest', async () => {
	serve(true, ['p-3', 'p-4', 'p-5']);
	const screen = await render(ConnectionsView);

	await expect.element(screen.getByText('Question 1 of 1')).toBeVisible();
});

test('says the game cannot start when no two players share a club, with a way back', async () => {
	serve(false);
	const screen = await render(ConnectionsView);

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
	const screen = await render(ConnectionsView);

	await screen.getByRole('button', { name: SHARED_CLUB }).click();

	await expect.element(screen.getByText(/your coins were not saved/)).toBeVisible();
});

test('a second tap on a club, then on Finish, pays nothing more', async () => {
	serve(true);
	vi.useFakeTimers();
	const screen = await render(ConnectionsView);
	await playRound(screen, 2);

	expect(createPlayerStore(browserStorage).load().state.coins).toBe(7);
});
