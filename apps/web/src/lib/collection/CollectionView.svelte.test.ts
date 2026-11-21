import { toCardId } from '@soccer-cards/game';
import { expect, test } from 'vitest';
import { render } from 'vitest-browser-svelte';
import CollectionView from './CollectionView.svelte';
import type { OwnedCard } from './owned-cards.ts';

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
const known: OwnedCard = {
	kind: 'known',
	id,
	count: 3,
	card,
	face: { displayName: 'Ann Example' }
};

test('an empty collection points to Packs', async () => {
	const screen = await render(CollectionView, { owned: [] });

	await expect.element(screen.getByRole('link', { name: 'Packs' })).toHaveAttribute('href');
});

test('doubles show their copies, and an unknown card is shown as unknown', async () => {
	const unknown: OwnedCard = { kind: 'unknown', id: toCardId('gone'), count: 1 };
	const screen = await render(CollectionView, { owned: [known, unknown] });

	await expect.element(screen.getByRole('img', { name: /Ann Example/ })).toBeVisible();
	await expect.element(screen.getByText(/×3/)).toBeInTheDocument();
	await expect.element(screen.getByText('Unknown card')).toBeVisible();
});
