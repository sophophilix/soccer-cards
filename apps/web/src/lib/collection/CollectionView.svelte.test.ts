import { toCardId } from '@soccer-cards/game';
import { expect, test } from 'vitest';
import { render } from 'vitest-browser-svelte';
import CollectionView from './CollectionView.svelte';
import type { KnownCard, OwnedCard } from './owned-cards.ts';

const id = toCardId('ann');
const card = {
	id,
	tier: 'rare',
	position: 'FW',
	overall: 80,
	attack: 80,
	defence: 40,
	control: 70
} as const;
const known: KnownCard = {
	kind: 'known',
	id,
	count: 3,
	card,
	face: { displayName: 'Ann Example' }
};

test('an empty collection points to Packs', async () => {
	const screen = await render(CollectionView, { owned: [] });

	await expect.element(screen.getByRole('link', { name: 'Open a pack' })).toHaveAttribute('href');
});

test('doubles show their copies, and an unknown card is shown as unknown', async () => {
	const unknown: OwnedCard = { kind: 'unknown', id: toCardId('gone'), count: 1 };
	const screen = await render(CollectionView, { owned: [known, unknown] });

	await expect
		.element(screen.getByRole('button', { name: 'Look at Ann Example, you have 3' }))
		.toBeVisible();
	await expect.element(screen.getByText('×3')).toBeInTheDocument();
	await expect.element(screen.getByText('Unknown card')).toBeVisible();
});

test('a tap opens the card large, and Close returns focus to the tile', async () => {
	const screen = await render(CollectionView, { owned: [known] });
	const tile = screen.getByRole('button', { name: /Ann Example/ });

	await tile.click();
	await expect.element(screen.getByRole('dialog', { name: 'Ann Example, large' })).toBeVisible();
	await screen.getByRole('button', { name: 'Close' }).click();

	await expect.element(screen.getByRole('dialog')).not.toBeInTheDocument();
});

test('a card with no ratings opens with only its front and no Flip', async () => {
	const screen = await render(CollectionView, { owned: [known] });

	await screen.getByRole('button', { name: /Ann Example/ }).click();

	await expect.element(screen.getByRole('button', { name: 'Flip' })).not.toBeInTheDocument();
});

test('a card with ratings flips to show the credit', async () => {
	const ratings = { kind: 'goalkeeper', diving: 1, handling: 2, kicking: 3 } as const;
	const credit = { author: 'Ina Vented', licenseCode: 'CC0-1.0' };
	const face = {
		displayName: 'Ann Example',
		ratings: { ...ratings, reflexes: 4, speed: 5, positioning: 6 },
		photo: { src: '/p.webp', widthPx: 600, heightPx: 800, credit }
	};
	const screen = await render(CollectionView, { owned: [{ ...known, face }] });

	await screen.getByRole('button', { name: /Ann Example/ }).click();
	await screen.getByRole('button', { name: 'Flip' }).click();

	await expect.element(screen.getByText(/Ina Vented/)).toBeVisible();
});

test('the star filter shows favourites only, and says when there are none', async () => {
	const screen = await render(CollectionView, { owned: [known], favourites: [] });

	await screen.getByRole('button', { name: '★ Favourites' }).click();

	await expect.element(screen.getByText(/No favourites yet/)).toBeVisible();
});

test('the columns choice is a pressed toggle', async () => {
	const screen = await render(CollectionView, { owned: [known] });

	await screen.getByRole('button', { name: '3', exact: true }).click();

	await expect
		.element(screen.getByRole('button', { name: '3', exact: true }))
		.toHaveAttribute('aria-pressed', 'true');
});

test('trading a card shows the swap', async () => {
	const other: KnownCard = {
		...known,
		id: toCardId('bo'),
		card: { ...card, id: toCardId('bo') },
		face: { displayName: 'Bo Example' }
	};
	const screen = await render(CollectionView, {
		owned: [known],
		ontrade: () => ({ ok: true, received: other })
	});

	await screen.getByRole('button', { name: 'Trade' }).click();
	await screen.getByRole('button', { name: /Trade Ann Example/ }).click({ force: true });

	await expect.element(screen.getByText('You swapped Ann Example for Bo Example.')).toBeVisible();
});

test('a refused trade shows its words', async () => {
	const refused = await render(CollectionView, {
		owned: [known],
		ontrade: () => ({ ok: false, message: 'That is a favourite.' })
	});
	await refused.getByRole('button', { name: 'Trade' }).click();
	await refused.getByRole('button', { name: /Trade Ann Example/ }).click({ force: true });
	await expect.element(refused.getByRole('status')).toHaveTextContent('That is a favourite.');
});
