<script lang="ts">
	import { onMount } from 'svelte';
	import { browserStorage, createPlayerStore } from '../../lib/state/player-store.ts';
	import { loadCardSet } from '../../lib/data/load-card-set.ts';
	import CollectionView from '../../lib/collection/CollectionView.svelte';
	import { listOwnedCards, type OwnedCard } from '../../lib/collection/owned-cards.ts';

	// Loading reads storage and the API, so it runs in the browser, never while prerendering.
	let status = $state<'loading' | 'ready' | 'no-cards'>('loading');
	let owned = $state<readonly OwnedCard[]>([]);

	onMount(async () => {
		const { state } = createPlayerStore(browserStorage).load();
		// An empty collection needs no card set, so the child is pointed to Packs even with no API.
		if (Object.keys(state.collection).length === 0) {
			status = 'ready';
			return;
		}
		const set = await loadCardSet((path) => fetch(path));
		if (!set.ok) {
			status = 'no-cards';
			return;
		}
		owned = listOwnedCards(state.collection, set.value, set.faces);
		status = 'ready';
	});
</script>

<svelte:head>
	<title>Cards · Soccer Cards</title>
</svelte:head>

<main>
	<h1>Cards</h1>
	{#if status === 'loading'}
		<p>Getting your cards…</p>
	{:else if status === 'no-cards'}
		<p>We can't show your cards right now. Try again in a moment.</p>
	{:else}
		<CollectionView {owned} />
	{/if}
</main>
