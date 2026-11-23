<!-- The Transfer Trail view: loads the players and their careers, then plays one round. -->
<script lang="ts">
	import { onMount } from 'svelte';
	import {
		checkTrailInRound,
		createRandom,
		finishTrailRound,
		openPaidRound,
		startTrailRound
	} from '@soccer-cards/game';
	import type { Card, ClubId, PaidTrailRound, PlayerState, TrailCheck } from '@soccer-cards/game';
	import { resolve } from '$app/paths';
	import type { CardFace } from '../../../lib/data/card-face-from-summary.ts';
	import { clubNamesFromList } from '../../../lib/data/card-face-from-summary.ts';
	import { loadCardSet, CLUBS_PATH } from '../../../lib/data/load-card-set.ts';
	import { loadCareer } from '../../../lib/data/load-career.ts';
	import type { Career } from '../../../lib/data/load-career.ts';
	import { randomSeed } from '../../../lib/packs/pack-session.ts';
	import { browserStorage, createPlayerStore } from '../../../lib/state/player-store.ts';
	import { cardPropsOf } from '../../packs/card-props.ts';
	import TrailBoard from './TrailBoard.svelte';
	import { TRAIL_SAVE_NOTICES, finishText } from './trail-words.ts';

	// Careers are loaded for more players than a round needs, because some will not load.
	const CANDIDATE_PLAYERS = 12;

	type Stage =
		| { readonly status: 'loading' }
		| { readonly status: 'cannot-start' }
		| { readonly status: 'playing' | 'finished' };

	let stage = $state<Stage>({ status: 'loading' });
	let player = $state.raw<PlayerState>();
	let paid = $state.raw<PaidTrailRound>();
	let cards = $state.raw<ReadonlyMap<string, { card: Card; face: CardFace }>>(new Map());
	let clubNames = $state.raw<ReadonlyMap<ClubId, string>>(new Map());
	let index = $state(0);
	let rightCount = $state(0);
	let notice = $state('');
	let heading = $state<HTMLElement>();
	const store = createPlayerStore(browserStorage);

	onMount(() => {
		const loaded = store.load();
		player = loaded.state;
		if (loaded.outcome === 'not-saving') notice = TRAIL_SAVE_NOTICES['not-saving'];
		void begin();
	});

	function nameOf(clubId: ClubId): string {
		return clubNames.get(clubId) ?? clubId;
	}

	async function begin(): Promise<void> {
		stage = { status: 'loading' };
		const random = createRandom(randomSeed());
		const fetchFile = (path: string): Promise<Response> => fetch(path);
		const [set, clubsBody] = await Promise.all([
			loadCardSet(fetchFile),
			fetchFile(CLUBS_PATH)
				.then((response) => (response.ok ? response.json() : undefined))
				.catch(() => undefined) as Promise<unknown>
		]);
		if (!set.ok) {
			stage = { status: 'cannot-start' };
			return;
		}
		const names = clubNamesFromList(clubsBody);
		const known = new Map(
			set.value.flatMap((card) => {
				const face = set.faces.get(card.id);
				return face === undefined ? [] : [[card.id, { card, face }] as const];
			})
		);
		const picked = random.sample([...known.keys()], Math.min(CANDIDATE_PLAYERS, known.size));
		const loaded = await Promise.all(picked.map((id) => loadCareer(fetchFile, id, names)));
		const careers = loaded.filter((career): career is Career => career !== undefined);
		const started = startTrailRound(careers, random);
		if (!started.ok) {
			stage = { status: 'cannot-start' };
			return;
		}
		clubNames = new Map(
			careers.flatMap((career) =>
				career.spells.map((spell) => [spell.clubId, spell.displayName] as const)
			)
		);
		cards = known;
		paid = openPaidRound(started.value);
		index = 0;
		rightCount = 0;
		stage = { status: 'playing' };
	}

	function persist(next: PlayerState): void {
		player = next;
		const saved = store.save(next);
		if (!saved.ok) notice = TRAIL_SAVE_NOTICES[saved.reason];
	}

	function check(answer: readonly ClubId[]): TrailCheck | undefined {
		const step = paid?.round.steps[index];
		if (paid === undefined || player === undefined || step === undefined) return undefined;
		const result = checkTrailInRound(paid, player, step.playerId, answer);
		if (!result.ok) return undefined;
		const { check: checked, paid: nextPaid, state } = result.value;
		// Only a first check changes the round, and only a first right check pays.
		if (nextPaid !== paid && checked.isRight) rightCount += 1;
		paid = nextPaid;
		if (state !== player) persist(state);
		return checked;
	}

	async function next(): Promise<void> {
		if (paid === undefined || player === undefined || stage.status !== 'playing') return;
		if (index < paid.round.steps.length - 1) {
			index += 1;
			return;
		}
		const finished = finishTrailRound(paid, player);
		if (!finished.ok) return;
		paid = finished.value.paid;
		persist(finished.value.state);
		stage = { status: 'finished' };
		await Promise.resolve();
		heading?.focus();
	}
</script>

<svelte:head>
	<title>Transfer Trail · Soccer Cards</title>
</svelte:head>

<main>
	<h1 class="sr-only">Transfer Trail</h1>
	{#if notice}<p class="banner">{notice}</p>{/if}
	{#if stage.status === 'loading'}
		<p>Getting the players ready…</p>
	{:else if stage.status === 'cannot-start' || paid === undefined}
		<div class="empty">
			<h2>The game can't start right now</h2>
			<p>We can't get the players' careers. Check you are online, then try again.</p>
			<div class="row">
				<button type="button" class="btn primary" onclick={() => void begin()}>Try again</button>
				<a class="btn" href={resolve('/games')}>Back to games</a>
			</div>
		</div>
	{:else if stage.status === 'finished'}
		<div class="done">
			<h2 tabindex="-1" bind:this={heading}>Round finished!</h2>
			<p>{finishText(rightCount, paid.round.steps.length)}</p>
			<div class="row center">
				<button type="button" class="btn primary" onclick={() => void begin()}>Play again</button>
				<a class="btn" href={resolve('/games')}>Back to games</a>
			</div>
		</div>
	{:else}
		{@const step = paid.round.steps[index]}
		{@const found = step === undefined ? undefined : cards.get(step.playerId)}
		{#if step !== undefined && found !== undefined}
			<div class="row">
				<span class="chip">Player {index + 1} of {paid.round.steps.length}</span>
				<span class="chip legend">Right: {rightCount}</span>
				<a class="btn small" href={resolve('/games')}>Back to games</a>
			</div>
			{#key step.playerId}
				<TrailBoard
					{step}
					front={cardPropsOf(found.card, found.face).front}
					{nameOf}
					isLast={index === paid.round.steps.length - 1}
					onCheck={check}
					onNext={() => void next()}
				/>
			{/key}
		{/if}
	{/if}
</main>

<style>
	.done {
		display: grid;
		gap: 10px;
		justify-items: center;
		padding: 16px;
		border: 2px solid var(--fg);
		border-radius: 14px;
		background: var(--surface);
		text-align: center;
	}
</style>
