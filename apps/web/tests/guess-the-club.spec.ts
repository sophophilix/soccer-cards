import { expect, test, type Page } from '@playwright/test';
import { createPlayerState } from '@soccer-cards/game';
import { STATE_KEY } from '../src/lib/state/player-store.ts';

const RATINGS = { pace: 80, shooting: 70, passing: 60, dribbling: 75, defending: 40, physical: 65 };
const LONG_NAME = 'Real Madrid Club de Fútbol';
const START_COINS = 10;
// Five answers at 1 coin each, and 2 for finishing.
const ROUND_COINS = 5 + 2;
const IDS = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const;
type Id = (typeof IDS)[number];

function aSummary(id: string, tier: string): unknown {
	return {
		name: `players/p-${id}`,
		displayName: `Name p-${id}`,
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

/** How one invented player's career file is served. */
type Career = 'full' | 'short' | 'not-found' | 'bad-club' | 'empty';

/** Each player has two clubs of their own. The club all of them share has a long name and most games. */
function careerOf(id: Id, kind: Career): unknown {
	const first = { club: `clubs/first-${id}`, startYear: 1990, endYear: 1995 };
	const shared = {
		club: 'clubs/shared',
		startYear: 2000,
		endYear: 2004,
		appearanceCount: { value: 100 }
	};
	const last = { club: `clubs/last-${id}`, startYear: 2005 };
	if (kind === 'bad-club') return { careerSpells: [{ club: 'clubs/nowhere', startYear: 2000 }] };
	if (kind === 'empty') return { careerSpells: [] };
	return { careerSpells: kind === 'full' ? [first, shared, last] : [first, last] };
}

/** Serves invented players, clubs and careers in place of the real files. */
async function serve(page: Page, kinds: Partial<Record<Id, Career>> = {}): Promise<void> {
	const players = IDS.map((id, place) => aSummary(id, place < 5 ? 'BASE' : 'RARE'));
	const clubs = [
		{ name: 'clubs/shared', displayName: LONG_NAME },
		...IDS.flatMap((id) => [
			{ name: `clubs/first-${id}`, displayName: `First ${id.toUpperCase()}` },
			{ name: `clubs/last-${id}`, displayName: `Last ${id.toUpperCase()}` }
		])
	];
	await page.route('**/api/v1/players.json', (route) => route.fulfill({ json: { players } }));
	await page.route('**/api/v1/clubs.json', (route) => route.fulfill({ json: { clubs } }));
	await page.route('**/api/v1/players/*.json', (route) => {
		const id = /p-(\w)\.json$/.exec(route.request().url())?.[1] as Id;
		const kind = kinds[id] ?? 'full';
		if (kind === 'not-found') return route.fulfill({ status: 404 });
		return route.fulfill({ json: careerOf(id, kind) });
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

const rightTile = (page: Page) => page.getByRole('button', { name: LONG_NAME, exact: true });
const wrongTiles = (page: Page) =>
	page.getByRole('group', { name: 'Clubs' }).getByRole('button').filter({ hasNotText: LONG_NAME });

/** Presses Next until the round moves on, as the button ignores a press just after an answer. */
async function moveOn(page: Page, press: () => Promise<void>, question: number): Promise<void> {
	const arrived =
		question === 5
			? page.getByRole('heading', { name: 'Round finished!' })
			: page.getByText(`Question ${String(question + 1)} of 5`);
	await expect(async () => {
		await press();
		await expect(arrived).toBeVisible({ timeout: 300 });
	}).toPass();
}

const nextButton = (page: Page, question: number) =>
	page.getByRole('button', { name: question === 5 ? 'Finish round' : 'Next', exact: true });

test('a full round with the mouse pays coins and shows them in the masthead', async ({ page }) => {
	await serve(page);
	await page.goto('/games/guess-the-club');

	await expect(page.getByText('Question 1 of 5')).toBeVisible();
	for (let question = 1; question <= 5; question++) {
		await rightTile(page).click();
		await expect(page.getByText(`Right: ${String(question)}`)).toBeVisible();
		await moveOn(page, () => nextButton(page, question).click(), question);
	}

	await expect(page.getByRole('heading', { name: 'Round finished!' })).toBeVisible();
	await expect(
		page.getByText(/You got 5 answers right out of 5\. You earned 7 coins/)
	).toBeVisible();
	await expect(page.getByText(`${String(START_COINS + ROUND_COINS)} coins`)).toBeVisible();
	await expect(page.getByRole('button', { name: 'Play again' })).toBeVisible();
	await expect(page.getByRole('link', { name: 'Back to games' })).toHaveAttribute('href', '/games');
});

test('a round plays with the keyboard alone', async ({ page }) => {
	await serve(page);
	await page.goto('/games/guess-the-club');

	for (let question = 1; question <= 5; question++) {
		await rightTile(page).focus();
		await page.keyboard.press('Enter');
		await expect(nextButton(page, question)).toBeFocused();
		await moveOn(page, () => page.keyboard.press('Enter'), question);
	}

	await expect(page.getByRole('heading', { name: 'Round finished!' })).toBeFocused();
	await expect(page.getByText(`${String(START_COINS + ROUND_COINS)} coins`)).toBeVisible();
});

test('a wrong answer shows the right club in words', async ({ page }) => {
	await serve(page);
	await page.goto('/games/guess-the-club');

	await wrongTiles(page).first().click();

	await expect(page.getByText(`Not this one. The hidden club was ${LONG_NAME}.`)).toBeVisible();
	await expect(page.getByText('not this one', { exact: true })).toBeVisible();
	await expect(page.getByText('right', { exact: true })).toBeVisible();
	await expect(page.getByRole('list', { name: 'Career' }).getByText(LONG_NAME)).toBeVisible();
	await expect(page.getByText('Right: 0')).toBeVisible();
	await expect(page.getByText(`${String(START_COINS)} coins`)).toBeVisible();
});

test('a double tap on the right club pays one answer', async ({ page }) => {
	await serve(page);
	await page.goto('/games/guess-the-club');

	await rightTile(page).dblclick();

	await expect(page.getByText('Right: 1')).toBeVisible();
	await expect(page.getByText(`${String(START_COINS + 1)} coins`)).toBeVisible();
});

test('a career that fails is left out of the round', async ({ page }) => {
	await serve(page, { a: 'not-found', b: 'not-found', c: 'bad-club', d: 'empty' });
	await page.goto('/games/guess-the-club');

	// The four players left make four questions.
	await expect(page.getByText('Question 1 of 4')).toBeVisible();
	await expect(page.getByText(/Name p-[a-d]’s career/)).toHaveCount(0);
});

test('with no player to ask about the game says it cannot start', async ({ page }) => {
	await serve(page, Object.fromEntries(IDS.map((id) => [id, 'short'])));
	await page.goto('/games/guess-the-club');

	await expect(page.getByRole('heading', { name: "The game can't start right now" })).toBeVisible();
	await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible();
	await expect(page.getByRole('link', { name: 'Back to games' })).toHaveAttribute('href', '/games');
});

for (const width of [320, 390]) {
	test(`a long club name fits at ${String(width)} pixels with no sideways scroll @engines`, async ({
		page
	}) => {
		await page.setViewportSize({ width, height: 700 });
		await serve(page);
		await page.goto('/games/guess-the-club');
		await rightTile(page).click();

		const overflow = await page.evaluate(
			() => document.documentElement.scrollWidth - document.documentElement.clientWidth
		);
		const box = await rightTile(page).boundingBox();

		expect(overflow).toBeLessThanOrEqual(0);
		expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(width);
		expect(box?.height).toBeGreaterThan(44);
	});
}
