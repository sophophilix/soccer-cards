import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { createPlayerState } from '@soccer-cards/game';
import { loadCardSet } from '../../../lib/data/load-card-set.ts';
import {
	browserStorage,
	clearPlayerStorage,
	createPlayerStore
} from '../../../lib/state/player-store.ts';
import PairsPlay from './PairsPlay.svelte';

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

/** Six owned cards and the rare, legend and icon a card set needs to be a set. */
async function props(coins = 0) {
	const ids = Array.from({ length: 6 }, (_, i) => `p-${String(i)}`);
	const fetchFile = (path: string): Promise<Response> => {
		const body = path.endsWith('/clubs.json')
			? { clubs: [{ name: 'clubs/c0', displayName: 'Club 0' }] }
			: {
					players: [
						...ids.map((id) => summary(id)),
						...['RARE', 'LEGEND', 'ICON'].map((tier) => summary(`x-${tier}`, tier))
					]
				};
		return Promise.resolve(new Response(JSON.stringify(body)));
	};
	const set = await loadCardSet(fetchFile);
	if (!set.ok) throw new Error('the card set did not load');
	const store = createPlayerStore(browserStorage);
	store.load();
	const player = {
		...createPlayerState(),
		coins,
		collection: Object.fromEntries(ids.map((id) => [id, 1]))
	};
	store.save(player);
	return {
		size: 6 as const,
		player,
		cardSet: set.value,
		faces: set.faces,
		store,
		onOtherSize: vi.fn()
	};
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

/** Misses `misses` times on the first two different players, then finds every pair. */
async function playSlow(screen: Screen, misses: number): Promise<void> {
	const names = layout(screen);
	const other = names.findIndex((each) => each !== names[0]);
	for (let miss = 0; miss < misses; miss++) {
		await tap(screen, 0);
		await tap(screen, other);
		await vi.advanceTimersByTimeAsync(1100);
	}
	await playPerfect(screen);
}

beforeEach(() => {
	clearPlayerStorage(browserStorage);
});
afterEach(() => {
	vi.useRealTimers();
	vi.restoreAllMocks();
});

test('a board played in the fewest turns pays the board coins and the bonus, and saves them', async () => {
	const screen = await render(PairsPlay, await props(10));
	await playPerfect(screen);

	await expect.element(screen.getByRole('heading', { name: 'All 6 pairs found!' })).toBeVisible();
	await expect
		.element(
			screen.getByText(
				'You used 6 turns. You earned 4 coins: 3 for the board and 1 for finding them in 12 turns or fewer.'
			)
		)
		.toBeVisible();
	expect(createPlayerStore(browserStorage).load().state.coins).toBe(14);
});

test('a slow board pays the board coins with no bonus', async () => {
	vi.useFakeTimers();
	const screen = await render(PairsPlay, await props(10));
	await playSlow(screen, 7);

	await expect.element(screen.getByRole('heading', { name: 'All 6 pairs found!' })).toBeVisible();
	expect(createPlayerStore(browserStorage).load().state.coins).toBe(13);
});

test('a mismatch turns back after about a second', async () => {
	vi.useFakeTimers();
	const screen = await render(PairsPlay, await props());
	const names = layout(screen);
	await tap(screen, 0);
	await tap(
		screen,
		names.findIndex((each) => each !== names[0])
	);

	await expect.element(screen.getByText('Not the same. Remember where they are.')).toBeVisible();
	await vi.advanceTimersByTimeAsync(1100);

	await expect.element(screen.getByText('Turn a card.')).toBeVisible();
	await expect.element(screen.getByText('Turns: 1')).toBeVisible();
	await expect.element(screen.getByRole('button', { name: 'Face-down card 1' })).toBeVisible();
});

test('a failed save is said in words and the board still finishes', async () => {
	const given = await props();
	vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
		throw new DOMException('full', 'QuotaExceededError');
	});
	const screen = await render(PairsPlay, given);
	await playPerfect(screen);

	await expect.element(screen.getByText(/your coins were not saved/)).toBeVisible();
	await expect.element(screen.getByRole('heading', { name: 'All 6 pairs found!' })).toBeVisible();
});

test('Play again deals a fresh face-down board', async () => {
	const screen = await render(PairsPlay, await props());
	await playPerfect(screen);
	await screen.getByRole('button', { name: 'Play again' }).click();

	await expect.element(screen.getByText('Turns: 0')).toBeVisible();
	await expect.element(screen.getByText('Pairs: 0 of 6')).toBeVisible();
});

test('Another board size tells the parent', async () => {
	const given = await props();
	const screen = await render(PairsPlay, given);
	await playPerfect(screen);
	await screen.getByRole('button', { name: 'Another board size' }).click();

	expect(given.onOtherSize).toHaveBeenCalledOnce();
});
