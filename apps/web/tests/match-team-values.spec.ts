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

interface Invented {
	readonly position: string;
	readonly id: string;
	readonly attack: number;
	readonly defence: number;
	readonly control: number;
}

const aDefender = (n: number): Invented => ({
	position: 'DEFENDER',
	id: `p-df-${String(n)}`,
	attack: 10,
	defence: 50,
	control: 10
});
const aMidfielder = (n: number): Invented => ({
	position: 'MIDFIELDER',
	id: `p-mf-${String(n)}`,
	attack: 10,
	defence: 10,
	control: 60
});

// A 4-4-2 with nobody out. Forwards attack 60 and 61, midfielders control 60, defenders and
// the goalkeeper defence 50.
const STARTERS: readonly Invented[] = [
	{ position: 'GOALKEEPER', id: 'p-gk-1', attack: 10, defence: 50, control: 10 },
	...[1, 2, 3, 4].map(aDefender),
	...[1, 2, 3, 4].map(aMidfielder),
	{ position: 'FORWARD', id: 'p-fw-1', attack: 60, defence: 10, control: 10 },
	{ position: 'FORWARD', id: 'p-fw-2', attack: 61, defence: 10, control: 10 }
];
// Worse than a starter in every line, so a 4-4-2 leaves each of them out.
const EXTRAS: readonly Invented[] = [
	{ position: 'GOALKEEPER', id: 'x-gk', attack: 5, defence: 5, control: 5 },
	{ position: 'DEFENDER', id: 'x-df', attack: 5, defence: 5, control: 5 },
	{ position: 'MIDFIELDER', id: 'x-mf', attack: 5, defence: 5, control: 5 },
	{ position: 'FORWARD', id: 'x-fw', attack: 5, defence: 5, control: 5 }
];

function aSummary(card: Invented): unknown {
	return {
		name: `players/${card.id}`,
		displayName: `Name ${card.id}`,
		state: 'ACTIVE',
		club: 'clubs/test-club',
		nationalTeamCode: 'ENG',
		position: card.position,
		tier: 'BASE',
		cardNumber: 1,
		outfieldRatings: OUTFIELD_RATINGS,
		playStats: {
			attack: card.attack,
			defence: card.defence,
			control: card.control,
			overall: Math.max(card.attack, card.defence, card.control)
		}
	};
}

/** Serves these invented cards and saves a player who owns each once, before the page loads. */
async function startWith(page: Page, cards: readonly Invented[]): Promise<void> {
	const players = cards.map(aSummary);
	const club = { name: 'clubs/test-club', displayName: 'Test Club' };
	await page.route('**/api/v1/players.json', (route) => route.fulfill({ json: { players } }));
	await page.route('**/api/v1/clubs.json', (route) => route.fulfill({ json: { clubs: [club] } }));
	const state = {
		...createPlayerState(),
		collection: Object.fromEntries(cards.map((card) => [card.id, 1]))
	};
	await page.addInitScript(
		([key, text]) => {
			localStorage.setItem(key, text);
		},
		[STATE_KEY, JSON.stringify(state)] as const
	);
	await page.goto('/match');
}

test.describe('with exactly 11 cards', () => {
	test.beforeEach(async ({ page }) => {
		await startWith(page, STARTERS);
	});

	test('4-4-2 with All-out attack shows ATT 67, MID 60, DEF 45 and GK 50', async ({ page }) => {
		// 60.5 x 1.1 = 66.55, 60 x 1, 50 x 0.9, and the goalkeeper is not changed by the tactic.
		await expect(page.getByTestId('totals')).toHaveText('ATT 67 · MID 60 · DEF 45 · GK 50');
	});

	test('4-4-2 with Park the bus shows ATT 53, MID 60, DEF 56 and GK 50', async ({ page }) => {
		await page.getByRole('button', { name: 'Park the bus' }).click();

		// 60.5 x 0.88 = 53.24, 60 x 1, 50 x 1.12.
		await expect(page.getByTestId('totals')).toHaveText('ATT 53 · MID 60 · DEF 56 · GK 50');
	});
});

test.describe('with more than 11 cards', () => {
	test.beforeEach(async ({ page }) => {
		await startWith(page, [...STARTERS, ...EXTRAS]);
	});

	test('shows the 11 that bestTeam picks and not the others', async ({ page }) => {
		// Every owned card is also in "Your players", so look only in the line-up.
		const lineUp = page.getByTestId('lineup');
		for (const card of STARTERS) {
			await expect(lineUp.getByText(`Name ${card.id}`, { exact: true })).toBeVisible();
		}
		for (const card of EXTRAS) {
			await expect(lineUp.getByText(`Name ${card.id}`, { exact: true })).toHaveCount(0);
		}
		await expect(page.getByTestId('totals')).toHaveText('ATT 67 · MID 60 · DEF 45 · GK 50');
	});
});
