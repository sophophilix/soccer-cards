<!-- The Packs view. The start page shows it too, so a first visit lands here with no redirect. -->
<script lang="ts">
	import { onMount } from 'svelte';
	import { LUCKY_ODDS, PACK_CONTENTS, createRandom, packCostCoins } from '@soccer-cards/game';
	import type { CheckedCardSet, PackKind, PlayerState } from '@soccer-cards/game';
	import CardFront from '../../lib/cards/CardFront.svelte';
	import { TIER_NAMES } from '../../lib/cards/card-front.ts';
	import { loadCardSet } from '../../lib/data/load-card-set.ts';
	import {
		addPackAndSave,
		frontOf,
		openPackAndSave,
		randomSeed,
		revealOrder
	} from '../../lib/packs/pack-session.ts';
	import { browserStorage, createPlayerStore } from '../../lib/state/player-store.ts';
	import type { LoadOutcome, SaveResult } from '../../lib/state/player-store.ts';

	const KINDS: readonly PackKind[] = ['standard', 'jumbo'];
	const PACK_NAMES = { standard: 'Pack', jumbo: 'Jumbo pack' } as const;
	const NOT_SAVING = "Your cards can't be saved on this device. You can still open packs.";
	const LOAD_NOTICES: Record<LoadOutcome, string> = {
		loaded: '',
		'new-player': '',
		'replaced-invalid': "We couldn't read your saved cards, so the game starts again.",
		'replaced-newer-version': 'Your saved cards are from a newer game, so this one starts again.',
		'not-saving': NOT_SAVING
	};
	const SAVE_NOTICES = {
		'not-saving': NOT_SAVING,
		'storage-full': 'This device is full, so your cards were not saved.',
		'changed-in-another-tab': 'The game is open in another tab, so your cards were not saved here.'
	} as const;
	const ODDS =
		`Each lucky card: Rare ${String(LUCKY_ODDS.rare)} in 100 · ` +
		`Legend ${String(LUCKY_ODDS.legend)} in 100 · Icon ${String(LUCKY_ODDS.icon)} in 100`;

	type Data =
		{ status: 'loading' } | { status: 'failed' } | { status: 'ready'; cardSet: CheckedCardSet };
	let data = $state.raw<Data>({ status: 'loading' });
	let player = $state.raw<PlayerState>();
	let shown = $state(0);
	let notice = $state('');
	let announcement = $state('');
	const store = createPlayerStore(browserStorage);

	const pack = $derived(
		data.status === 'ready' && player?.pendingPack
			? revealOrder(player.pendingPack.cardIds, data.cardSet)
			: []
	);
	const current = $derived(pack[shown]);
	const isLast = $derived(shown >= pack.length - 1);
	const total = $derived(Object.values(player?.collection ?? {}).reduce((sum, n) => sum + n, 0));

	onMount(() => {
		const loaded = store.load();
		player = loaded.state;
		notice = LOAD_NOTICES[loaded.outcome];
		// A pack opened before a reload goes straight to the summary.
		shown = player.pendingPack?.cardIds.length ?? 0;
		void fetchCards();
	});

	async function fetchCards(): Promise<void> {
		data = { status: 'loading' };
		const result = await loadCardSet((path) => fetch(path));
		data = result.ok ? { status: 'ready', cardSet: result.value } : { status: 'failed' };
	}

	function noticeAfter(saved: SaveResult): string {
		return saved.ok ? notice : SAVE_NOTICES[saved.reason];
	}

	function isFree(state: PlayerState, kind: PackKind): boolean {
		return kind === 'standard' && state.freePacks > 0;
	}

	function openLabel(state: PlayerState, kind: PackKind): string {
		const cost = String(packCostCoins(kind));
		if (isFree(state, kind)) return `Open free pack (${String(state.freePacks)} left)`;
		return state.coins >= packCostCoins(kind) ? `Open · ${cost} coins` : `Need ${cost} coins`;
	}

	function open(kind: PackKind): void {
		if (player === undefined || data.status !== 'ready') return;
		const random = createRandom(randomSeed());
		const result = openPackAndSave(store, player, { kind, cardSet: data.cardSet, random });
		if (!result.ok) {
			// A double tap is refused as pack-pending, and the first tap already opened the pack.
			if (result.reason === 'not-enough-cards') announcement = 'There are not enough cards yet.';
			return;
		}
		player = result.value;
		shown = 0;
		notice = noticeAfter(result.saved);
	}

	function add(): void {
		if (player === undefined) return;
		const count = player.pendingPack?.cardIds.length ?? 0;
		// A double tap finds no pending pack and changes nothing.
		const result = addPackAndSave(store, player);
		if (!result.ok) return;
		player = result.value;
		notice = noticeAfter(result.saved);
		announcement = `${String(count)} cards added to your collection.`;
	}
</script>

<svelte:head>
	<title>Packs · Soccer Cards</title>
</svelte:head>

<main>
	<h1>Packs</h1>
	{#if notice}<p class="notice">{notice}</p>{/if}
	<p role="status">{announcement}</p>
	{#if data.status === 'failed'}
		<p>We can't get the cards right now. Check you are online, then try again.</p>
		<button type="button" class="btn primary" onclick={() => void fetchCards()}>Try again</button>
	{:else if data.status === 'loading' || player === undefined}
		<p>Getting the cards ready…</p>
	{:else if player.pendingPack === null}
		<h2>Open a pack</h2>
		<p>Cards in your collection: {total}</p>
		<div class="shelf">
			{#each KINDS as kind (kind)}
				<section class="offer">
					<h3>{PACK_NAMES[kind]}</h3>
					<p>{PACK_CONTENTS[kind].base} base cards and {PACK_CONTENTS[kind].lucky} lucky cards</p>
					<button
						type="button"
						class="btn primary"
						disabled={!isFree(player, kind) && player.coins < packCostCoins(kind)}
						onclick={() => {
							open(kind);
						}}>{openLabel(player, kind)}</button
					>
				</section>
			{/each}
		</div>
		<p class="odds">{ODDS}</p>
	{:else if current !== undefined}
		{@const front = frontOf(current)}
		{@const copies = player.collection[current.id] ?? 0}
		<h2>Card {shown + 1} of {pack.length}</h2>
		<p>{TIER_NAMES[front.tier]} · {copies > 0 ? `You have ${String(copies)}` : 'New!'}</p>
		{#key shown}<div class="spot"><CardFront {...front} /></div>{/key}
		<div class="row">
			<button type="button" class="btn primary" onclick={() => (shown += 1)}>
				{isLast ? `See all ${String(pack.length)}` : 'Next card'}
			</button>
			{#if !isLast}
				<button type="button" class="btn" onclick={() => (shown = pack.length)}>
					Skip to all cards
				</button>
			{/if}
		</div>
	{:else}
		<h2>Your {pack.length} cards</h2>
		<ul class="grid">
			{#each pack as card, index (index)}<li><CardFront {...frontOf(card)} /></li>{/each}
		</ul>
		<button type="button" class="btn primary" onclick={add}>Add to my collection</button>
	{/if}
</main>

<style>
	.shelf,
	.row {
		display: flex;
		flex-wrap: wrap;
		gap: 12px;
	}
	.offer {
		display: grid;
		gap: 8px;
		justify-items: start;
	}
	h2,
	h3 {
		margin: 0;
		font: 800 18px/1.2 var(--font-data);
		letter-spacing: 0.1em;
		text-transform: uppercase;
	}
	.notice {
		font-weight: 700;
	}
	.odds {
		font: 800 15px/1.3 var(--font-data);
		letter-spacing: 0.06em;
		text-transform: uppercase;
	}
	.btn {
		padding: 12px 18px 11px;
		border: 2px solid var(--fg);
		border-radius: 999px;
		background: var(--surface);
		color: var(--fg);
		box-shadow: 0 3px 0 var(--fg);
		font: 800 17px/1 var(--font-data);
		letter-spacing: 0.08em;
		text-transform: uppercase;
		cursor: pointer;
	}
	.btn.primary {
		background: var(--accent);
		color: var(--accent-ink);
	}
	.btn:disabled {
		opacity: 0.5;
		box-shadow: none;
		cursor: not-allowed;
	}
	.spot {
		width: min(100%, 300px);
		animation: arrive 0.45s cubic-bezier(0.3, 1.3, 0.5, 1) both;
	}
	@keyframes arrive {
		from {
			transform: translateY(40px) rotate(-8deg) scale(0.7);
			opacity: 0;
		}
	}
	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(96px, 1fr));
		gap: 10px;
		margin: 0;
		padding: 0;
		list-style: none;
	}
	@media (prefers-reduced-motion: reduce) {
		.spot {
			animation: none;
		}
	}
</style>
