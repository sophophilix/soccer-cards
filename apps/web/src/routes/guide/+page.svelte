<script lang="ts">
	import { onMount } from 'svelte';
	import { createPlayerState } from '@soccer-cards/game';
	import type { CardId, CheckedCardSet, PlayerState } from '@soccer-cards/game';
	import { openCollection } from '../../lib/collection/collection-session.ts';
	import Toast from '../../lib/collection/Toast.svelte';
	import type { CardFace } from '../../lib/data/card-face-from-summary.ts';
	import { SAVED_EVENT, browserStorage, clearPlayerStorage } from '../../lib/state/player-store.ts';
	import GuideView from './GuideView.svelte';

	// Loading reads storage and the API, so it runs in the browser, never while prerendering.
	let status = $state<'loading' | 'ready' | 'no-cards'>('loading');
	let player = $state<PlayerState>(createPlayerState());
	let cardSet = $state<CheckedCardSet>();
	let faces = $state<ReadonlyMap<CardId, CardFace>>(new Map());
	let toast = $state<{ readonly text: string }>();

	onMount(async () => {
		const session = await openCollection();
		if (!session.ok) {
			status = 'no-cards';
			return;
		}
		({ cardSet, faces } = session);
		player = session.state;
		status = 'ready';
	});

	function reset(): boolean {
		if (!clearPlayerStorage(browserStorage).ok) {
			toast = { text: "Your cards couldn't be deleted on this device." };
			return false;
		}
		player = createPlayerState();
		// The masthead follows saves; a fresh start counts as one.
		window.dispatchEvent(new CustomEvent<PlayerState>(SAVED_EVENT, { detail: player }));
		toast = { text: 'Collection cleared. You have 2 free packs again.' };
		return true;
	}
</script>

<svelte:head>
	<title>Guide · Soccer Cards</title>
</svelte:head>

<main>
	<h1>Collector guide</h1>
	{#if status === 'loading'}
		<p class="muted">Getting the cards…</p>
	{:else if status === 'no-cards' || cardSet === undefined}
		<div class="empty"><p>We can't show the cards right now. Try again in a moment.</p></div>
	{:else}
		<GuideView {player} {cardSet} {faces} onreset={reset} />
	{/if}
</main>

<Toast message={toast} onhide={() => (toast = undefined)} />
