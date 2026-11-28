import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import {
	browserStorage,
	clearPlayerStorage,
	createPlayerStore
} from '../../../lib/state/player-store.ts';
import GuessView from './GuessView.svelte';

const IDS = ['p-0', 'p-1', 'p-2', 'p-3', 'p-4'];
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

/** Three clubs per player; the middle one has the most games, so it is the hidden one. */
function careerOf(id: string, spellCount: number): unknown {
	const slot = IDS.indexOf(id) * 3;
	const spells = Array.from({ length: spellCount }, (_, i) => ({
		club: `clubs/c${String(slot + i)}`,
		startYear: 2000 + i * 4,
		appearanceCount: { value: i === 1 ? 50 : 10 }
	}));
	return { careerSpells: spells };
}

function serve(spellCount: number, broken: readonly string[] = []): void {
	vi.stubGlobal('fetch', (path: string) => {
		requested.push(path);
		const json = (body: unknown): Promise<Response> =>
			Promise.resolve(new Response(JSON.stringify(body)));
		if (path.endsWith('/players.json')) {
			const extras = ['RARE', 'LEGEND', 'ICON'].map((tier) => summary(`p-${tier}`, tier));
			return json({ players: [...IDS.map((id) => summary(id)), ...extras] });
		}
		if (path.endsWith('/clubs.json')) {
			return json({
				clubs: Array.from({ length: 15 }, (_, i) => ({
					name: `clubs/c${String(i)}`,
					displayName: `Club ${String(i)}`
				}))
			});
		}
		const id = IDS.find((candidate) => path.includes(`${candidate}.json`));
		if (id === undefined || broken.includes(id))
			return Promise.resolve(new Response('', { status: 404 }));
		return json(careerOf(id, spellCount));
	});
}

type Screen = Awaited<ReturnType<typeof render>>;

/** The name of the club hidden in the question on screen. */
async function hiddenClubName(screen: Screen): Promise<string> {
	await expect.element(screen.getByRole('status')).toHaveTextContent(/Which club is hidden/);
	const text = screen.container.querySelector('[role="status"]')?.textContent ?? '';
	const index = IDS.findIndex((id) => text.includes(`Name ${id}`));
	return `Club ${String(index * 3 + 1)}`;
}

async function playRound(screen: Screen, taps: number): Promise<void> {
	for (let question = 0; question < IDS.length; question++) {
		const nextName = question === IDS.length - 1 ? 'Finish round' : 'Next';
		const club = screen
			.getByRole('button', { name: await hiddenClubName(screen), exact: true })
			.element() as HTMLElement;
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
	serve(3);
	vi.useFakeTimers();
	const screen = await render(GuessView);
	await playRound(screen, 1);

	await expect
		.element(
			screen.getByText(
				'You got 5 answers right out of 5. You earned 7 coins: 5 coins for the answers and 2 for finishing.'
			)
		)
		.toBeVisible();
	await expect.element(screen.getByRole('button', { name: 'Play again' })).toBeVisible();
	await expect
		.element(screen.getByRole('link', { name: 'Back to games' }))
		.toHaveAttribute('href', '/games');
	expect(createPlayerStore(browserStorage).load().state.coins).toBe(7);
	expect(requested.every((path) => path.startsWith('/'))).toBe(true);
});

test('leaves out a player whose career does not load and plays the rest', async () => {
	serve(3, ['p-2', 'p-3', 'p-4']);
	const screen = await render(GuessView);

	await expect.element(screen.getByText('Question 1 of 2')).toBeVisible();
});

test('says the game cannot start when no career is long enough, with a way back', async () => {
	serve(2);
	const screen = await render(GuessView);

	await expect.element(screen.getByText("The game can't start right now")).toBeVisible();
	await expect
		.element(screen.getByRole('link', { name: 'Back to games' }))
		.toHaveAttribute('href', '/games');
});

test('a failed save is said in words and the round goes on', async () => {
	serve(3);
	vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
		throw new DOMException('full', 'QuotaExceededError');
	});
	const screen = await render(GuessView);

	await screen.getByRole('button', { name: await hiddenClubName(screen), exact: true }).click();

	await expect.element(screen.getByText(/your coins were not saved/)).toBeVisible();
	await expect.element(screen.getByRole('button', { name: 'Next' })).toBeVisible();
});

test('a second tap on a club, then on Finish, pays nothing more', async () => {
	serve(3);
	vi.useFakeTimers();
	const screen = await render(GuessView);
	await playRound(screen, 2);

	expect(createPlayerStore(browserStorage).load().state.coins).toBe(7);
});
