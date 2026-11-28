import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { createPlayerState } from '@soccer-cards/game';
import {
	browserStorage,
	clearPlayerStorage,
	createPlayerStore
} from '../../../lib/state/player-store.ts';
import PairsView from './PairsView.svelte';

const RATINGS = { pace: 80, shooting: 70, passing: 60, dribbling: 75, defending: 40, physical: 65 };

function summary(id: string, tier = 'BASE'): unknown {
	return {
		name: `players/${id}`,
		displayName: `Name ${id}`,
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

function serve(ids: readonly string[]): void {
	vi.stubGlobal('fetch', (path: string) => {
		const body = path.endsWith('/clubs.json')
			? { clubs: [{ name: 'clubs/c0', displayName: 'Club 0' }] }
			: {
					// A card set needs a rare, a legend and an icon to be a set, so they are always there.
					players: [
						...ids.map((id) => summary(id)),
						...['RARE', 'LEGEND', 'ICON'].map((tier) => summary(`x-${tier}`, tier))
					]
				};
		return Promise.resolve(new Response(JSON.stringify(body)));
	});
}

/** Owns `count` different cards, p-0, p-1 and so on, and makes them the whole set. */
function own(count: number, coins = 0): void {
	const ids = Array.from({ length: count }, (_, i) => `p-${String(i)}`);
	serve(ids);
	const state = {
		...createPlayerState(),
		coins,
		collection: Object.fromEntries(ids.map((id) => [id, 1]))
	};
	const store = createPlayerStore(browserStorage);
	store.load();
	store.save(state);
}

type Screen = Awaited<ReturnType<typeof render>>;

/** The player on each place of the board, read from the hidden card faces. */
function layout(screen: Screen): string[] {
	return [...screen.container.querySelectorAll('[data-testid^="slot-"]')].map(
		(slot) => /Name p-\d+/.exec(slot.textContent)?.[0] ?? ''
	);
}

function tap(screen: Screen, place: number): Promise<void> {
	return screen.getByRole('button', { name: `Face-down card ${String(place + 1)}` }).click();
}

/** Turns each pair, the first card then its twin, so a board takes one turn per pair. */
async function playPerfect(screen: Screen): Promise<void> {
	const names = layout(screen);
	for (const name of new Set(names)) {
		const [first, second] = names.flatMap((each, i) => (each === name ? [i] : []));
		await tap(screen, first ?? 0);
		await tap(screen, second ?? 0);
	}
}

beforeEach(() => {
	clearPlayerStorage(browserStorage);
});
afterEach(() => {
	vi.unstubAllGlobals();
	vi.useRealTimers();
});

test('enables the sizes the owned cards allow and says what the others need', async () => {
	own(8);
	const screen = await render(PairsView);

	await expect.element(screen.getByRole('button', { name: '6 pairs' })).toBeEnabled();
	await expect.element(screen.getByRole('button', { name: '8 pairs' })).toBeEnabled();
	await expect.element(screen.getByRole('button', { name: '10 pairs' })).toBeDisabled();
	await expect.element(screen.getByText('Win 3 coins.')).toBeVisible();
	await expect
		.element(screen.getByText('Collect 2 more different cards to play this.'))
		.toBeVisible();
});

test('a player with no cards sees every size disabled and a way to open packs', async () => {
	serve(['p-0']);
	const screen = await render(PairsView);

	await expect.element(screen.getByRole('button', { name: '6 pairs' })).toBeDisabled();
	await expect.element(screen.getByRole('button', { name: '10 pairs' })).toBeDisabled();
	await expect
		.element(screen.getByRole('link', { name: 'Open a pack' }))
		.toHaveAttribute('href', '/packs');
});

test('picking a size shows a board of that size', async () => {
	own(8);
	const screen = await render(PairsView);
	await screen.getByRole('button', { name: '8 pairs' }).click();

	await expect.element(screen.getByText('Pairs: 0 of 8')).toBeVisible();
	await expect.element(screen.getByRole('button', { name: '8 pairs' })).not.toBeInTheDocument();
});

test('a second board after Another board size adds its coins to the first one', async () => {
	own(6, 10);
	const screen = await render(PairsView);
	await screen.getByRole('button', { name: '6 pairs' }).click();
	await playPerfect(screen);
	await screen.getByRole('button', { name: 'Another board size' }).click();
	await screen.getByRole('button', { name: '6 pairs' }).click();
	await playPerfect(screen);

	await expect.element(screen.getByRole('heading', { name: 'All 6 pairs found!' })).toBeVisible();
	expect(createPlayerStore(browserStorage).load().state.coins).toBe(18);
});

test('says the players cannot load, with no size notes, when the cards fail to load', async () => {
	own(8);
	vi.stubGlobal('fetch', () => Promise.reject(new Error('offline')));
	const screen = await render(PairsView);

	await expect.element(screen.getByRole('button', { name: 'Try again' })).toBeVisible();
	await expect.element(screen.getByText(/can't find the players/)).toBeVisible();
	await expect.element(screen.getByText(/You have no cards yet/)).not.toBeInTheDocument();
	await expect.element(screen.getByText(/more different cards/)).not.toBeInTheDocument();
	await expect.element(screen.getByRole('button', { name: '6 pairs' })).not.toBeInTheDocument();
});

test('says the players cannot load for a player with no saved cards too', async () => {
	vi.stubGlobal('fetch', () => Promise.reject(new Error('offline')));
	const screen = await render(PairsView);

	await expect.element(screen.getByText(/can't find the players/)).toBeVisible();
	await expect.element(screen.getByText(/You have no cards yet/)).not.toBeInTheDocument();
});

test('Try again loads the sizes once the cards can load', async () => {
	own(8);
	vi.stubGlobal('fetch', () => Promise.reject(new Error('offline')));
	const screen = await render(PairsView);
	await expect.element(screen.getByRole('button', { name: 'Try again' })).toBeVisible();
	own(8);
	await screen.getByRole('button', { name: 'Try again' }).click();

	await expect.element(screen.getByRole('button', { name: '8 pairs' })).toBeEnabled();
});
