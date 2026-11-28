import { afterEach, expect, test, vi } from 'vitest';
import { cdp, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import PairsBoard from './PairsBoard.svelte';
import type { PairsStatus } from './pairs-words.ts';

const names = ['Ana Diaz', 'Bo Lee', 'Cy Ode', 'Di Fox', 'Ed Gray', 'Flo Hu', 'Gus Ing', 'Hal Jo'];
const front = (displayName: string) =>
	({
		displayName,
		position: 'FORWARD',
		tier: 'BASE',
		overall: 70,
		attack: 70,
		defence: 60,
		control: 65
	}) as const;
type State = 'down' | 'up' | 'matched';
function board(pairs: number, states: Record<number, State> = {}) {
	return Array.from({ length: pairs * 2 }, (_, i) => ({
		id: `c${String(i)}`,
		state: states[i] ?? 'down',
		front: front(names[Math.floor(i / 2) % names.length] ?? 'Ana Diaz')
	}));
}
function props(extra: Record<string, unknown> = {}) {
	return {
		cards: board(6),
		turns: 0,
		pairsFound: 0,
		status: { kind: 'first' } satisfies PairsStatus,
		onTap: vi.fn(),
		...extra
	};
}

async function emulateReducedMotion(value: 'reduce' | 'no-preference'): Promise<void> {
	await cdp().send('Emulation.setEmulatedMedia', {
		features: [{ name: 'prefers-reduced-motion', value }]
	});
}

afterEach(async () => {
	await emulateReducedMotion('no-preference');
});

test('a face-down card is named by its place', async () => {
	const screen = await render(PairsBoard, props());

	await expect.element(screen.getByRole('button', { name: 'Face-down card 1' })).toBeVisible();
	await expect.element(screen.getByRole('button', { name: 'Face-down card 12' })).toBeVisible();
});

test('a face-up card is named by its player, and a matched one says matched', async () => {
	const screen = await render(PairsBoard, props({ cards: board(6, { 0: 'up', 2: 'matched' }) }));

	await expect.element(screen.getByRole('button', { name: 'Ana Diaz', exact: true })).toBeVisible();
	await expect.element(screen.getByRole('button', { name: 'Bo Lee, matched' })).toBeVisible();
});

test('a face-down card does not tell a screen reader who it is', async () => {
	const screen = await render(PairsBoard, props());

	await expect.element(screen.getByRole('img')).not.toBeInTheDocument();
});

test('the turn and pair counts show', async () => {
	const screen = await render(PairsBoard, props({ turns: 4, pairsFound: 2 }));

	await expect.element(screen.getByText('Turns: 4')).toBeVisible();
	await expect.element(screen.getByText('Pairs: 2 of 6')).toBeVisible();
});

test('a tap tells the page which card, and a double tap tells it once', async () => {
	const p = props();
	const screen = await render(PairsBoard, p);

	await screen.getByRole('button', { name: 'Face-down card 3' }).dblClick();

	expect(p.onTap).toHaveBeenCalledExactlyOnceWith('c2');
});

test('a card that is already up or matched tells the page nothing', async () => {
	const p = props({ cards: board(6, { 0: 'up', 2: 'matched' }) });
	const screen = await render(PairsBoard, p);

	await screen.getByRole('button', { name: 'Ana Diaz', exact: true }).click();
	await screen.getByRole('button', { name: 'Bo Lee, matched' }).click();

	expect(p.onTap).not.toHaveBeenCalled();
});

test('a repeated Enter on a card tells the page once', async () => {
	const p = props();
	const screen = await render(PairsBoard, p);
	screen.getByRole('button', { name: 'Face-down card 2' }).element().focus();

	await userEvent.keyboard('{Enter}{Enter}{Enter}');

	expect(p.onTap).toHaveBeenCalledTimes(1);
});

test.each<[PairsStatus, string]>([
	[{ kind: 'first' }, 'Turn a card.'],
	[{ kind: 'second' }, 'Now turn a second card.'],
	[{ kind: 'match', name: 'Ana Diaz' }, 'A match: Ana Diaz!'],
	[{ kind: 'miss' }, 'Not the same. Remember where they are.']
])('the status line for %j', async (status, words) => {
	const screen = await render(PairsBoard, props({ status }));

	await expect.element(screen.getByRole('status')).toHaveTextContent(words);
});

test.each([
	[6, 4],
	[8, 4],
	[10, 5]
])('%i pairs sit %i across', async (pairs, across) => {
	const screen = await render(PairsBoard, props({ cards: board(pairs) }));

	const grid = screen.getByRole('group', { name: 'Cards' }).element();

	expect(getComputedStyle(grid).gridTemplateColumns.split(' ')).toHaveLength(across);
});

test('the cards sit under a level-2 heading', async () => {
	const screen = await render(PairsBoard, props());

	await expect.element(screen.getByRole('heading', { level: 2, name: 'Cards' })).toBeVisible();
});

test('a matched card is outlined and an unmatched one is not', async () => {
	document.documentElement.style.setProperty('--ctrl', 'rgb(47, 203, 122)');
	document.documentElement.style.setProperty('--card-shadow', 'rgba(16, 35, 28, 0.28)');
	const screen = await render(PairsBoard, props({ cards: board(6, { 0: 'matched' }) }));
	const outline = (id: string): string =>
		getComputedStyle(screen.getByTestId(id).element().querySelector('.front') ?? document.body)
			.boxShadow;

	expect(outline('slot-c0')).toContain('rgb(47, 203, 122)');
	expect(outline('slot-c1')).toBe('none');
	document.documentElement.style.removeProperty('--ctrl');
	document.documentElement.style.removeProperty('--card-shadow');
});

const nextFrame = (): Promise<void> => new Promise((done) => requestAnimationFrame(() => done()));
const turnOf = (screen: { getByTestId: (id: string) => { element: () => Element } }): number =>
	new DOMMatrix(getComputedStyle(screen.getByTestId('turning-c0').element()).transform).m11;

test('with reduced motion a card changes face with no flip', async () => {
	await emulateReducedMotion('reduce');
	const screen = await render(PairsBoard, props());
	expect(turnOf(screen)).toBeLessThan(0);

	await nextFrame();

	await screen.rerender(props({ cards: board(6, { 0: 'up' }) }));
	await nextFrame();

	expect(turnOf(screen)).toBeGreaterThan(0.99);
});

test('a face-down card still faces away after a frame', async () => {
	await emulateReducedMotion('no-preference');
	const screen = await render(PairsBoard, props());

	await nextFrame();
	await nextFrame();

	expect(turnOf(screen)).toBeLessThan(0);
});

test('the first turn of a card that mounted face down starts at 180 degrees and animates to 0', async () => {
	await emulateReducedMotion('no-preference');
	const screen = await render(PairsBoard, props());
	await new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)));

	await screen.rerender(props({ cards: board(6, { 0: 'up' }) }));

	expect(turnOf(screen)).toBeLessThan(0.5);
	await vi.waitFor(() => {
		expect(turnOf(screen)).toBeGreaterThan(0.99);
	});
});

test('a card that mounts face up shows its front with no flip', async () => {
	const screen = await render(PairsBoard, props({ cards: board(6, { 0: 'up' }) }));

	expect(turnOf(screen)).toBeGreaterThan(0.99);
});
