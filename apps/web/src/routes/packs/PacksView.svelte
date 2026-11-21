<!-- The Packs view. The start page shows it too, so a first visit lands here with no redirect. -->
<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { LUCKY_ODDS, PACK_CONTENTS, createRandom, packCostCoins } from '@soccer-cards/game';
	import type { CardId, CheckedCardSet, PackKind, PlayerState } from '@soccer-cards/game';
	import BigCard from '../../lib/cards/BigCard.svelte';
	import { tearPack } from '../../lib/ui/motion.ts';
	import CardSlot from '../../lib/cards/CardSlot.svelte';
	import { TIER_NAMES } from '../../lib/cards/card-front.ts';
	import type { CardFace } from '../../lib/data/card-face-from-summary.ts';
	import { loadCardSet } from '../../lib/data/load-card-set.ts';
	import {
		addPackAndSave,
		openPackAndSave,
		randomSeed,
		revealOrder
	} from '../../lib/packs/pack-session.ts';
	import { browserStorage, createPlayerStore } from '../../lib/state/player-store.ts';
	import type { LoadOutcome, SaveResult } from '../../lib/state/player-store.ts';
	import PackCardDialog from './PackCardDialog.svelte';
	import { cardPropsOf, type CardProps } from './card-props.ts';

	const KINDS: readonly PackKind[] = ['standard', 'jumbo'];
	// The words on the pack art, two lines each, as in the prototype.
	const PACK_ART = { standard: ['Soccer', 'Cards'], jumbo: ['Jumbo', 'Pack'] } as const;
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
	const REFUSALS = {
		'not-enough-cards': 'There are not enough cards yet.',
		'not-enough-coins': 'You do not have enough coins for that pack.',
		'pack-pending': 'You already have a pack to look at. Add it to your collection first.'
	} as const;
	const ODDS =
		`Each lucky card: Rare ${String(LUCKY_ODDS.rare)} in 100 · ` +
		`Legend ${String(LUCKY_ODDS.legend)} in 100 · Icon ${String(LUCKY_ODDS.icon)} in 100`;

	interface Ready {
		readonly status: 'ready';
		readonly cardSet: CheckedCardSet;
		readonly faces: ReadonlyMap<CardId, CardFace>;
	}
	type Data = { readonly status: 'loading' } | { readonly status: 'failed' } | Ready;
	let data = $state.raw<Data>({ status: 'loading' });
	let player = $state.raw<PlayerState>();
	let shown = $state(0);
	let notice = $state('');
	let announcement = $state('');
	// True while a step runs, so a second tap can't start another on an old state.
	let isBusy = $state(false);
	// The pack that is tearing open. The shelf stays up until the tear has played.
	let tearing = $state<PackKind>();
	// The pack art, so GSAP can tear the one the player opened.
	const packArt: Partial<Record<PackKind, HTMLDivElement>> = {};
	// The summary card shown large, if any.
	let detail = $state<CardProps>();
	// The next step's main control or heading, so focus never falls to the page.
	let nextButton = $state<HTMLButtonElement>();
	let addButton = $state<HTMLButtonElement>();
	let shelfHeading = $state<HTMLHeadingElement>();
	const store = createPlayerStore(browserStorage);

	// Each card of the pending pack with what it shows, the best last.
	const pack = $derived.by(() => {
		if (data.status !== 'ready' || !player?.pendingPack) return [];
		const { cardSet, faces } = data;
		return revealOrder(player.pendingPack.cardIds, cardSet).flatMap((card) => {
			const face = faces.get(card.id);
			return face === undefined ? [] : [{ id: card.id, props: cardPropsOf(card, face) }];
		});
	});
	const current = $derived(pack[shown]);
	const isLast = $derived(shown >= pack.length - 1);
	const isSealed = $derived(player?.pendingPack === null || tearing !== undefined);

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
		data = result.ok
			? { status: 'ready', cardSet: result.value, faces: result.faces }
			: { status: 'failed' };
	}

	/** Moves focus to a control the next screen shows, once the screen has changed. */
	async function focusAfterStep(target: () => HTMLElement | undefined): Promise<void> {
		await tick();
		target()?.focus();
	}

	/** Runs one step, and holds the buttons until the screen shows its result. */
	async function runStep(step: () => void): Promise<void> {
		if (isBusy || tearing !== undefined) return;
		isBusy = true;
		announcement = '';
		try {
			step();
			await tick();
		} finally {
			isBusy = false;
		}
	}

	function noticeAfter(saved: SaveResult): string {
		return saved.ok ? notice : SAVE_NOTICES[saved.reason];
	}

	function isFree(state: PlayerState, kind: PackKind): boolean {
		return kind === 'standard' && state.freePacks > 0;
	}

	function canOpen(state: PlayerState, kind: PackKind): boolean {
		return isFree(state, kind) || state.coins >= packCostCoins(kind);
	}

	function buyLabel(state: PlayerState, kind: PackKind): string {
		const cost = String(packCostCoins(kind));
		if (isFree(state, kind)) return `Open free pack (${String(state.freePacks)} left)`;
		if (state.coins < packCostCoins(kind)) return `Need ${cost} coins`;
		return kind === 'jumbo' ? `Open jumbo · ${cost} coins` : `Open pack · ${cost} coins`;
	}

	function packLabel(kind: PackKind): string {
		const { base, lucky } = PACK_CONTENTS[kind];
		const name = kind === 'jumbo' ? 'Jumbo pack' : 'Pack';
		return `${name} of ${String(base + lucky)} cards: ${String(base)} base and ${String(lucky)} lucky cards`;
	}

	function open(kind: PackKind): void {
		if (player === undefined || data.status !== 'ready') return;
		if (!canOpen(player, kind)) {
			announcement = `You need ${String(packCostCoins(kind))} coins. Win matches to earn them.`;
			return;
		}
		const random = createRandom(randomSeed());
		const result = openPackAndSave(store, player, { kind, cardSet: data.cardSet, random });
		if (!result.ok) {
			announcement = REFUSALS[result.reason];
			return;
		}
		// Saved before the tear, so a reload mid-tear still keeps the cards.
		player = result.value;
		shown = 0;
		notice = noticeAfter(result.saved);
		tearing = kind;
		const art = packArt[kind];
		void (art ? tearPack(art) : Promise.resolve()).then(() => {
			tearing = undefined;
			void focusAfterStep(() => nextButton);
		});
	}

	function show(index: number): void {
		announcement = '';
		shown = index;
		if (index >= pack.length) void focusAfterStep(() => addButton);
	}

	async function add(): Promise<void> {
		if (player === undefined) return;
		const count = player.pendingPack?.cardIds.length ?? 0;
		const result = addPackAndSave(store, player);
		if (!result.ok) return;
		player = result.value;
		notice = noticeAfter(result.saved);
		announcement = `${String(count)} cards added to your collection.`;
		await goto(resolve('/cards'));
	}
</script>

<svelte:head>
	<title>Packs · Soccer Cards</title>
</svelte:head>

<main class="view">
	<h1 class="sr-only">Packs</h1>
	{#if notice}<p class="banner">{notice}</p>{/if}
	<p role="status" class="sr-only">{announcement}</p>
	{#if data.status === 'failed'}
		<div class="empty">
			<p>We can't get the cards right now. Check you are online, then try again.</p>
			<button type="button" class="btn primary" onclick={() => void fetchCards()}>Try again</button>
		</div>
	{:else if data.status === 'loading' || player === undefined}
		<p class="muted">Getting the cards ready…</p>
	{:else if isSealed}
		<div class="packzone">
			<h2 tabindex="-1" bind:this={shelfHeading}>Open a pack</h2>
			<div class="shelf">
				{#each KINDS as kind (kind)}
					{@const contents = PACK_CONTENTS[kind]}
					<div class="offer">
						<!-- The art sits outside the button, so the button's name is all it says. -->
						<div class={['pack', kind === 'jumbo' && 'jumbo']} bind:this={packArt[kind]}>
							<!-- Decorative lettering, left out of contrast scans like the card art. -->
							<span class="contents" aria-hidden="true" data-art>
								<span class="strip"></span>
								<span class="name">{PACK_ART[kind][0]}<br />{PACK_ART[kind][1]}</span>
								<span class="ten">{contents.base + contents.lucky} CARDS</span>
								<span class="mix">{contents.base} BASE<br />{contents.lucky} LUCKY</span>
							</span>
							<button
								type="button"
								class="cover"
								aria-label={packLabel(kind)}
								disabled={!canOpen(player, kind) || tearing !== undefined}
								onclick={() =>
									void runStep(() => {
										open(kind);
									})}
							></button>
						</div>
						<button
							type="button"
							class="btn primary"
							disabled={isBusy || tearing !== undefined || !canOpen(player, kind)}
							onclick={() =>
								void runStep(() => {
									open(kind);
								})}>{buyLabel(player, kind)}</button
						>
					</div>
				{/each}
			</div>
			<p class="odds">{ODDS}</p>
			<p class="muted">
				{player.freePacks > 0
					? 'You start with 2 free packs. After that, win matches to earn coins.'
					: 'Win matches to earn coins. Higher divisions pay more.'}
			</p>
		</div>
	{:else if current !== undefined}
		{@const copies = player.collection[current.id] ?? 0}
		{@const tier = current.props.front.tier}
		{@const isStar = tier === 'LEGEND' || tier === 'ICON'}
		<div class="reveal">
			<div class="row center">
				<span class="chip">Card {shown + 1} of {pack.length}</span>
				<span class={['chip', isStar && tier.toLowerCase()]}>{TIER_NAMES[tier]}</span>
				{#if copies > 0}
					<span class="chip">You have {copies}</span>
				{:else}
					<span class="chip new">New!</span>
				{/if}
			</div>
			{#key shown}
				<div class={['spot', isStar && tier.toLowerCase()]} data-testid="spot">
					<!-- A tap on the card moves on, as in the prototype. Keyboard and screen reader users
					     have the Next card button below, so the card itself is not a second control. -->
					<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
					<div
						class="cardtap"
						onclick={() => {
							show(shown + 1);
						}}
					>
						<BigCard front={current.props.front} arrive />
					</div>
				</div>
			{/key}
			<div class="row center">
				<button
					type="button"
					class="btn primary"
					bind:this={nextButton}
					onclick={() => {
						show(shown + 1);
					}}
				>
					{isLast ? `See all ${String(pack.length)}` : 'Next card'}
				</button>
				{#if !isLast}
					<button
						type="button"
						class="btn"
						onclick={() => {
							show(pack.length);
						}}
					>
						Skip to all cards
					</button>
				{/if}
			</div>
		</div>
	{:else}
		<div class="reveal">
			<h2>Your {pack.length} cards</h2>
			<div class="grid summary">
				{#each pack as card, index (index)}
					<CardSlot
						front={card.props.front}
						label={`Look at ${card.props.front.displayName}`}
						onclick={() => {
							detail = card.props;
						}}
					/>
				{/each}
			</div>
			<button
				type="button"
				class="btn primary"
				bind:this={addButton}
				disabled={isBusy}
				onclick={() =>
					void runStep(() => {
						void add();
					})}
			>
				Add to my collection
			</button>
		</div>
	{/if}
</main>

{#if detail !== undefined}
	<PackCardDialog
		card={detail}
		onclose={() => {
			detail = undefined;
		}}
	/>
{/if}

<style>
	.cardtap {
		all: unset;
		display: grid;
		justify-items: center;
		width: min(100%, 320px, 52vh);
		border-radius: 5cqw;
		cursor: pointer;
	}
	.cardtap :global(.big) {
		width: 100%;
	}
</style>
