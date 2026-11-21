<script lang="ts">
	import { onMount } from 'svelte';
	import {
		addFavourite,
		createRandom,
		isFavourite,
		removeFavourite,
		tradeCard
	} from '@soccer-cards/game';
	import type { CardId, CheckedCardSet, PlayerState } from '@soccer-cards/game';
	import CollectionView, { type TradeOutcome } from '../../lib/collection/CollectionView.svelte';
	import { openCollection, saveNotice } from '../../lib/collection/collection-session.ts';
	import { listOwnedCards, type KnownCard } from '../../lib/collection/owned-cards.ts';
	import type { CardFace } from '../../lib/data/card-face-from-summary.ts';
	import { randomSeed } from '../../lib/packs/pack-session.ts';
	import type { PlayerStore } from '../../lib/state/player-store.ts';

	const TRADE_REFUSALS = {
		'last-favourite': 'That is a favourite. Take the star off before you trade it.',
		'no-other-card': 'There is no other card of that kind to swap for yet.',
		'card-not-owned': "You don't have that card any more.",
		'card-not-in-set': "That card can't be traded."
	} as const;

	// Loading reads storage and the API, so it runs in the browser, never while prerendering.
	let status = $state<'loading' | 'ready' | 'no-cards'>('loading');
	let player = $state<PlayerState>();
	let cardSet = $state<CheckedCardSet>();
	let faces = $state<ReadonlyMap<CardId, CardFace>>(new Map());
	let notice = $state<string>();
	let store: PlayerStore | undefined;
	const owned = $derived(
		player && cardSet ? listOwnedCards(player.collection, cardSet, faces) : []
	);

	onMount(async () => {
		const session = await openCollection();
		// An empty collection needs no card set, so the child is still pointed to Packs.
		if (!session.ok) {
			status = Object.keys(session.state.collection).length === 0 ? 'ready' : 'no-cards';
			return;
		}
		({ store, cardSet, faces } = session);
		player = session.state;
		status = 'ready';
	});

	// Shows the new state only when it was saved. A refused save leaves the old state on screen.
	function keep(next: PlayerState): string | undefined {
		if (!store) {
			player = next;
			return undefined;
		}
		const words = saveNotice(store.save(next));
		notice = words;
		if (words === undefined) player = next;
		return words;
	}

	function toggleFavourite(entry: KnownCard): string {
		if (!player) return '';
		if (isFavourite(player, entry.id)) {
			const result = removeFavourite(player, entry.id);
			if (!result.ok) return "That card isn't a favourite.";
			return keep(result.value) ?? 'Star removed';
		}
		const result = addFavourite(player, entry.id);
		if (!result.ok) return TRADE_REFUSALS[result.reason];
		return keep(result.value) ?? `${entry.face.displayName} is now a favourite`;
	}

	function trade(entry: KnownCard): TradeOutcome {
		if (!player || !cardSet) return { ok: false, message: TRADE_REFUSALS['card-not-owned'] };
		const result = tradeCard(player, cardSet, entry.id, createRandom(randomSeed()));
		if (!result.ok) return { ok: false, message: TRADE_REFUSALS[result.reason] };
		const card = cardSet.find((each) => each.id === result.receivedCardId);
		const face = faces.get(result.receivedCardId);
		const refused = keep(result.value);
		if (refused !== undefined) return { ok: false, message: refused };
		if (card === undefined || face === undefined) {
			return { ok: false, message: 'Trade done.' };
		}
		const count = result.value.collection[card.id] ?? 1;
		return { ok: true, received: { kind: 'known', id: card.id, count, card, face } };
	}
</script>

<svelte:head>
	<title>Cards · Soccer Cards</title>
</svelte:head>

<main>
	<h1 class="sr-only">Cards</h1>
	<h2>My cards</h2>
	{#if notice}<p class="banner">{notice}</p>{/if}
	{#if status === 'loading'}
		<p class="muted">Getting your cards…</p>
	{:else if status === 'no-cards'}
		<div class="empty"><p>We can't show your cards right now. Try again in a moment.</p></div>
	{:else}
		<CollectionView
			{owned}
			favourites={player?.favourites ?? []}
			onfavourite={toggleFavourite}
			ontrade={trade}
		/>
	{/if}
</main>
