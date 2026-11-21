<!-- The Match view: loads the cards and the player, then shows the screen for what the player has. -->
<script lang="ts">
	import { onMount } from 'svelte';
	import {
		DIVISIONS,
		createRandom,
		STANDARD_PACK_COST_COINS,
		TEAM_SIZE,
		WINS_TO_GO_UP
	} from '@soccer-cards/game';
	import type { CardId, CheckedCardSet, Formation, PlayerState, Tactic } from '@soccer-cards/game';
	import { resolve } from '$app/paths';
	import type { CardFace } from '../../lib/data/card-face-from-summary.ts';
	import { loadCardSet } from '../../lib/data/load-card-set.ts';
	import { finishMatchAndSave, ownedCardIds, startMatch } from '../../lib/match/play-match.ts';
	import type { FinishedMatch, PlayedMatch } from '../../lib/match/play-match.ts';
	import { randomSeed } from '../../lib/packs/pack-session.ts';
	import { browserStorage, createPlayerStore } from '../../lib/state/player-store.ts';
	import type { LoadOutcome } from '../../lib/state/player-store.ts';
	import { DIVISION_NAMES, lockedText } from './match-words.ts';
	import MatchStage from './MatchStage.svelte';
	import PickTeam from './PickTeam.svelte';

	const NOT_SAVING = "Your progress can't be saved on this device. You can still play.";
	const SAVE_NOTICES = {
		'not-saving': "Your results can't be saved on this device. You can still play.",
		'storage-full': 'This device is full, so your result was not saved.',
		'changed-in-another-tab': 'The game is open in another tab, so your result was not saved here.'
	} as const;
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
	let formation = $state<Formation>('4-4-2');
	let tactic = $state<Tactic>('attack');
	let team = $state.raw<readonly CardId[]>();
	let match = $state.raw<PlayedMatch>();
	let finished = $state.raw<FinishedMatch>();
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

	function chooseFormation(next: Formation): void {
		formation = next;
	}

	function chooseTactic(next: Tactic): void {
		tactic = next;
	}

	function kickOff(picked: readonly CardId[]): void {
		// A second tap starts nothing.
		if (match !== undefined || data.status !== 'ready' || player === undefined) return;
		team = picked;
		const started = startMatch(
			player,
			data.cardSet,
			{ formation, tactic, team: picked },
			createRandom(randomSeed())
		);
		if (started.ok) {
			match = started.value;
			finished = undefined;
		} else {
			notice = "We couldn't start the match. Check your team and try again.";
		}
	}

	// The whole result was known at kick-off. This saves it once, at full time.
	function fullTime(won: boolean): void {
		if (player === undefined || finished !== undefined) return;
		finished = finishMatchAndSave(store, player, won);
		player = finished.state;
		if (!finished.saved.ok) notice = SAVE_NOTICES[finished.saved.reason];
	}

	function playAgain(): void {
		match = undefined;
		finished = undefined;
	}

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
	<h1 class="sr-only">Match</h1>
	{#if notice}<p class="banner">{notice}</p>{/if}
	{#if data.status === 'failed'}
		<p>We can't get the cards right now. Check you are online, then try again.</p>
		<button type="button" class="btn primary" onclick={() => void fetchCards()}>Try again</button>
	{:else if data.status === 'loading' || player === undefined}
		<p>Getting the cards ready…</p>
	{:else if owned.length < TEAM_SIZE}
		<div class="empty">
			<h2>Match is locked</h2>
			<p>{lockedText(owned.length, player.freePacks)}</p>
			<a class="btn primary" href={resolve('/packs')}
				>{player.freePacks > 0 || player.coins >= STANDARD_PACK_COST_COINS
					? 'Open packs'
					: 'Go to packs'}</a
			>
		</div>
	{:else if match !== undefined}
		<h2>The match</h2>
		<MatchStage
			{match}
			cardSet={data.cardSet}
			faces={data.faces}
			coins={player.coins}
			{finished}
			onFullTime={fullTime}
			onAgain={playAgain}
		/>
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
		<PickTeam
			cardSet={data.cardSet}
			faces={data.faces}
			{owned}
			{formation}
			{tactic}
			initialTeam={team}
			onKickOff={kickOff}
			onFormation={chooseFormation}
			onTactic={chooseTactic}
		/>
	{/if}
</main>
