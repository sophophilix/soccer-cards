import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { STATE_KEY, browserStorage, clearPlayerStorage } from '../../lib/state/player-store.ts';
import PacksView from './PacksView.svelte';

const RATINGS = { pace: 80, shooting: 70, passing: 60, dribbling: 75, defending: 40, physical: 65 };
const TIERS = ['BASE', 'RARE', 'LEGEND', 'ICON'] as const;
const OPEN_FREE = { name: /^Open free pack/ };

function serveCards(): void {
	const players = Array.from({ length: 8 }, (_, index) => ({
		name: `players/test-player-${String(index)}`,
		displayName: `Test Player ${String(index)}`,
		state: 'ACTIVE',
		club: 'clubs/test-club',
		nationalTeamCode: 'ENG',
		position: 'FORWARD',
		tier: TIERS[Math.min(index, 3)],
		cardNumber: index + 1,
		outfieldRatings: RATINGS,
		playStats: { attack: 70, defence: 40, control: 60, overall: 60 }
	}));
	const clubs = [{ name: 'clubs/test-club', displayName: 'Test Club' }];
	vi.stubGlobal('fetch', (path: string) =>
		Promise.resolve(
			new Response(JSON.stringify(path.endsWith('/players.json') ? { players } : { clubs }))
		)
	);
}

beforeEach(() => {
	clearPlayerStorage(browserStorage);
	serveCards();
});
afterEach(() => {
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
});

test('a double tap on Open opens one pack', async () => {
	const screen = await render(PacksView);
	await expect.element(screen.getByRole('button', OPEN_FREE)).toBeEnabled();

	const open = screen.getByRole('button', OPEN_FREE).element() as HTMLElement;
	open.click();
	open.click();

	await expect.element(screen.getByText('Card 1 of 10')).toBeVisible();
	const saved = JSON.parse(browserStorage()?.getItem(STATE_KEY) ?? '{}') as { freePacks?: number };
	expect(saved.freePacks).toBe(1);
});

test('says so when the device cannot save progress, and still opens the pack', async () => {
	vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
		throw new Error('blocked');
	});
	const screen = await render(PacksView);

	await expect
		.element(screen.getByText(/^Your cards can't be saved on this device\./))
		.toBeVisible();
	await screen.getByRole('button', OPEN_FREE).click();

	await expect.element(screen.getByText('Card 1 of 10')).toBeVisible();
});

test('says so when the device is full, and still shows the pack', async () => {
	const screen = await render(PacksView);
	await expect.element(screen.getByRole('button', OPEN_FREE)).toBeEnabled();
	vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
		throw new DOMException('full', 'QuotaExceededError');
	});

	await screen.getByRole('button', OPEN_FREE).click();

	await expect
		.element(screen.getByText('This device is full, so your cards were not saved.'))
		.toBeVisible();
	await expect.element(screen.getByText('Card 1 of 10')).toBeVisible();
});
