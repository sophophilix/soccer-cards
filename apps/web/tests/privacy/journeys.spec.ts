import { expect, test, type Page } from '@playwright/test';
import { createPlayerState } from '@soccer-cards/game';
import { STATE_KEY } from '../../src/lib/state/player-store.ts';

const OUTFIELD_RATINGS = {
	pace: 80,
	shooting: 70,
	passing: 60,
	dribbling: 75,
	defending: 40,
	physical: 65
};
// A 4-4-2 for the player, then one card of each lucky tier so the pack and the computer's side work.
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
const WIN_SEED = 1;

// A card shows its back only with a photo to credit, so one card has an invented photo.
const PHOTO = {
	uri: 'photos/test-photo.webp',
	widthPx: 600,
	heightPx: 800,
	mimeType: 'image/webp',
	attribution: {
		author: 'Test Author',
		licenseCode: 'CC0-1.0',
		sourceUri: 'https://commons.wikimedia.org/wiki/File:Test_photo.jpg'
	}
};

function aSummary(position: string, id: string, tier: string): unknown {
	return {
		...(id === 'p-fw-1' && { photo: PHOTO }),
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
	const clubs = [
		{ name: 'clubs/test-club', displayName: 'Test Club' },
		{ name: 'clubs/second-club', displayName: 'Second Club' },
		{ name: 'clubs/third-club', displayName: 'Third Club' },
		{ name: 'clubs/fourth-club', displayName: 'Fourth Club' },
		{ name: 'clubs/fifth-club', displayName: 'Fifth Club' },
		{ name: 'clubs/sixth-club', displayName: 'Sixth Club' }
	];
	const careerSpells = [
		{ club: 'clubs/test-club', startYear: 2000, endYear: 2004 },
		{ club: 'clubs/second-club', startYear: 2004, endYear: 2008 },
		{ club: 'clubs/third-club', startYear: 2008 }
	];
	await page.route('**/api/v1/players.json', (route) => route.fulfill({ json: { players } }));
	await page.route('**/api/v1/clubs.json', (route) => route.fulfill({ json: { clubs } }));
	// Players whose id ends in 2 have other later clubs, so Connections has clubs to choose from.
	const otherSpells = [
		{ club: 'clubs/test-club', startYear: 2000, endYear: 2004 },
		{ club: 'clubs/fourth-club', startYear: 2004, endYear: 2008 },
		{ club: 'clubs/fifth-club', startYear: 2008 }
	];
	// Players whose id ends in 3 have a club with games and three clubs they never played for,
	// so Guess the Club has a career to read and clubs to choose from.
	const gamesSpells = [
		{ club: 'clubs/test-club', startYear: 2000, endYear: 2004, appearanceCount: { value: 50 } },
		{ club: 'clubs/sixth-club', startYear: 2004, endYear: 2008 },
		{ club: 'clubs/fifth-club', startYear: 2008 }
	];
	await page.route('**/api/v1/players/*.json', (route) => {
		const url = route.request().url();
		const spells = url.endsWith('3.json')
			? gamesSpells
			: url.endsWith('2.json')
				? otherSpells
				: careerSpells;
		return route.fulfill({ json: { careerSpells: spells } });
	});
	await page.route('**/api/v1/photos/**', (route) => route.fulfill({ status: 404 }));
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

/** Gives the player the 11 cards of a match, in place of what the pack added. */
async function ownTheSquad(page: Page): Promise<void> {
	const state = {
		...createPlayerState(),
		collection: Object.fromEntries(OWNED.map((id) => [id, 1]))
	};
	await page.evaluate(
		([key, text]) => {
			localStorage.setItem(key, text);
		},
		[STATE_KEY, JSON.stringify(state)] as const
	);
}

test('every view runs with one origin, no cookie and no security policy violation', async ({
	page,
	context,
	baseURL
}) => {
	const origins = new Set<string>();
	const consoleMessages: string[] = [];
	page.on('request', (request) => origins.add(new URL(request.url()).origin));
	page.on('console', (message) => consoleMessages.push(message.text()));
	await serveCards(page);
	await fixSeed(page, WIN_SEED);

	await page.goto('/packs');
	await page.getByRole('button', { name: 'Open free pack (2 left)' }).click();
	await page.getByRole('button', { name: 'Skip to all cards' }).click();
	await page.getByRole('button', { name: 'Add to my collection' }).click();
	await expect(page).toHaveURL(/\/cards$/);

	await ownTheSquad(page);
	await page.goto('/cards');
	const tile = page.getByRole('button', { name: /Name p-fw-1/ });
	await tile.click();
	const dialog = page.getByRole('dialog');
	await dialog.getByRole('button', { name: /see the back/ }).click();
	await expect(dialog).toContainText('Photo:');
	await page.keyboard.press('Escape');
	await expect(dialog).toBeHidden();

	await page.goto('/match');
	await page.getByRole('button', { name: 'Kick off' }).click();
	await expect(page.getByTestId('clock')).toBeVisible();
	await page.getByRole('button', { name: 'Skip to full time' }).click();
	await expect(page.getByRole('heading', { name: 'You win!' })).toBeVisible();

	await page.goto('/games');
	await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

	await page.goto('/games/transfer-trail');
	await expect(page.getByText('Player 1 of 5')).toBeVisible();

	await page.goto('/games/connections');
	await expect(page.getByText('Question 1 of 5')).toBeVisible();

	await page.goto('/games/guess-the-club');
	await expect(page.getByText(/Question 1 of \d/)).toBeVisible();

	await page.goto('/games/pairs');
	await expect(page.getByRole('heading', { name: 'Pairs', level: 2 })).toBeVisible();

	await page.goto('/guide');
	await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
	await page.waitForLoadState('networkidle');

	expect([...origins]).toEqual([new URL(baseURL ?? '').origin]);
	expect(await context.cookies()).toEqual([]);
	expect(consoleMessages.filter((text) => text.includes('Content Security Policy'))).toEqual([]);
});
