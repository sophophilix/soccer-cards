import { AxeBuilder } from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { createPlayerState } from '@soccer-cards/game';
import { STATE_KEY } from '../src/lib/state/player-store.ts';

const OUTFIELD_RATINGS = {
	pace: 80,
	shooting: 70,
	passing: 60,
	dribbling: 75,
	defending: 40,
	physical: 65
};
// The player's 11, a 4-4-2 with nobody out of position, then one card of each lucky tier so the
// computer's side can be fielded.
const SQUAD = [
	['GOALKEEPER', 'gk', 1, 'BASE'],
	['DEFENDER', 'df', 4, 'BASE'],
	['MIDFIELDER', 'mf', 4, 'BASE'],
	['FORWARD', 'fw', 2, 'BASE'],
	['FORWARD', 'rare', 1, 'RARE'],
	['MIDFIELDER', 'legend', 1, 'LEGEND'],
	['GOALKEEPER', 'icon', 1, 'ICON']
] as const;
const OWNED = SQUAD.filter(([, , , tier]) => tier === 'BASE').flatMap(([, code, count]) =>
	Array.from({ length: count }, (_, index) => `p-${code}-${String(index + 1)}`)
);

function aSummary(position: string, id: string, tier: string): unknown {
	return {
		name: `players/${id}`,
		displayName: `Name ${id}`,
		state: 'ACTIVE',
		club: 'clubs/test-club',
		nationalTeamCode: 'ENG',
		position,
		tier,
		cardNumber: 70,
		outfieldRatings: OUTFIELD_RATINGS,
		playStats: { attack: 70, defence: 60, control: 65, overall: 70 }
	};
}

async function serveCards(page: Page): Promise<void> {
	const players = SQUAD.flatMap(([position, code, count, tier]) =>
		Array.from({ length: count }, (_, index) =>
			aSummary(position, `p-${code}-${String(index + 1)}`, tier)
		)
	);
	const club = { name: 'clubs/test-club', displayName: 'Test Club' };
	await page.route('**/api/v1/players.json', (route) => route.fulfill({ json: { players } }));
	await page.route('**/api/v1/clubs.json', (route) => route.fulfill({ json: { clubs: [club] } }));
}

/** Makes the match's random seed this number, so the match is the same every run. */
async function fixSeed(page: Page, seed: number): Promise<void> {
	await page.addInitScript((value) => {
		crypto.getRandomValues = ((array: Uint32Array) => {
			array[0] = value;
			return array;
		}) as typeof crypto.getRandomValues;
	}, seed);
}

async function savePlayer(page: Page, changes: Record<string, unknown> = {}): Promise<void> {
	const state = {
		...createPlayerState(),
		collection: Object.fromEntries(OWNED.map((id) => [id, 1])),
		...changes
	};
	await page.addInitScript(
		([key, text]) => {
			if (localStorage.getItem(key) === null) localStorage.setItem(key, text);
		},
		[STATE_KEY, JSON.stringify(state)] as const
	);
}

async function openPick(page: Page, seed: number, changes: Record<string, unknown> = {}) {
	await serveCards(page);
	await fixSeed(page, seed);
	await savePlayer(page, { coins: 0, ...changes });
	await page.goto('/match');
}

async function kickOff(page: Page, seed: number, changes: Record<string, unknown> = {}) {
	await openPick(page, seed, changes);
	await page.getByRole('button', { name: 'Kick off' }).click();
}

const skip = (page: Page) => page.getByRole('button', { name: 'Skip to full time' }).click();
const commentary = (page: Page) =>
	page.getByRole('list', { name: 'Commentary' }).getByRole('listitem');

/** The player's saved state, read back. */
async function savedState(page: Page): Promise<{ coins: number; wins: number; losses: number }> {
	const text = await page.evaluate((key) => localStorage.getItem(key), STATE_KEY);
	const parsed: unknown = JSON.parse(text ?? '{}');
	return parsed as { coins: number; wins: number; losses: number };
}

// Seeds that give a win, a loss and a draw with this card set.
const WIN_SEED = 1;
const LOSS_SEED = 3;
const DRAW_SEED = 18;

test('Kick off opens the stage with the board, the plans and both teams', async ({ page }) => {
	await kickOff(page, WIN_SEED);

	await expect(page.getByTestId('clock')).toBeVisible();
	await expect(page.getByText('You: 4-4-2 · All-out attack')).toBeVisible();
	await expect(page.getByText(/^AI: \d-\d-\d · /)).toBeVisible();
	await expect(page.getByRole('heading', { name: 'Your team' })).toBeVisible();
	await expect(page.getByRole('heading', { name: 'AI team' })).toBeVisible();
	await expect(page.getByText('Kick-off!')).toBeVisible();
});

test('at normal speed the moments show one at a time', async ({ page }) => {
	await kickOff(page, WIN_SEED);

	await expect(commentary(page)).toHaveCount(2);
	await expect(commentary(page)).toHaveCount(3);
	await expect(page.getByTestId('clock')).not.toHaveText('FT');
});

test('with reduced motion the match plays itself out in about a second', async ({ page }) => {
	await page.emulateMedia({ reducedMotion: 'reduce' });
	await kickOff(page, WIN_SEED);

	await expect(page.getByTestId('clock')).toHaveText('FT', { timeout: 3000 });
	await expect(page.getByRole('heading', { name: 'You win!' })).toBeVisible();
});

test('a win skipped to full time saves the coins and the record, read back after a reload', async ({
	page
}) => {
	await kickOff(page, WIN_SEED, { division: 'division-3' });

	await skip(page);

	await expect(page.getByRole('heading', { name: 'You win!' })).toBeVisible();
	await expect(page.getByTestId('clock')).toHaveText('FT');
	await expect(page.getByRole('link', { name: 'Open a pack' })).toBeVisible();
	await page.reload();
	await expect(page.getByText('Wins 1 · Losses 0')).toBeVisible();
	const saved = await savedState(page);
	expect(saved.wins).toBe(1);
	expect(saved.coins).toBeGreaterThanOrEqual(5);
});

test('a loss counts and earns no coins', async ({ page }) => {
	await kickOff(page, LOSS_SEED);

	await skip(page);

	await expect(page.getByRole('heading', { name: 'The AI wins' })).toBeVisible();
	await expect(page.getByText('Try another formation or tactic')).toBeVisible();
	await expect(page.getByRole('link', { name: 'Open a pack' })).toHaveCount(0);
	const saved = await savedState(page);
	expect(saved.losses).toBe(1);
	expect(saved.coins).toBe(0);
});

test('a level match stops at full time with the penalties line and saves nothing', async ({
	page
}) => {
	await kickOff(page, DRAW_SEED);

	await skip(page);

	await expect(page.getByText('It is level, so it goes to penalties!')).toBeVisible();
	await expect(page.getByTestId('clock')).toHaveText('FT');
	const saved = await savedState(page);
	expect(saved.wins + saved.losses).toBe(0);
});

test('leaving the match before full time saves nothing', async ({ page }) => {
	await kickOff(page, WIN_SEED);
	await expect(commentary(page)).toHaveCount(2);

	await page.reload();

	await expect(page.getByRole('button', { name: 'Kick off' })).toBeVisible();
	const saved = await savedState(page);
	expect(saved.wins + saved.losses).toBe(0);
});

test('Play again goes back to the pick screen with the same 11', async ({ page }) => {
	await kickOff(page, LOSS_SEED);
	await skip(page);

	await page.getByRole('button', { name: 'Play again' }).click();

	await expect(page.getByText('11 of 11 picked')).toBeVisible();
	await expect(page.getByRole('button', { name: 'Kick off' })).toBeEnabled();
});

test('the stage at full time has no accessibility violation', async ({ page }) => {
	await kickOff(page, WIN_SEED);
	await skip(page);
	await expect(page.getByRole('heading', { name: 'You win!' })).toBeVisible();
	await page.evaluate(async () => document.fonts.ready);

	const results = await new AxeBuilder({ page }).exclude('[data-art]').analyze();

	expect(results.violations).toEqual([]);
});

test('a new moment leaves the older commentary lines as they were', async ({ page }) => {
	await kickOff(page, WIN_SEED);
	await expect(commentary(page)).toHaveCount(2);
	const before = await commentary(page).allTextContents();

	await expect(commentary(page)).toHaveCount(3);

	const after = await commentary(page).allTextContents();
	expect(after.slice(1)).toEqual(before);
});
