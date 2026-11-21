<!-- The Match view: loads the cards and the player, then shows the screen for what the player has. -->
<script lang="ts">
	import { onMount } from 'svelte';
	import {
		DIVISIONS,
		STANDARD_PACK_COST_COINS,
		TEAM_SIZE,
		WINS_TO_GO_UP
	} from '@soccer-cards/game';
	import type { CardId, CheckedCardSet, PlayerState } from '@soccer-cards/game';
	import { resolve } from '$app/paths';
	import type { CardFace } from '../../lib/data/card-face-from-summary.ts';
	import { loadCardSet } from '../../lib/data/load-card-set.ts';
	import { ownedCardIds } from '../../lib/match/play-match.ts';
	import { browserStorage, createPlayerStore } from '../../lib/state/player-store.ts';
	import type { LoadOutcome } from '../../lib/state/player-store.ts';
	import { DIVISION_NAMES, lockedText } from './match-words.ts';

	const NOT_SAVING = "Your progress can't be saved on this device. You can still play.";
	const RESTARTED = "We couldn't use your saved cards, so the game starts again.";
	const LOAD_NOTICES: Record<LoadOutcome, string> = {
		loaded: '',
		'new-player': '',
		'replaced-invalid': RESTARTED,
		'replaced-newer-version': RESTARTED,
		'not-saving': NOT_SAVING
	};

	interface Ready {
		readonly status: 'ready';
		readonly cardSet: CheckedCardSet;
		readonly faces: ReadonlyMap<CardId, CardFace>;
	}
	type Data = { readonly status: 'loading' } | { readonly status: 'failed' } | Ready;
	let data = $state.raw<Data>({ status: 'loading' });
	let player = $state.raw<PlayerState>();
	let notice = $state('');
	const store = createPlayerStore(browserStorage);

	// A card the set no longer has is not counted and not shown.
	const owned = $derived.by(() => {
		if (data.status !== 'ready' || player === undefined) return [];
		const known = new Set(data.cardSet.map((card) => card.id));
		return ownedCardIds(player).filter((id) => known.has(id));
	});

	const division = $derived(DIVISIONS.find((each) => each.id === player?.division) ?? DIVISIONS[0]);

	onMount(() => {
		const loaded = store.load();
		player = loaded.state;
		notice = LOAD_NOTICES[loaded.outcome];
		void fetchCards();
	});

	async function fetchCards(): Promise<void> {
		data = { status: 'loading' };
		const result = await loadCardSet((path) => fetch(path));
		data = result.ok
			? { status: 'ready', cardSet: result.value, faces: result.faces }
			: { status: 'failed' };
	}
</script>

<svelte:head>
	<title>Match · Soccer Cards</title>
</svelte:head>

<main>
	<h1>Match</h1>
	{#if notice}<p class="notice">{notice}</p>{/if}
	{#if data.status === 'failed'}
		<p>We can't get the cards right now. Check you are online, then try again.</p>
		<button type="button" class="btn primary" onclick={() => void fetchCards()}>Try again</button>
	{:else if data.status === 'loading' || player === undefined}
		<p>Getting the cards ready…</p>
	{:else if owned.length < TEAM_SIZE}
		<h2>Match is locked</h2>
		<p>{lockedText(owned.length, player.freePacks)}</p>
		<a class="btn primary" href={resolve('/packs')}
			>{player.freePacks > 0 || player.coins >= STANDARD_PACK_COST_COINS
				? 'Open packs'
				: 'Go to packs'}</a
		>
	{:else}
		<h2>Pick your team</h2>
		<div class="row">
			<span class="chip legend"
				>{DIVISION_NAMES[division.id]} · {division.id === 'champions-league'
					? 'top division'
					: `${String(player.divisionWins)} of ${String(WINS_TO_GO_UP)} wins to go up`}</span
			>
			<span class="chip">The AI opens {division.packs} packs · win {division.winCoins} coins</span>
			<span class="muted">Wins {player.wins} · Losses {player.losses}</span>
		</div>
	{/if}
</main>

<style>
	/* The pick screen is a child, so these rules reach it through main. */
	main :global(h2),
	main :global(h3) {
		margin: 0;
		font: 800 18px/1.2 var(--font-data);
		letter-spacing: 0.1em;
		text-transform: uppercase;
	}
	main :global(.row) {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 10px;
	}
	main :global(.muted) {
		color: var(--muted);
	}
	main :global(.chip) {
		padding: 6px 9px 5px;
		border-radius: 4px;
		background: var(--fg);
		color: var(--bg);
		font: 800 15px/1.2 var(--font-data);
		letter-spacing: 0.12em;
		text-transform: uppercase;
	}
	main :global(.chip.legend),
	main :global(.btn[aria-pressed='true']) {
		background: var(--booking);
		color: var(--booking-ink);
	}
	main :global(.btn) {
		padding: 12px 18px 11px;
		border: 2px solid var(--fg);
		border-radius: 999px;
		background: var(--surface);
		color: var(--fg);
		box-shadow: 0 3px 0 var(--fg);
		font: 800 17px/1 var(--font-data);
		letter-spacing: 0.08em;
		text-transform: uppercase;
		text-decoration: none;
		cursor: pointer;
	}
	main :global(.btn.primary) {
		background: var(--accent);
		color: var(--accent-ink);
	}
	main :global(.btn:disabled) {
		opacity: 0.5;
		box-shadow: none;
		cursor: not-allowed;
	}
</style>
