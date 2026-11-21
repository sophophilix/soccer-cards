import { expect, test, type Page } from '@playwright/test';
import { createPlayerState } from '@soccer-cards/game';
import { STATE_KEY } from '../src/lib/state/player-store.ts';

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
// A seed that draws with this card set.
const DRAW_SEED = 18;
const RATINGS = { pace: 80, shooting: 70, passing: 60, dribbling: 75, defending: 40, physical: 65 };

async function serveCards(page: Page): Promise<void> {
	const players = SQUAD.flatMap(([position, code, count, tier]) =>
		Array.from({ length: count }, (_, index) => ({
			name: `players/p-${code}-${String(index + 1)}`,
			displayName: `Name p-${code}-${String(index + 1)}`,
			state: 'ACTIVE',
			club: 'clubs/test-club',
			nationalTeamCode: 'ENG',
			position,
			tier,
			cardNumber: 70,
			outfieldRatings: RATINGS,
			playStats: { attack: 70, defence: 60, control: 65, overall: 70 }
		}))
	);
	const club = { name: 'clubs/test-club', displayName: 'Test Club' };
	await page.route('**/api/v1/players.json', (route) => route.fulfill({ json: { players } }));
	await page.route('**/api/v1/clubs.json', (route) => route.fulfill({ json: { clubs: [club] } }));
}

async function startShootOut(page: Page): Promise<void> {
	await serveCards(page);
	await page.addInitScript((value) => {
		crypto.getRandomValues = ((array: Uint32Array) => {
			array[0] = value;
			return array;
		}) as typeof crypto.getRandomValues;
	}, DRAW_SEED);
	const state = {
		...createPlayerState(),
		collection: Object.fromEntries(OWNED.map((id) => [id, 1])),
		coins: 0
	};
	await page.addInitScript(
		([key, text]) => {
			if (localStorage.getItem(key) === null) localStorage.setItem(key, text);
		},
		[STATE_KEY, JSON.stringify(state)] as const
	);
	await page.goto('/match');
	await page.getByRole('button', { name: 'Kick off' }).click();
	await page.getByRole('button', { name: 'Skip to full time' }).click();
}

const corner = (page: Page, name: 'Left' | 'Middle' | 'Right') =>
	page.getByRole('button', { name });
const kickLines = (page: Page) =>
	page
		.getByRole('list', { name: 'Commentary' })
		.getByRole('listitem')
		.filter({ hasText: /^(You|They) shoot / });
const result = (page: Page) => page.getByRole('heading', { name: /^(You win!|The AI wins)$/ });

async function savedCount(page: Page): Promise<number> {
	const text = await page.evaluate((key) => localStorage.getItem(key), STATE_KEY);
	const saved = JSON.parse(text ?? '{}') as { wins: number; losses: number };
	return saved.wins + saved.losses;
}

/** Takes every kick, waiting for each to clear, until the result shows. */
async function shootUntilOver(page: Page): Promise<void> {
	await expect(async () => {
		if (await result(page).isVisible()) return;
		await corner(page, 'Left').click({ timeout: 500 });
		throw new Error('still kicking');
	}).toPass({ timeout: 30_000, intervals: [100] });
}

test('a draw shows the shoot-out panel with the first question and three corners', async ({
	page
}) => {
	await startShootOut(page);

	await expect(page.getByRole('heading', { name: 'Penalty shoot-out' })).toBeVisible();
	await expect(page.getByTestId('pens-score')).toHaveText('0 – 0');
	await expect(page.getByText('Your kick. Pick where to shoot.')).toBeVisible();
	await expect(corner(page, 'Middle')).toBeEnabled();
	await expect(corner(page, 'Right')).toBeEnabled();
});

test('a kick adds a commentary line, disables the corners while shown, then asks for the dive', async ({
	page
}) => {
	await startShootOut(page);

	await corner(page, 'Left').click();

	await expect(kickLines(page)).toHaveCount(1);
	await expect(kickLines(page).first()).toContainText(/^You shoot left, the keeper goes /);
	await expect(corner(page, 'Left')).toBeDisabled();
	await expect(page.getByText('Their kick. Pick where your keeper dives.')).toBeVisible();
	await expect(corner(page, 'Left')).toBeEnabled();
});

test('a double tap on a corner takes one kick', async ({ page }) => {
	await startShootOut(page);

	await corner(page, 'Middle').dblclick();

	await expect(kickLines(page)).toHaveCount(1);
});

test('the shoot-out ends with the penalties score, saved once, and the corners stay disabled', async ({
	page
}) => {
	await startShootOut(page);

	await shootUntilOver(page);

	await expect(page.getByText(/\d – \d \(\d – \d on penalties\)\./)).toBeVisible();
	await expect(corner(page, 'Left')).toBeDisabled();
	await expect(corner(page, 'Middle')).toBeDisabled();
	await expect(corner(page, 'Right')).toBeDisabled();
	await expect(page.getByRole('button', { name: 'Play again' })).toBeVisible();
	expect(await savedCount(page)).toBe(1);
});

test('reloading during the shoot-out saves nothing', async ({ page }) => {
	await startShootOut(page);
	await corner(page, 'Left').click();
	await expect(kickLines(page)).toHaveCount(1);

	await page.reload();

	await expect(page.getByRole('button', { name: 'Kick off' })).toBeVisible();
	expect(await savedCount(page)).toBe(0);
});
