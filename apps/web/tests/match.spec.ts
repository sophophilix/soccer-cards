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
// One goalkeeper, four defenders, four midfielders and two forwards: a 4-4-2 with nobody out.
const SQUAD = [
	['GOALKEEPER', 'gk', 1],
	['DEFENDER', 'df', 4],
	['MIDFIELDER', 'mf', 4],
	['FORWARD', 'fw', 2]
] as const;
const IDS = SQUAD.flatMap(([, code, count]) =>
	Array.from({ length: count }, (_, index) => `p-${code}-${String(index + 1)}`)
);

function aSummary(position: string, id: string, overall: number): unknown {
	return {
		name: `players/${id}`,
		displayName: `Name ${id}`,
		state: 'ACTIVE',
		club: 'clubs/test-club',
		nationalTeamCode: 'ENG',
		position,
		tier: 'BASE',
		cardNumber: overall,
		outfieldRatings: OUTFIELD_RATINGS,
		playStats: { attack: overall, defence: 50, control: 60, overall }
	};
}

/** Serves an invented card set: the 11 of SQUAD, so every owned card is in it. */
async function serveCards(page: Page): Promise<void> {
	const players = SQUAD.flatMap(([position, code, count]) =>
		Array.from({ length: count }, (_, index) =>
			aSummary(position, `p-${code}-${String(index + 1)}`, 60 + index)
		)
	);
	const club = { name: 'clubs/test-club', displayName: 'Test Club' };
	await page.route('**/api/v1/players.json', (route) => route.fulfill({ json: { players } }));
	await page.route('**/api/v1/clubs.json', (route) => route.fulfill({ json: { clubs: [club] } }));
}

/** Saves a player who holds each of these cards once, before the page loads. */
async function savePlayer(
	page: Page,
	ids: readonly string[],
	changes: Record<string, unknown> = {}
): Promise<void> {
	const state = {
		...createPlayerState(),
		collection: Object.fromEntries(ids.map((id) => [id, 1])),
		...changes
	};
	await page.addInitScript(
		([key, text]) => {
			localStorage.setItem(key, text);
		},
		[STATE_KEY, JSON.stringify(state)] as const
	);
}

test.beforeEach(async ({ page }) => {
	await serveCards(page);
});

test('is locked with no cards, and offers the free packs', async ({ page }) => {
	await page.goto('/match');

	await expect(
		page.getByText('You need 11 different players for a match. You have 0.')
	).toBeVisible();
	await expect(page.getByText('Open your free packs first.')).toBeVisible();
	await expect(page.getByRole('link', { name: 'Open packs' })).toHaveAttribute('href', /packs$/);
});

test('is locked with 10 cards and suggests trading doubles when no pack is free', async ({
	page
}) => {
	await savePlayer(page, IDS.slice(0, 10), { freePacks: 0, coins: 0 });

	await page.goto('/match');

	await expect(
		page.getByText('You need 11 different players for a match. You have 10.')
	).toBeVisible();
	await expect(page.getByText('Trade your doubles to find new players.')).toBeVisible();
	await expect(page.getByRole('link', { name: 'Go to packs' })).toBeVisible();
});

test('does not count a saved card the card set no longer has', async ({ page }) => {
	await savePlayer(page, [...IDS.slice(0, 10), 'gone-player']);

	await page.goto('/match');

	await expect(page.getByText('You have 10.')).toBeVisible();
});

test.describe('with 11 different cards', () => {
	test.beforeEach(async ({ page }) => {
		await savePlayer(page, IDS, { division: 'division-3', divisionWins: 2, wins: 5, losses: 1 });
		await page.goto('/match');
	});

	test('shows the division, the AI and the record', async ({ page }) => {
		await expect(page.getByText('Division 3 · 2 of 3 wins to go up')).toBeVisible();
		await expect(page.getByText('The AI opens 6 packs · win 5 coins')).toBeVisible();
		await expect(page.getByText('Wins 5 · Losses 1')).toBeVisible();
	});
});

test('says so when the cards cannot be loaded, and loads them on a retry', async ({ page }) => {
	await page.unroute('**/api/v1/players.json');
	await page.route('**/api/v1/players.json', (route) => route.abort());

	await page.goto('/match');

	await expect(page.getByText("We can't get the cards right now.")).toBeVisible();
	await page.unroute('**/api/v1/players.json');
	await serveCards(page);
	await page.getByRole('button', { name: 'Try again' }).click();
	await expect(page.getByText('You need 11 different players')).toBeVisible();
});

test('still works and says progress is not saved when storage is unavailable', async ({ page }) => {
	await page.addInitScript(() => {
		Object.defineProperty(window, 'localStorage', {
			get: () => {
				throw new Error('blocked');
			}
		});
	});

	await page.goto('/match');

	await expect(page.getByText("Your progress can't be saved on this device.")).toBeVisible();
	await expect(page.getByText('You need 11 different players')).toBeVisible();
});
