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

test.describe('with 11 different cards', () => {
	test.beforeEach(async ({ page }) => {
		await savePlayer(page, IDS, { division: 'division-3', divisionWins: 2, wins: 5, losses: 1 });
		await page.goto('/match');
	});

	test('starts with 4-4-2 and All-out attack, and a Kick off that is ready', async ({ page }) => {
		await expect(page.getByRole('button', { name: '4-4-2' })).toHaveAttribute(
			'aria-pressed',
			'true'
		);
		await expect(page.getByRole('button', { name: 'All-out attack' })).toHaveAttribute(
			'aria-pressed',
			'true'
		);
		await expect(page.getByRole('button', { name: '4-3-3' })).toHaveAttribute(
			'aria-pressed',
			'false'
		);
		await expect(page.getByRole('button', { name: 'Kick off' })).toBeEnabled();
		await expect(page.getByText('Everyone is in their own position.')).toBeVisible();
		await expect(page.getByText('Name p-gk-1').first()).toBeVisible();
		await expect(page.getByText('Goalkeeper · 60')).toBeVisible();
	});

	test('changing the tactic moves the choice, the hint and the totals', async ({ page }) => {
		const before = await page.getByTestId('totals').textContent();

		await page.getByRole('button', { name: 'Park the bus' }).click();

		await expect(page.getByRole('button', { name: 'Park the bus' })).toHaveAttribute(
			'aria-pressed',
			'true'
		);
		await expect(page.getByRole('button', { name: 'All-out attack' })).toHaveAttribute(
			'aria-pressed',
			'false'
		);
		await expect(
			page.getByText(
				'Everyone behind the ball. Hard to score against. Beats Keep the ball. Loses to All-out attack.'
			)
		).toBeVisible();
		await expect(page.getByTestId('totals')).not.toHaveText(before ?? '');
	});

	test('a formation that does not suit a card marks it with a dashed outline and a label', async ({
		page
	}) => {
		await page.getByRole('button', { name: '3-5-2' }).click();

		await expect(page.getByRole('button', { name: '3-5-2' })).toHaveAttribute(
			'aria-pressed',
			'true'
		);
		await expect(
			page.getByText('1 player is out of position (dashed outline)', { exact: false })
		).toBeVisible();
		const marked = page.getByRole('listitem').filter({ hasText: 'out of position' });
		await expect(marked).toHaveCount(1);
		await expect(marked).toHaveCSS('outline-style', 'dashed');
	});

	test('the screen has no accessibility violation, with a card out of position', async ({
		page
	}) => {
		await page.getByRole('button', { name: '3-5-2' }).click();
		await page.evaluate(async () => document.fonts.ready);

		const results = await new AxeBuilder({ page }).analyze();

		expect(results.violations).toEqual([]);
	});
});
