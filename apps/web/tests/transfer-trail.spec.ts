import { expect, test, type Page } from '@playwright/test';
import { createPlayerState } from '@soccer-cards/game';
import { STATE_KEY } from '../src/lib/state/player-store.ts';

const RATINGS = { pace: 80, shooting: 70, passing: 60, dribbling: 75, defending: 40, physical: 65 };
const LONG_NAME = 'Real Madrid Club de Fútbol';
// The right order, first club to last.
const CLUBS = ['Alpha FC', 'Beta United', LONG_NAME] as const;
const START_COINS = 10;
const TRAIL_COINS = 1;
const ROUND_COINS = 5 + 2;

function aSummary(id: string, tier: string): unknown {
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

/** Serves invented players, clubs and careers in place of the real files. */
async function serve(
	page: Page,
	{ careers = true, missing = [] }: { careers?: boolean; missing?: readonly string[] } = {}
): Promise<void> {
	const players = [
		...['a', 'b', 'c', 'd', 'e'].map((id) => aSummary(`p-${id}`, 'BASE')),
		aSummary('p-rare', 'RARE'),
		aSummary('p-legend', 'LEGEND'),
		aSummary('p-icon', 'ICON')
	];
	const clubs = CLUBS.map((displayName, index) => ({
		name: `clubs/c${String(index)}`,
		displayName
	}));
	const careerSpells = [
		{ club: 'clubs/c1', startYear: 2004, endYear: 2008 },
		{ club: 'clubs/c0', startYear: 2000, endYear: 2004 },
		{ club: 'clubs/c2', startYear: 2008 }
	];
	await page.route('**/api/v1/players.json', (route) => route.fulfill({ json: { players } }));
	await page.route('**/api/v1/clubs.json', (route) => route.fulfill({ json: { clubs } }));
	await page.route('**/api/v1/players/*.json', (route) => {
		const id = /players\/(.+)\.json$/.exec(route.request().url())?.[1] ?? '';
		return careers && !missing.includes(id)
			? route.fulfill({ json: { careerSpells } })
			: route.fulfill({ status: 404 });
	});
	// A fixed random seed, so the deal is the same on every run.
	await page.addInitScript(() => {
		crypto.getRandomValues = ((array: Uint32Array) => {
			array[0] = 7;
			return array;
		}) as typeof crypto.getRandomValues;
	});
	await page.addInitScript(
		([key, text]) => {
			if (localStorage.getItem(key) === null) localStorage.setItem(key, text);
		},
		[STATE_KEY, JSON.stringify({ ...createPlayerState(), coins: START_COINS })] as const
	);
}

const tile = (page: Page, name: string) => page.getByRole('button', { name, exact: true });

async function placeAll(page: Page, order: readonly string[]): Promise<void> {
	for (const name of order) await tile(page, name).click();
}

/** Presses Next until the round moves on, as the button ignores a press just after a check. */
async function moveOn(page: Page, press: () => Promise<void>, player: number): Promise<void> {
	const arrived =
		player === 5
			? page.getByRole('heading', { name: 'Round finished!' })
			: page.getByText(`Player ${String(player + 1)} of 5`);
	await expect(async () => {
		await press();
		await expect(arrived).toBeVisible({ timeout: 300 });
	}).toPass();
}

async function playRound(page: Page): Promise<void> {
	for (let player = 1; player <= 5; player++) {
		await placeAll(page, CLUBS);
		await page.getByRole('button', { name: 'Check' }).click();
		const next = page.getByRole('button', { name: player === 5 ? 'Finish round' : 'Next player' });
		await moveOn(page, () => next.click(), player);
	}
}

test('a full round with the mouse pays coins and shows them in the masthead', async ({ page }) => {
	await serve(page);
	await page.goto('/games/transfer-trail');

	await expect(page.getByText('Player 1 of 5')).toBeVisible();
	await playRound(page);

	await expect(page.getByRole('heading', { name: 'Round finished!' })).toBeVisible();
	await expect(
		page.getByText(/You put 5 trails right out of 5\. You earned 7 coins/)
	).toBeVisible();
	await expect(page.getByText(`${String(START_COINS + ROUND_COINS)} coins`)).toBeVisible();
	await expect(page.getByRole('button', { name: 'Play again' })).toBeVisible();
	await expect(page.getByRole('link', { name: 'Back to games' })).toHaveAttribute('href', '/games');
});

test('a double tap on Check pays one right trail once', async ({ page }) => {
	await serve(page);
	await page.goto('/games/transfer-trail');
	await placeAll(page, CLUBS);

	await page.getByRole('button', { name: 'Check' }).dblclick();

	await expect(page.getByText(/^Right! /)).toBeVisible();
	await expect(page.getByText('Right: 1')).toBeVisible();
	await expect(page.getByText(`${String(START_COINS + TRAIL_COINS)} coins`)).toBeVisible();
});

test('a wrong trail shows the right order in words and pays nothing', async ({ page }) => {
	await serve(page);
	await page.goto('/games/transfer-trail');
	await placeAll(page, [CLUBS[2], CLUBS[1], CLUBS[0]]);

	await page.getByRole('button', { name: 'Check' }).click();

	await expect(page.getByText(/^Not this time\./)).toBeVisible();
	await expect(page.getByText('2004 to 2008 (right place)')).toBeVisible();
	await expect(page.getByText(`2008 to now (you put ${CLUBS[0]} here)`)).toBeVisible();
	await expect(page.getByText(`${String(START_COINS)} coins`)).toBeVisible();
});

test('a round plays with the keyboard alone', async ({ page }) => {
	await serve(page);
	await page.goto('/games/transfer-trail');

	for (let player = 1; player <= 5; player++) {
		for (const name of CLUBS) {
			await tile(page, name).focus();
			await page.keyboard.press('Enter');
		}
		await expect(page.getByRole('button', { name: 'Check' })).toBeFocused();
		await page.keyboard.press('Enter');
		await expect(page.getByRole('button', { name: /^(Next player|Finish round)$/ })).toBeFocused();
		await moveOn(page, () => page.keyboard.press('Enter'), player);
	}

	await expect(page.getByRole('heading', { name: 'Round finished!' })).toBeFocused();
	await expect(page.getByText(`${String(START_COINS + ROUND_COINS)} coins`)).toBeVisible();
});

test('with reduced motion nothing on the board animates', async ({ page }) => {
	await page.emulateMedia({ reducedMotion: 'reduce' });
	await serve(page);
	await page.goto('/games/transfer-trail');
	await placeAll(page, CLUBS);
	await page.getByRole('button', { name: 'Check' }).click();

	const running = await page
		.getByRole('list')
		.last()
		.evaluate((list) => list.getAnimations({ subtree: true }).length);

	expect(running).toBe(0);
});

test('a career that fails to load is left out and the round still has 5 players', async ({
	page
}) => {
	await serve(page, { missing: ['p-a', 'p-b'] });
	await page.goto('/games/transfer-trail');

	await expect(page.getByText('Player 1 of 5')).toBeVisible();
	await playRound(page);

	await expect(page.getByRole('heading', { name: 'Round finished!' })).toBeVisible();
	await expect(page.getByText(`${String(START_COINS + ROUND_COINS)} coins`)).toBeVisible();
});

test('says the game cannot start when no career loads, with a link back', async ({ page }) => {
	await serve(page, { careers: false });
	await page.goto('/games/transfer-trail');

	await expect(page.getByText("The game can't start right now")).toBeVisible();
	await expect(page.getByRole('link', { name: 'Back to games' })).toHaveAttribute('href', '/games');
});

for (const width of [320, 390]) {
	test(`the board fits at ${String(width)} pixels with no sideways scroll`, async ({ page }) => {
		await page.setViewportSize({ width, height: 700 });
		await serve(page);
		await page.goto('/games/transfer-trail');
		await tile(page, LONG_NAME).click();

		const overflow = await page.evaluate(
			() => document.documentElement.scrollWidth - document.documentElement.clientWidth
		);

		expect(overflow).toBeLessThanOrEqual(0);
	});
}
