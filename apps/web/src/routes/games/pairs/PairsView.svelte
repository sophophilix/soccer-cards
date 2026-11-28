<script lang="ts">
	import { onMount } from 'svelte';
	import { PAIRS_SIZES, pairsSizesFor } from '@soccer-cards/game';
	import type { CardId, CheckedCardSet, PairsSize, PlayerState } from '@soccer-cards/game';
	import { resolve } from '$app/paths';
	import { openCollection } from '../../../lib/collection/collection-session.ts';
	import type { CardFace } from '../../../lib/data/card-face-from-summary.ts';
	import type { PlayerStore } from '../../../lib/state/player-store.ts';
	import { CONNECTIONS_SAVE_NOTICES } from '../connections/connections-words.ts';
	import PairsPlay from './PairsPlay.svelte';
	import { sizeNote } from './pairs-words.ts';

	type Stage = 'loading' | 'failed' | 'picking' | 'playing';

	let stage = $state<Stage>('loading');
	let player = $state.raw<PlayerState>();
	let cardSet = $state.raw<CheckedCardSet>();
	let faces = $state.raw<ReadonlyMap<CardId, CardFace>>(new Map());
	let store = $state.raw<PlayerStore>();
	let size = $state<PairsSize>(6);
	let notice = $state('');

	const owned = $derived(
		player === undefined || cardSet === undefined
			? 0
			: cardSet.filter((card) => (player?.collection[card.id] ?? 0) > 0).length
	);
	const playable = $derived(
		player === undefined || cardSet === undefined ? [] : pairsSizesFor(player, cardSet)
	);

	onMount(() => {
		void open();
	});

	async function open(): Promise<void> {
		stage = 'loading';
		notice = '';
		const session = await openCollection();
		player = session.state;
		if (!session.ok) {
			stage = 'failed';
			return;
		}
		({ store, cardSet, faces } = session);
		if (session.outcome === 'not-saving') notice = CONNECTIONS_SAVE_NOTICES['not-saving'];
		stage = 'picking';
	}

	function start(picked: PairsSize): void {
		// A board played before has paid coins, so the next one starts from what was saved.
		const saved = store?.load();
		if (saved !== undefined && saved.outcome !== 'not-saving') player = saved.state;
		size = picked;
		stage = 'playing';
	}
</script>

<svelte:head>
	<title>Pairs · Soccer Cards</title>
</svelte:head>

<main>
	<h1 class="sr-only">Pairs</h1>
	{#if notice}<p class="banner">{notice}</p>{/if}
	{#if stage === 'loading'}
		<p>Getting your cards ready…</p>
	{:else if stage === 'failed'}
		<div>
			<h2>The game can't start right now</h2>
			<p>We can't find the players. Check you are online, then try again.</p>
			<div class="row">
				<button type="button" class="btn primary" onclick={() => void open()}>Try again</button>
				<a class="btn" href={resolve('/games')}>Back to games</a>
			</div>
		</div>
	{:else if stage === 'playing' && player !== undefined && cardSet !== undefined && store !== undefined}
		<div class="row">
			<button
				type="button"
				class="btn small"
				onclick={() => {
					stage = 'picking';
				}}>Change board</button
			>
		</div>
		<PairsPlay
			{size}
			{player}
			{cardSet}
			{faces}
			{store}
			onOtherSize={() => {
				stage = 'picking';
			}}
		/>
	{:else}
		<div>
			<a class="btn small" href={resolve('/games')}>Back to games</a>
		</div>
		<h2>Pairs</h2>
		<p>
			Cards are face down. Turn two cards. If they are the same player, they stay up. If not, they
			turn back, so remember where they were. Pick how many pairs to find.
		</p>
		<p class="muted">
			Use as few turns as you can. A turn is two cards. You win coins for every board.
		</p>
		{#if owned === 0}
			<p>
				You have no cards yet. <a href={resolve('/packs')}>Open a pack</a> to get some.
			</p>
		{/if}
		<div class="sizes">
			{#each PAIRS_SIZES as option (option)}
				<div class="size">
					<button
						type="button"
						class={['btn', playable.includes(option) && 'primary']}
						disabled={!playable.includes(option)}
						onclick={() => {
							start(option);
						}}>{option} pairs</button
					>
					<span class="muted">{sizeNote(option, owned)}</span>
				</div>
			{/each}
		</div>
	{/if}
</main>

<style>
	.sizes {
		display: grid;
		gap: 12px;
		max-width: 520px;
	}

	.size {
		display: grid;
		gap: 6px;
		justify-items: start;
	}
</style>
