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
// A 4-4-2 and two spares: 13 players, so the player has two to leave out.
const SQUAD = [
	['GOALKEEPER', 'gk', 1],
	['DEFENDER', 'df', 4],
	['MIDFIELDER', 'mf', 5],
	['FORWARD', 'fw', 3]
] as const;
const IDS = SQUAD.flatMap(([, code, count]) =>
	Array.from({ length: count }, (_, index) => `p-${code}-${String(index + 1)}`)
);
const FULL = 'You already have 11. Take one out first.';

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

/** Serves an invented card set: the 13 of SQUAD, rated 61 up to 65 within a position. */
async function serveCards(page: Page): Promise<void> {
	const players = SQUAD.flatMap(([position, code, count]) =>
		Array.from({ length: count }, (_, index) =>
			aSummary(position, `p-${code}-${String(index + 1)}`, 61 + index)
		)
	);
	const club = { name: 'clubs/test-club', displayName: 'Test Club' };
	await page.route('**/api/v1/players.json', (route) => route.fulfill({ json: { players } }));
	await page.route('**/api/v1/clubs.json', (route) => route.fulfill({ json: { clubs: [club] } }));
}

async function savePlayer(page: Page): Promise<void> {
	const state = {
		...createPlayerState(),
		collection: Object.fromEntries(IDS.map((id) => [id, 1]))
	};
	await page.addInitScript(
		([key, text]) => {
			localStorage.setItem(key, text);
		},
		[STATE_KEY, JSON.stringify(state)] as const
	);
}

const pick = (page: Page, id: string) =>
	page.getByRole('button', { name: new RegExp(`^(Pick|Take out) Name ${id},`) });

test.beforeEach(async ({ page }) => {
	await serveCards(page);
	await savePlayer(page);
	await page.goto('/match');
});

test('lists every player once, by line then highest rating', async ({ page }) => {
	const buttons = page.getByRole('button', { name: /^(Pick|Take out) Name /, exact: false });

	const names = (): Promise<string[]> =>
		buttons.evaluateAll((all) =>
			all.map((each) => (each.getAttribute('aria-label') ?? '').replace(/^(Pick|Take out) /, ''))
		);

	await expect
		.poll(names)
		.toEqual([
			'Name p-fw-3, Forward, rating 63',
			'Name p-fw-2, Forward, rating 62',
			'Name p-fw-1, Forward, rating 61',
			'Name p-mf-5, Midfielder, rating 65',
			'Name p-mf-4, Midfielder, rating 64',
			'Name p-mf-3, Midfielder, rating 63',
			'Name p-mf-2, Midfielder, rating 62',
			'Name p-mf-1, Midfielder, rating 61',
			'Name p-df-4, Defender, rating 64',
			'Name p-df-3, Defender, rating 63',
			'Name p-df-2, Defender, rating 62',
			'Name p-df-1, Defender, rating 61',
			'Name p-gk-1, Goalkeeper, rating 61'
		]);
});

test('starts with the best 11 and a Kick off that is ready', async ({ page }) => {
	await expect(page.getByText('11 of 11 picked')).toBeVisible();
	await expect(page.getByRole('button', { name: 'Kick off' })).toBeEnabled();
	await expect(pick(page, 'p-df-1')).toHaveAttribute('aria-pressed', 'true');
	await expect(pick(page, 'p-mf-5')).toHaveAttribute('aria-pressed', 'false');
});

test('taking a player out and putting them back changes the count and Kick off', async ({
	page
}) => {
	const forwards = page.getByTestId('line-FW');
	await expect(forwards).toContainText('Name p-fw-3');

	await pick(page, 'p-fw-3').click();

	await expect(page.getByText('10 of 11 picked')).toBeVisible();
	await expect(forwards).not.toContainText('Name p-fw-3');
	await expect(pick(page, 'p-fw-3')).toHaveAccessibleName('Pick Name p-fw-3, Forward, rating 63');
	await expect(pick(page, 'p-fw-3')).toHaveAttribute('aria-pressed', 'false');
	await expect(page.getByRole('button', { name: 'Kick off' })).toBeDisabled();
	await expect(page.getByText('Tap players below to fill the team.')).toBeVisible();

	await pick(page, 'p-fw-3').click();

	await expect(page.getByText('11 of 11 picked')).toBeVisible();
	await expect(forwards).toContainText('Name p-fw-3');
	await expect(page.getByRole('button', { name: 'Kick off' })).toBeEnabled();
});

test('a twelfth player changes nothing and says why in a live region', async ({ page }) => {
	await pick(page, 'p-mf-5').click();

	await expect(page.getByText('11 of 11 picked')).toBeVisible();
	await expect(pick(page, 'p-mf-5')).toHaveAttribute('aria-pressed', 'false');
	await expect(page.getByRole('status')).toHaveText(FULL);
});

test('a double tap on an unpicked player with room leaves them out, never twice in', async ({
	page
}) => {
	await pick(page, 'p-fw-3').click();
	await expect(page.getByText('10 of 11 picked')).toBeVisible();

	// Two taps on the same button. A real double click can miss the second time on WebKit,
	// because the hint above the list changes height after the first tap.
	await pick(page, 'p-mf-5').dispatchEvent('click');
	await pick(page, 'p-mf-5').dispatchEvent('click');

	await expect(page.getByText('10 of 11 picked')).toBeVisible();
	await expect(pick(page, 'p-mf-5')).toHaveAttribute('aria-pressed', 'false');
});

test('Clear empties the team and Pick my best team fills it again', async ({ page }) => {
	await page.getByRole('button', { name: 'Clear' }).click();

	await expect(page.getByText('0 of 11 picked')).toBeVisible();
	await expect(page.getByText('Tap players below to fill the team.')).toBeVisible();
	await expect(page.getByRole('button', { name: 'Kick off' })).toBeDisabled();

	await pick(page, 'p-mf-5').click();
	await page.getByRole('button', { name: 'Pick my best team' }).click();

	await expect(page.getByText('11 of 11 picked')).toBeVisible();
	await expect(pick(page, 'p-mf-5')).toHaveAttribute('aria-pressed', 'false');
	await expect(page.getByRole('button', { name: 'Kick off' })).toBeEnabled();
});

for (const colorScheme of ['light', 'dark'] as const) {
	test.describe(`with the system in ${colorScheme} mode`, () => {
		test.use({ colorScheme });

		test('the screen has no accessibility violation after Clear', async ({ page }) => {
			await page.getByRole('button', { name: 'Clear' }).click();
			await expect(page.getByText('0 of 11 picked')).toBeVisible();
			await page.evaluate(async () => document.fonts.ready);

			const results = await new AxeBuilder({ page }).exclude('[data-art]').analyze();

			expect(results.violations).toEqual([]);
			expect(results.incomplete.filter((check) => check.id === 'color-contrast')).toEqual([]);
		});
	});
}

test('a new formation keeps the picked players', async ({ page }) => {
	await pick(page, 'p-fw-3').click();
	await pick(page, 'p-mf-5').click();

	await page.getByRole('button', { name: '4-3-3' }).click();

	await expect(page.getByText('11 of 11 picked')).toBeVisible();
	await expect(pick(page, 'p-mf-5')).toHaveAttribute('aria-pressed', 'true');
	await expect(pick(page, 'p-fw-3')).toHaveAttribute('aria-pressed', 'false');
});
