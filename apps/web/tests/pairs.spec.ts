import { expect, test, type Page } from '@playwright/test';
import { createPlayerState, createRandom } from '@soccer-cards/game';
import { STATE_KEY } from '../src/lib/state/player-store.ts';

const RATINGS = { pace: 80, shooting: 70, passing: 60, dribbling: 75, defending: 40, physical: 65 };
const START_COINS = 10;
const SEED = 7;
const IDS = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const;
// Six pairs pay 3 coins, and 1 more for finishing in 12 turns or fewer.
const BOARD_COINS = 3 + 1;

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

/** Serves invented players, a saved player who owns the first `owned` of them, and a fixed seed. */
async function serve(page: Page, owned: number = IDS.length): Promise<void> {
	const players = IDS.map((id, place) => aSummary(id, place < 5 ? 'BASE' : 'RARE'));
	await page.route('**/api/v1/players.json', (route) => route.fulfill({ json: { players } }));
	await page.route('**/api/v1/clubs.json', (route) =>
		route.fulfill({ json: { clubs: [{ name: 'clubs/c0', displayName: 'Club Zero' }] } })
	);
	await page.route('**/api/v1/photos/**', (route) => route.fulfill({ status: 404 }));
	await page.addInitScript((seed) => {
		crypto.getRandomValues = ((array: Uint32Array) => {
			array[0] = seed;
			return array;
		}) as typeof crypto.getRandomValues;
	}, SEED);
	const state = {
		...createPlayerState(),
		coins: START_COINS,
		collection: Object.fromEntries(IDS.slice(0, owned).map((id) => [`p-${id}`, 1]))
	};
	await page.addInitScript(
		([key, text]) => {
			if (localStorage.getItem(key) === null) localStorage.setItem(key, text);
		},
		[STATE_KEY, JSON.stringify(state)] as const
	);
}

/** The player each place on a 6-pair board holds, dealt as the game deals it for the fixed seed. */
function dealtBoard(): string[] {
	const random = createRandom(SEED);
	const picked = random.sample(
		IDS.map((id) => `p-${id}`),
		6
	);
	return random.sample([...picked, ...picked], 12);
}

/** The places, counted from 1 as a screen reader says them, of each pair on the board. */
function pairPlaces(): [number, number][] {
	const board = dealtBoard();
	return [...new Set(board)].map((id) => [board.indexOf(id) + 1, board.lastIndexOf(id) + 1]);
}

const cardAt = (page: Page, place: number) =>
	page.getByRole('button', { name: `Face-down card ${String(place)}`, exact: true });

async function startSix(page: Page): Promise<void> {
	await page.goto('/games/pairs');
	await page.getByRole('button', { name: '6 pairs' }).click();
	await expect(page.getByText('Turns: 0')).toBeVisible();
}

test('a 6-pair board with the mouse pays coins and shows them in the masthead', async ({
	page
}) => {
	await serve(page);
	await startSix(page);

	for (const [first, second] of pairPlaces()) {
		await cardAt(page, first).click();
		await cardAt(page, second).click();
	}

	await expect(page.getByRole('heading', { name: 'All 6 pairs found!' })).toBeFocused();
	await expect(page.getByText('Turns: 6')).toBeVisible();
	await expect(page.getByText('Pairs: 6 of 6')).toBeVisible();
	await expect(page.getByText(`${String(START_COINS + BOARD_COINS)} coins`)).toBeVisible();
	await expect(page.getByRole('button', { name: 'Play again' })).toBeVisible();

	await page.reload();
	await expect(page.getByText(`${String(START_COINS + BOARD_COINS)} coins`)).toBeVisible();
});

/** Presses Tab, or Shift+Tab, once for each place between two cards, so focus walks the board. */
async function walkTo(page: Page, from: number, to: number): Promise<void> {
	const key = to > from ? 'Tab' : 'Shift+Tab';
	for (let step = Math.abs(to - from); step > 0; step--) await page.keyboard.press(key);
}

test('a board plays with the keyboard alone, reaching each card by Tab', async ({ page }) => {
	await serve(page);
	await page.goto('/games/pairs');
	await page.getByRole('button', { name: '6 pairs' }).focus();
	await page.keyboard.press('Enter');
	await page.getByRole('button', { name: 'Change board' }).focus();
	await page.keyboard.press('Tab');
	await expect(cardAt(page, 1)).toBeFocused();

	let at = 1;
	for (const [first, second] of pairPlaces()) {
		await walkTo(page, at, first);
		await expect(cardAt(page, first)).toBeFocused();
		await page.keyboard.press('Enter');
		await walkTo(page, first, second);
		await page.keyboard.press('Enter');
		at = second;
	}

	await expect(page.getByRole('heading', { name: 'All 6 pairs found!' })).toBeFocused();
	await expect(page.getByText(`${String(START_COINS + BOARD_COINS)} coins`)).toBeVisible();
});

test('two cards that differ turn back down and cost a turn', async ({ page }) => {
	await serve(page);
	await startSix(page);
	const first = pairPlaces()[0]?.[0] ?? 1;
	const second = pairPlaces()[1]?.[0] ?? 2;

	await cardAt(page, first).click();
	await cardAt(page, second).click();

	await expect(page.getByText('Not the same. Remember where they are.')).toBeVisible();
	await expect(page.getByText('Turns: 1')).toBeVisible();
	await expect(cardAt(page, first)).toBeVisible();
	await expect(cardAt(page, second)).toBeVisible();
	await expect(page.getByText('Pairs: 0 of 6')).toBeVisible();
	await expect(page.getByText('Turn a card.')).toBeVisible();
	await expect(page.getByText(`${String(START_COINS)} coins`)).toBeVisible();
});

test('a player with too few cards cannot pick a size', async ({ page }) => {
	await serve(page, 5);
	await page.goto('/games/pairs');

	await expect(page.getByRole('button', { name: '6 pairs' })).toBeDisabled();
	await expect(page.getByRole('button', { name: '8 pairs' })).toBeDisabled();
	await expect(page.getByRole('button', { name: '10 pairs' })).toBeDisabled();
	await expect(page.getByText('Collect 1 more different card to play this.')).toBeVisible();
});

test('with reduced motion a card turns up with no flip', async ({ page }) => {
	await page.emulateMedia({ reducedMotion: 'reduce' });
	await serve(page);
	await startSix(page);
	const first = pairPlaces()[0]?.[0] ?? 1;
	const inner = page.getByTestId(`turning-${String(first - 1)}`);
	// The sideways scale of the card: 1 faces the player, -1 shows its back.
	const facing = () =>
		inner.evaluate((node) => new DOMMatrix(getComputedStyle(node).transform).m11);
	expect(await facing()).toBe(-1);

	await cardAt(page, first).click();

	expect(await facing()).toBe(1);
	expect(await inner.evaluate((node) => node.getAnimations({ subtree: true }).length)).toBe(0);
});

for (const width of [320, 390]) {
	test(`a board fits at ${String(width)} pixels with no sideways scroll @engines`, async ({
		page
	}) => {
		await page.setViewportSize({ width, height: 700 });
		await serve(page);
		await startSix(page);

		const overflow = await page.evaluate(
			() => document.documentElement.scrollWidth - document.documentElement.clientWidth
		);
		const targets = await page.evaluate(() =>
			[...document.querySelectorAll('[data-testid^="slot-"] button')].map((tap) => {
				const box = tap.getBoundingClientRect();
				return Math.min(box.width, box.height);
			})
		);

		expect(overflow).toBeLessThanOrEqual(0);
		expect(targets).toHaveLength(12);
		expect(Math.min(...targets)).toBeGreaterThanOrEqual(44);
	});
}
