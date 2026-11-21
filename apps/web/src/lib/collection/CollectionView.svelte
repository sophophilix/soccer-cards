<script lang="ts">
	import { resolve } from '$app/paths';
	import type { CardId } from '@soccer-cards/game';
	import BigCard from '../cards/BigCard.svelte';
	import CardFront from '../cards/CardFront.svelte';
	import CardSlot from '../cards/CardSlot.svelte';
	import CardDetail from './CardDetail.svelte';
	import Modal from './Modal.svelte';
	import Toast from './Toast.svelte';
	import { cardViewProps, type KnownCard, type OwnedCard } from './owned-cards.ts';

	/** A trade's result: the card received, or the words that say why it was refused. */
	export type TradeOutcome =
		| { readonly ok: true; readonly received: KnownCard }
		| { readonly ok: false; readonly message: string };

	interface Props {
		owned: readonly OwnedCard[];
		favourites?: readonly CardId[];
		/** Turns the star on or off and returns the words to show. */
		onfavourite?: ((entry: KnownCard) => string) | undefined;
		ontrade?: ((entry: KnownCard) => TradeOutcome) | undefined;
	}

	const { owned, favourites = [], onfavourite, ontrade }: Props = $props();
	const COLUMNS = [3, 5, 7] as const;
	let columns = $state<(typeof COLUMNS)[number]>(5);
	let favouritesOnly = $state(false);
	let trading = $state(false);
	let openedId = $state<CardId>();
	let traded = $state<{ readonly given: KnownCard; readonly received: KnownCard }>();
	let toast = $state<{ readonly text: string }>();
	const say = (text: string): void => {
		toast = { text };
	};
	// Safari doesn't focus a button when it is tapped, so the tile is kept here to get focus back.
	let opener: HTMLElement | undefined;

	const isFavourite = (id: CardId): boolean => favourites.includes(id);
	const shown = $derived(favouritesOnly ? owned.filter((entry) => isFavourite(entry.id)) : owned);
	const opened = $derived(
		owned.find((entry): entry is KnownCard => entry.kind === 'known' && entry.id === openedId)
	);

	function tap(entry: KnownCard, tile: HTMLElement): void {
		opener = tile;
		if (trading) trade(entry);
		else openedId = entry.id;
	}

	function trade(entry: KnownCard): void {
		if (!ontrade) return;
		const outcome = ontrade(entry);
		if (outcome.ok) traded = { given: entry, received: outcome.received };
		else say(outcome.message);
	}

	function closeDetail(): void {
		openedId = undefined;
		opener?.focus();
	}

	function closeTrade(): void {
		traded = undefined;
		opener?.focus();
	}

	const label = (entry: KnownCard): string =>
		`${trading ? 'Trade' : 'Look at'} ${entry.face.displayName}` +
		(entry.count > 1 ? `, you have ${String(entry.count)}` : '');
</script>

{#if owned.length > 0}
	<div class="row">
		<span class="label" id="cols-label">Cards per row</span>
		<span class="row tight" role="group" aria-labelledby="cols-label">
			{#each COLUMNS as count (count)}
				<button
					class="btn small"
					type="button"
					aria-pressed={columns === count}
					onclick={() => (columns = count)}>{count}</button
				>
			{/each}
		</span>
		<button
			class="btn small"
			type="button"
			aria-pressed={favouritesOnly}
			onclick={() => (favouritesOnly = !favouritesOnly)}>★ Favourites</button
		>
		{#if ontrade}
			<button
				class="btn small"
				type="button"
				aria-pressed={trading}
				onclick={() => (trading = !trading)}>{trading ? 'Done trading' : 'Trade'}</button
			>
		{/if}
	</div>
	{#if trading}
		<p class="banner">
			Tap a card you don't want. You get a different card of the same kind: base for base, rare for
			rare, legend for legend, icon for icon.
		</p>
	{/if}
{/if}

{#if shown.length > 0}
	<ul class={['grid', `cols-${String(columns)}`, trading && 'trading']}>
		{#each shown as entry (entry.id)}
			<li>
				{#if entry.kind === 'known'}
					<CardSlot
						front={cardViewProps(entry.card, entry.face).front}
						label={label(entry)}
						onclick={() => {
							tap(
								entry,
								document.activeElement instanceof HTMLElement
									? document.activeElement
									: document.body
							);
						}}
					>
						{#if entry.count > 1}<span class="badge count" aria-hidden="true">×{entry.count}</span
							>{/if}
						{#if isFavourite(entry.id)}<span class="badge star" aria-hidden="true">★</span>{/if}
					</CardSlot>
				{:else}
					<div class="missing">
						<b aria-hidden="true">?</b>
						<span>Unknown card{entry.count > 1 ? ` ×${String(entry.count)}` : ''}</span>
					</div>
				{/if}
			</li>
		{/each}
	</ul>
{:else}
	<div class="empty">
		{#if owned.length > 0}
			<p>No favourites yet. Open a card and tap the star.</p>
		{:else}
			<p>No cards yet. Open a pack to start your collection.</p>
			<a class="btn primary" href={resolve('/packs')}>Open a pack</a>
		{/if}
	</div>
{/if}

{#if opened}
	<CardDetail
		entry={opened}
		favourite={onfavourite ? isFavourite(opened.id) : undefined}
		onfavourite={onfavourite &&
			((): void => {
				say(onfavourite(opened));
			})}
		ontrade={ontrade &&
			((): void => {
				const entry = opened;
				openedId = undefined;
				trade(entry);
			})}
		onclose={closeDetail}
	/>
{/if}

{#if traded}
	<Modal label="Trade done" onclose={closeTrade}>
		<h2>Trade done</h2>
		<div class="swap">
			<span class="old" aria-hidden="true"
				><CardFront {...cardViewProps(traded.given.card, traded.given.face).front} /></span
			>
			<span class="arrow" aria-hidden="true">→</span>
			<BigCard {...cardViewProps(traded.received.card, traded.received.face)} />
		</div>
		<p>
			You swapped {traded.given.face.displayName} for {traded.received.face.displayName}.
		</p>
		<div class="row center">
			<button
				class="btn primary"
				type="button"
				data-autofocus
				onclick={(event) => {
					event.currentTarget.closest('dialog')?.close();
				}}>Nice</button
			>
		</div>
	</Modal>
{/if}

<Toast message={toast} onhide={() => (toast = undefined)} />

<style>
	ul {
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.tight {
		gap: 6px;
	}
</style>
