import { expect, test, type Page } from '@playwright/test';
import { createPlayerState } from '@soccer-cards/game';
import { STATE_KEY } from '../src/lib/state/player-store.ts';

const RATINGS = { pace: 80, shooting: 70, passing: 60, dribbling: 75, defending: 40, physical: 65 };
// The player's 11, then one card of each lucky tier so the computer's side can be fielded.
const SQUAD = [
	['GOALKEEPER', 'gk', 1, 'BASE'],
	['DEFENDER', 'df', 4, 'BASE'],
	['MIDFIELDER', 'mf', 4, 'BASE'],
	['FORWARD', 'fw', 2, 'BASE'],
	['FORWARD', 'rare', 1, 'RARE'],
	['MIDFIELDER', 'legend', 1, 'LEGEND'],
	['GOALKEEPER', 'icon', 1, 'ICON']
] as const;
const cardIds = (code: string, count: number): string[] =>
	Array.from({ length: count }, (_, index) => `p-${code}-${String(index + 1)}`);
// Seeds that win and draw with this card set.
const WIN_SEED = 1;
const DRAW_SEED = 18;

/** Serves the squad, fixes the match's seed, and saves a player who owns 11. */
async function openPick(page: Page, seed: number): Promise<void> {
	const players = SQUAD.flatMap(([position, code, count, tier]) =>
		cardIds(code, count).map((id) => ({
			name: `players/${id}`,
			displayName: `Name ${id}`,
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
	const owned = SQUAD.filter(([, , , tier]) => tier === 'BASE').flatMap(([, code, count]) =>
		cardIds(code, count)
	);
	const state = {
		...createPlayerState(),
		collection: Object.fromEntries(owned.map((id) => [id, 1])),
		coins: 0
	};
	await page.addInitScript(
		([key, text, value]) => {
			crypto.getRandomValues = ((array: Uint32Array) => {
				array[0] = value;
				return array;
			}) as typeof crypto.getRandomValues;
			if (localStorage.getItem(key) === null) localStorage.setItem(key, text);
		},
		[STATE_KEY, JSON.stringify(state), seed] as const
	);
	await page.goto('/match');
}

const kickOff = (page: Page) => page.getByRole('button', { name: 'Kick off' }).click();
const skip = (page: Page) => page.getByRole('button', { name: 'Skip to full time' }).click();
const result = (page: Page) => page.getByRole('heading', { name: /^(You win!|The AI wins)$/ });

test('says the game is open in another tab, shows the result and writes nothing', async ({
	page
}) => {
	await openPick(page, WIN_SEED);
	await kickOff(page);
	const other = JSON.stringify({ ...createPlayerState(), coins: 7 });
	await page.evaluate(
		([key, text]) => {
			localStorage.setItem(key, text);
		},
		[STATE_KEY, other] as const
	);

	await skip(page);

	await expect(result(page)).toBeVisible();
	await expect(
		page.getByText('The game is open in another tab, so your result was not saved here.')
	).toBeVisible();
	expect(await page.evaluate((key) => localStorage.getItem(key), STATE_KEY)).toBe(other);
});

test('names the score board, and after Skip to full time focus moves to the result', async ({
	page
}) => {
	await openPick(page, WIN_SEED);
	await kickOff(page);
	await expect(page.getByRole('group', { name: 'Score and clock' })).toBeVisible();

	await skip(page);

	await expect(result(page)).toBeFocused();
});

test('in a shoot-out, focus stays on a corner button through a kick, then moves to the result', async ({
	page
}) => {
	await openPick(page, DRAW_SEED);
	await kickOff(page);
	await skip(page);
	const left = page.getByRole('button', { name: 'Left' });
	await expect(left).toBeFocused();

	// The keyboard, because WebKit does not focus a button that is clicked.
	await page.keyboard.press('Enter');

	await expect(left).toBeFocused();
	await expect(left).toHaveAttribute('aria-disabled', 'true');
	await expect(async () => {
		if (await result(page).isVisible()) return;
		await left.click({ timeout: 500 });
		throw new Error('still kicking');
	}).toPass({ timeout: 30_000, intervals: [100] });
	await expect(result(page)).toBeFocused();
});
