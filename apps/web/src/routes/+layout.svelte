<script lang="ts">
	import type { Snippet } from 'svelte';
	import { onMount } from 'svelte';
	import type { PlayerState } from '@soccer-cards/game';
	import { page } from '$app/state';
	import TabBar from '../lib/ui/TabBar.svelte';
	import { SAVED_EVENT, browserStorage, createPlayerStore } from '../lib/state/player-store.ts';
	import '../app.css';

	interface Props {
		children: Snippet;
	}

	const { children }: Props = $props();
	// Unknown until the browser has read storage, so the prerendered page shows no number.
	let player = $state<PlayerState | undefined>();
	const coins = $derived(player?.coins);
	const cardCount = $derived(
		player === undefined
			? undefined
			: Object.values(player.collection).reduce((sum, copies) => sum + copies, 0)
	);

	onMount(() => {
		const store = createPlayerStore(browserStorage);
		player = store.load().state;
		// The event carries nothing, so a forged one can only make the store read what it validates.
		const onSaved = (): void => {
			player = store.load().state;
		};
		window.addEventListener(SAVED_EVENT, onSaved);
		const stop = store.subscribe((change) => {
			if (change.outcome !== 'not-saving') player = change.state;
		});
		return () => {
			window.removeEventListener(SAVED_EVENT, onSaved);
			stop();
		};
	});
</script>

<div class="page">
	<header class="masthead">
		<div class="titlerow">
			<p class="game-name">Soccer Cards</p>
			{#if coins !== undefined}
				<span class="coins" aria-live="polite">
					<span class="coin" aria-hidden="true"></span>
					<span>{coins} {coins === 1 ? 'coin' : 'coins'}</span>
				</span>
			{/if}
		</div>
		<TabBar pathname={page.url.pathname} {cardCount} />
	</header>
	{@render children()}
</div>

<style>
	.page {
		display: grid;
		gap: 22px;
		max-width: 980px;
		margin: 0 auto;
	}

	.masthead {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 12px 20px;
	}

	.titlerow {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 14px;
	}

	.game-name {
		font: 400 clamp(24px, 6vw, 36px) / 1 var(--font-display);
		letter-spacing: 0.01em;
	}
</style>
