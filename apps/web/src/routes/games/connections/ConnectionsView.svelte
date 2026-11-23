<!-- The Connections view: loads the players and their careers, then plays one round. -->
<script lang="ts">
	import { onMount } from 'svelte';
	import {
		answerConnection,
		createRandom,
		finishConnectionsRound,
		openConnectionsRound,
		startConnectionsRound
	} from '@soccer-cards/game';
	import type { Card, ClubId, PaidConnectionsRound, PlayerState } from '@soccer-cards/game';
	import { resolve } from '$app/paths';
	import type { CardFace } from '../../../lib/data/card-face-from-summary.ts';
	import { clubNamesFromList } from '../../../lib/data/card-face-from-summary.ts';
	import { loadCardSet, CLUBS_PATH } from '../../../lib/data/load-card-set.ts';
	import { loadCareer, type Career } from '../../../lib/data/load-career.ts';
	import { randomSeed } from '../../../lib/packs/pack-session.ts';
	import { browserStorage, createPlayerStore } from '../../../lib/state/player-store.ts';
	import { cardPropsOf } from '../../packs/card-props.ts';
	import ConnectionsBoard from './ConnectionsBoard.svelte';
	import { CONNECTIONS_SAVE_NOTICES, finishText } from './connections-words.ts';

	type Stage =
		| { readonly status: 'loading' }
		| { readonly status: 'cannot-start' }
		| { readonly status: 'playing' | 'finished' };
	type Spell = Pick<Career['spells'][number], 'startYear' | 'endYear'>;
	interface Result {
		readonly pickedClubId: string;
		readonly rightClubId: string;
		readonly years: readonly [Spell, Spell];
	}

	let stage = $state<Stage>({ status: 'loading' });
	let player = $state.raw<PlayerState>();
	let paid = $state.raw<PaidConnectionsRound>();
	let cards = $state.raw<ReadonlyMap<string, { card: Card; face: CardFace }>>(new Map());
	let careers = $state.raw<ReadonlyMap<string, Career>>(new Map());
	let clubNames = $state.raw<ReadonlyMap<ClubId, string>>(new Map());
	let index = $state(0);
	let rightCount = $state(0);
	let result = $state.raw<Result>();
	let notice = $state('');
	let heading = $state<HTMLElement>();
	const store = createPlayerStore(browserStorage);

	onMount(() => {
		const loaded = store.load();
		player = loaded.state;
		if (loaded.outcome === 'not-saving') notice = CONNECTIONS_SAVE_NOTICES['not-saving'];
		void begin();
	});

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
		if (!set.ok) return void (stage = { status: 'cannot-start' });
		const known = new Map(
			set.value.flatMap((card) => {
				const face = set.faces.get(card.id);
				return face === undefined ? [] : [[card.id, { card, face }] as const];
			})
		);
		const loaded = await Promise.all(
			[...known.keys()].map((id) => loadCareer(fetchFile, id, clubNamesFromList(clubsBody)))
		);
		const found = loaded.filter((career) => career !== undefined);
		const started = startConnectionsRound(found, random);
		if (!started.ok) return void (stage = { status: 'cannot-start' });
		clubNames = new Map(
			found.flatMap((c) => c.spells.map((s) => [s.clubId, s.displayName] as const))
		);
		careers = new Map(found.map((career) => [career.playerId, career] as const));
		cards = known;
		paid = openConnectionsRound(started.value);
		index = 0;
		rightCount = 0;
		result = undefined;
		stage = { status: 'playing' };
	}

	function persist(next: PlayerState): void {
		player = next;
		const saved = store.save(next);
		if (!saved.ok) notice = CONNECTIONS_SAVE_NOTICES[saved.reason];
	}

	function spellAt(playerId: string, clubId: string): Spell {
		return (
			careers.get(playerId)?.spells.find((spell) => spell.clubId === clubId) ?? { startYear: 0 }
		);
	}

	function pick(clubId: string): void {
		const question = paid?.round.questions[index];
		if (paid === undefined || player === undefined || question === undefined) return;
		const answered = answerConnection(paid, player, index, clubId);
		if (!answered.ok) return;
		const { isRight, paid: nextPaid, state } = answered.value;
		// Only a first answer changes the round, and only a first right answer pays.
		if (nextPaid !== paid && isRight) rightCount += 1;
		paid = nextPaid;
		if (state !== player) persist(state);
		result = {
			pickedClubId: clubId,
			rightClubId: question.answer,
			years: [
				spellAt(question.playerIds[0], question.answer),
				spellAt(question.playerIds[1], question.answer)
			]
		};
	}

	async function next(): Promise<void> {
		if (paid === undefined || player === undefined || result === undefined) return;
		result = undefined;
		if (index < paid.round.questions.length - 1) {
			index += 1;
			return;
		}
		const finished = finishConnectionsRound(paid, player);
		if (!finished.ok) return;
		paid = finished.value.paid;
		persist(finished.value.state);
		stage = { status: 'finished' };
		await Promise.resolve();
		heading?.focus();
	}
</script>

<svelte:head>
	<title>Connections · Soccer Cards</title>
</svelte:head>

<main>
	<h1 class="sr-only">Connections</h1>
	{#if notice}<p class="banner">{notice}</p>{/if}
	{#if stage.status === 'loading'}
		<p>Getting the players ready…</p>
	{:else if stage.status === 'cannot-start' || paid === undefined}
		<div class="empty">
			<h2>The game can't start right now</h2>
			<p>We can't find two players with a club in common. Check you are online, then try again.</p>
			<div class="row">
				<button type="button" class="btn primary" onclick={() => void begin()}>Try again</button>
				<a class="btn" href={resolve('/games')}>Back to games</a>
			</div>
		</div>
	{:else if stage.status === 'finished'}
		<div class="empty">
			<h2 tabindex="-1" bind:this={heading}>Round finished!</h2>
			<p>{finishText(rightCount, paid.round.questions.length)}</p>
			<div class="row center">
				<button type="button" class="btn primary" onclick={() => void begin()}>Play again</button>
				<a class="btn" href={resolve('/games')}>Back to games</a>
			</div>
		</div>
	{:else}
		{@const question = paid.round.questions[index]}
		{@const first = question === undefined ? undefined : cards.get(question.playerIds[0])}
		{@const second = question === undefined ? undefined : cards.get(question.playerIds[1])}
		{#if question !== undefined && first !== undefined && second !== undefined}
			<div class="row">
				<span class="chip">Question {index + 1} of {paid.round.questions.length}</span>
				<span class="chip legend">Right: {rightCount}</span>
				<a class="btn small" href={resolve('/games')}>Back to games</a>
			</div>
			{#key index}
				<ConnectionsBoard
					players={[
						cardPropsOf(first.card, first.face).front,
						cardPropsOf(second.card, second.face).front
					]}
					options={question.options.map((clubId) => ({
						clubId,
						name: clubNames.get(clubId) ?? clubId
					}))}
					{result}
					isLast={index === paid.round.questions.length - 1}
					onPick={pick}
					onNext={() => void next()}
				/>
			{/key}
		{/if}
	{/if}
</main>
