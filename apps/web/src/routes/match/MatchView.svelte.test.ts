import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { createPlayerState } from '@soccer-cards/game';
import {
	browserStorage,
	clearPlayerStorage,
	createPlayerStore
} from '../../lib/state/player-store.ts';
import MatchView from './MatchView.svelte';

const RATINGS = { pace: 80, shooting: 70, passing: 60, dribbling: 75, defending: 40, physical: 65 };
// The player's 11, then one card of each lucky tier so the computer's side can be fielded.
const SQUAD = [
	['GOALKEEPER', 'gk', 1, 'BASE'],
	['DEFENDER', 'df', 4, 'BASE'],
	['MIDFIELDER', 'mf', 4, 'BASE'],
	['FORWARD', 'fw', 2, 'BASE'],
	['FORWARD', 'rare', 1, 'RARE'],
	['MIDFIELDER', 'legend', 1, 'LEGEND'],
	['GOALKEEPER', 'icon', 1, 'ICON']
] as const;
// A seed that wins with this card set, so the result is the same every run.
const WIN_SEED = 1;
const cardIds = (code: string, count: number): string[] =>
	Array.from({ length: count }, (_, index) => `p-${code}-${String(index + 1)}`);

let seedCalls = 0;

beforeEach(() => {
	seedCalls = 0;
	const players = SQUAD.flatMap(([position, code, count, tier]) =>
		cardIds(code, count).map((id) => ({
			name: `players/${id}`,
			displayName: `Name ${id}`,
			state: 'ACTIVE',
			club: 'clubs/test-club',
			nationalTeamCode: 'ENG',
			position,
			tier,
			cardNumber: 70,
			outfieldRatings: RATINGS,
			playStats: { attack: 70, defence: 60, control: 65, overall: 70 }
		}))
	);
	const club = { name: 'clubs/test-club', displayName: 'Test Club' };
	vi.stubGlobal('fetch', (path: string) =>
		Promise.resolve(
			new Response(JSON.stringify(path.endsWith('/clubs.json') ? { clubs: [club] } : { players }))
		)
	);
	const owned = SQUAD.filter(([, , , tier]) => tier === 'BASE').flatMap(([, code, count]) =>
		cardIds(code, count)
	);
	const state = {
		...createPlayerState(),
		collection: Object.fromEntries(owned.map((id) => [id, 1])),
		coins: 0
	};
	const store = createPlayerStore(browserStorage);
	store.load();
	store.save(state);
	vi.spyOn(crypto, 'getRandomValues').mockImplementation(((array: Uint32Array) => {
		seedCalls += 1;
		array[0] = WIN_SEED;
		return array;
	}) as typeof crypto.getRandomValues);
});

afterEach(() => {
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
	clearPlayerStorage(browserStorage);
});

test('two Kick off clicks before the page updates start one match', async () => {
	const screen = await render(MatchView);
	await expect.element(screen.getByRole('button', { name: 'Kick off' })).toBeEnabled();
	const kickOff = screen.getByRole('button', { name: 'Kick off' }).element() as HTMLElement;

	kickOff.click();
	kickOff.click();

	await expect.element(screen.getByRole('heading', { name: 'The match' })).toBeVisible();
	await expect.element(screen.getByRole('heading', { name: 'Your team' })).toBeVisible();
	expect(seedCalls).toBe(1);
});

test.each([
	['QuotaExceededError', 'This device is full, so your result was not saved.'],
	['SecurityError', "Your results can't be saved on this device. You can still play."]
])(
	'says the save notice when saving fails with %s, and still shows the result',
	async (name, words) => {
		const screen = await render(MatchView);
		await screen.getByRole('button', { name: 'Kick off' }).click();
		vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
			throw new DOMException('refused', name);
		});

		await screen.getByRole('button', { name: 'Skip to full time' }).click();

		await expect.element(screen.getByRole('heading', { name: 'You win!' })).toBeVisible();
		await expect.element(screen.getByText(words)).toBeVisible();
	}
);
