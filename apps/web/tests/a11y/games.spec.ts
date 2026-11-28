import { AxeBuilder } from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { createPlayerState, createRandom } from '@soccer-cards/game';
import { STATE_KEY } from '../../src/lib/state/player-store.ts';

const RATINGS = { pace: 80, shooting: 70, passing: 60, dribbling: 75, defending: 40, physical: 65 };
const SEED = 7;
const IDS = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const;
type Id = (typeof IDS)[number];

function aSummary(id: string, tier: string): unknown {
	return {
		name: `players/p-${id}`,
		displayName: `Name p-${id}`,
		state: 'ACTIVE',
		club: 'clubs/shared',
		nationalTeamCode: 'ENG',
		position: 'FORWARD',
		tier,
		cardNumber: 9,
		outfieldRatings: RATINGS,
		playStats: { attack: 70, defence: 60, control: 65, overall: 70 }
	};
}

/** Each player has a club of their own before and after one every player shares. */
function careerOf(id: Id): unknown {
	const place = IDS.indexOf(id);
	return {
		careerSpells: [
			{ club: `clubs/first-${id}`, startYear: 1990, endYear: 1995 },
			{
				club: 'clubs/shared',
				startYear: 2000 + place,
				endYear: 2004 + place,
				appearanceCount: { value: 100 }
			},
			{ club: `clubs/last-${id}`, startYear: 2010 }
		]
	};
}

/** Serves invented players and clubs, a fixed seed and a saved player who owns every card. */
async function serve(page: Page, canStart: boolean): Promise<void> {
	const players = IDS.map((id, place) => aSummary(id, place < 5 ? 'BASE' : 'RARE'));
	const clubs = [
		{ name: 'clubs/shared', displayName: 'Real Madrid Club de Fútbol' },
		...IDS.flatMap((id) => [
			{ name: `clubs/first-${id}`, displayName: `First ${id.toUpperCase()}` },
			{ name: `clubs/last-${id}`, displayName: `Last ${id.toUpperCase()}` }
		])
	];
	await page.route('**/api/v1/players.json', (route) =>
		canStart ? route.fulfill({ json: { players } }) : route.fulfill({ status: 404 })
	);
	await page.route('**/api/v1/clubs.json', (route) => route.fulfill({ json: { clubs } }));
	await page.route('**/api/v1/photos/**', (route) => route.fulfill({ status: 404 }));
	await page.route('**/api/v1/players/*.json', (route) => {
		const id = /p-(\w)\.json$/.exec(route.request().url())?.[1] as Id;
		return route.fulfill({ json: careerOf(id) });
	});
	await page.addInitScript((seed) => {
		crypto.getRandomValues = ((array: Uint32Array) => {
			array[0] = seed;
			return array;
		}) as typeof crypto.getRandomValues;
	}, SEED);
	const state = {
		...createPlayerState(),
		coins: 10,
		collection: Object.fromEntries(IDS.map((id) => [`p-${id}`, 1]))
	};
	await page.addInitScript(
		([key, text]) => {
			if (localStorage.getItem(key) === null) localStorage.setItem(key, text);
		},
		[STATE_KEY, JSON.stringify(state)] as const
	);
}

/** Scans the page as a child sees it: only the card art is left out. */
async function scan(page: Page): Promise<void> {
	await page.evaluate(async () => document.fonts.ready);
	const results = await new AxeBuilder({ page }).exclude('[data-art]').analyze();

	expect(results.violations).toEqual([]);
	// Axe sets aside text it can't measure. None may be.
	expect(results.incomplete.filter((check) => check.id === 'color-contrast')).toEqual([]);
}

/** One game: how to show its board, answer once and play to the finish. */
interface Game {
	readonly name: string;
	readonly path: string;
	readonly open: (page: Page) => Promise<void>;
	readonly answer: (page: Page) => Promise<void>;
	readonly finish: (page: Page) => Promise<void>;
}

const NEXT = /^(Next|Next player|Finish round)$/;
const finished = (page: Page) => page.getByRole('heading', { name: 'Round finished!' });

/** Presses Next until the round moves on, as the button ignores a press just after an answer. */
async function moveOn(page: Page, step: number): Promise<void> {
	const arrived = page
		.getByText(new RegExp(`^(Question|Player) ${String(step + 1)} of 5$`))
		.or(finished(page));
	await expect(async () => {
		await page.getByRole('button', { name: NEXT }).click();
		await expect(arrived).toBeVisible({ timeout: 300 });
	}).toPass();
}

async function placeClubs(page: Page): Promise<void> {
	const bank = page.getByRole('group', { name: 'Clubs to place' });
	for (let placed = 0; placed < 3; placed++) await bank.getByRole('button').first().click();
	await page.getByRole('button', { name: 'Check' }).click();
}

async function pickClub(page: Page): Promise<void> {
	await page.getByRole('group', { name: 'Clubs' }).getByRole('button').first().click();
}

function aRoundGame(
	name: string,
	path: string,
	first: string,
	play: (page: Page) => Promise<void>
): Game {
	return {
		name,
		path,
		open: async (page) => {
			await page.goto(path);
			await expect(page.getByText(first)).toBeVisible();
		},
		answer: async (page) => {
			await play(page);
			await expect(page.getByRole('button', { name: NEXT })).toBeVisible();
		},
		finish: async (page) => {
			for (let step = 1; step <= 5; step++) {
				await play(page);
				await moveOn(page, step);
			}
			await expect(finished(page)).toBeVisible();
		}
	};
}

/** The places of each pair on the 6-pair board, as the game deals it for the fixed seed. */
function pairPlaces(): [number, number][] {
	const random = createRandom(SEED);
	const picked = random.sample(
		IDS.map((id) => `p-${id}`),
		6
	);
	const board = random.sample([...picked, ...picked], 12);
	return [...new Set(board)].map((id) => [board.indexOf(id) + 1, board.lastIndexOf(id) + 1]);
}

const cardAt = (page: Page, place: number) =>
	page.getByRole('button', { name: `Face-down card ${String(place)}`, exact: true });

const pairs: Game = {
	name: 'Pairs',
	path: '/games/pairs',
	open: async (page) => {
		await page.goto('/games/pairs');
		await page.getByRole('button', { name: '6 pairs' }).click();
		await expect(cardAt(page, 1)).toBeVisible();
	},
	answer: async (page) => {
		const places = pairPlaces();
		await cardAt(page, places[0]?.[0] ?? 1).click();
		await cardAt(page, places[1]?.[0] ?? 2).click();
		await expect(page.getByText('Turns: 1')).toBeVisible();
	},
	finish: async (page) => {
		for (const [first, second] of pairPlaces()) {
			await cardAt(page, first).click();
			await cardAt(page, second).click();
		}
		await expect(page.getByRole('heading', { name: 'All 6 pairs found!' })).toBeVisible();
	}
};

const GAMES: readonly Game[] = [
	aRoundGame('Transfer Trail', '/games/transfer-trail', 'Player 1 of 5', placeClubs),
	aRoundGame('Connections', '/games/connections', 'Question 1 of 5', pickClub),
	aRoundGame('Guess the Club', '/games/guess-the-club', 'Question 1 of 5', pickClub),
	pairs
];

for (const colorScheme of ['light', 'dark'] as const) {
	test.describe(`with the system in ${colorScheme} mode`, () => {
		test.use({ colorScheme });

		for (const game of GAMES) {
			test.describe(game.name, () => {
				test('the board has no accessibility violation', async ({ page }) => {
					await serve(page, true);
					await game.open(page);

					await scan(page);
				});

				test('the answered state has no accessibility violation', async ({ page }) => {
					await serve(page, true);
					await game.open(page);
					await game.answer(page);

					await scan(page);
				});

				test('the finish screen has no accessibility violation', async ({ page }) => {
					await serve(page, true);
					await game.open(page);
					await game.finish(page);

					await scan(page);
				});

				test("the can't-start screen has no accessibility violation", async ({ page }) => {
					await serve(page, false);
					await page.goto(game.path);
					await expect(
						page.getByRole('heading', { name: "The game can't start right now" })
					).toBeVisible();

					await scan(page);
				});
			});
		}
	});
}
