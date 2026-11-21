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
// One goalkeeper, four defenders, four midfielders and two forwards.
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

/** Serves an invented card set: the 11 of SQUAD. */
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

/** Saves this text as the player's state, before the page loads. */
async function saveText(page: Page, text: string): Promise<void> {
	await page.addInitScript(
		([key, value]) => {
			localStorage.setItem(key, value);
		},
		[STATE_KEY, text] as const
	);
}

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
	await saveText(page, JSON.stringify(state));
}

test.beforeEach(async ({ page }) => {
	await serveCards(page);
});

for (const colorScheme of ['light', 'dark'] as const) {
	test.describe(`with the system in ${colorScheme} mode`, () => {
		test.use({ colorScheme });

		const screens = [
			['the locked screen', IDS.slice(0, 10), 'You have 10.'],
			['the pick screen with 11 different cards', IDS, 'Wins 0 · Losses 0']
		] as const;

		for (const [name, ids, waitFor] of screens) {
			test(`/match shows ${name} with no accessibility violation`, async ({ page }) => {
				await savePlayer(page, ids);
				await page.goto('/match');
				await expect(page.getByText(waitFor)).toBeVisible();
				await page.evaluate(async () => document.fonts.ready);

				const results = await new AxeBuilder({ page }).exclude('[data-art]').analyze();

				expect(results.violations).toEqual([]);
				expect(results.incomplete.filter((check) => check.id === 'color-contrast')).toEqual([]);
			});
		}
	});
}

test('names the top division for a player in Champions League', async ({ page }) => {
	await savePlayer(page, IDS, { division: 'champions-league' });

	await page.goto('/match');

	await expect(page.getByText('Champions League · top division')).toBeVisible();
});

test('says the game starts again and shows the locked screen for corrupt saved state', async ({
	page
}) => {
	await saveText(page, '{coins:');

	await page.goto('/match');

	await expect(
		page.getByText("We couldn't use your saved cards, so the game starts again.")
	).toBeVisible();
	await expect(
		page.getByText('You need 11 different players for a match. You have 0.')
	).toBeVisible();
});
