<script lang="ts">
	import { onMount } from 'svelte';
	import {
		answerGuess,
		createRandom,
		finishGuessRound,
		openGuessRound,
		startGuessRound
	} from '@soccer-cards/game';
	import type { Card, ClubId, PaidGuessRound, PlayerState } from '@soccer-cards/game';
	import { resolve } from '$app/paths';
	import type { CardFace } from '../../../lib/data/card-face-from-summary.ts';
	import { clubNamesFromList } from '../../../lib/data/card-face-from-summary.ts';
	import { loadCardSet, CLUBS_PATH } from '../../../lib/data/load-card-set.ts';
	import { loadCareer, type Career } from '../../../lib/data/load-career.ts';
	import { randomSeed } from '../../../lib/packs/pack-session.ts';
	import { browserStorage, createPlayerStore } from '../../../lib/state/player-store.ts';
	import { cardPropsOf } from '../../packs/card-props.ts';
	import { CONNECTIONS_SAVE_NOTICES } from '../connections/connections-words.ts';
	import GuessBoard from './GuessBoard.svelte';
	import { finishText } from './guess-words.ts';

	type Stage =
		| { readonly status: 'loading' }
		| { readonly status: 'cannot-start' }
		| { readonly status: 'playing' | 'finished' };
	interface Result {
		readonly pickedClubId: string;
		readonly rightClubId: string;
	}

	let stage = $state<Stage>({ status: 'loading' });
	let player = $state.raw<PlayerState>();
	let paid = $state.raw<PaidGuessRound>();
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
		const started = startGuessRound(found, random);
		if (!started.ok) return void (stage = { status: 'cannot-start' });
		clubNames = new Map(
			found.flatMap((c) => c.spells.map((s) => [s.clubId, s.displayName] as const))
		);
		careers = new Map(found.map((career) => [career.playerId, career] as const));
		cards = known;
		paid = openGuessRound(started.value);
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

	function pick(clubId: string): void {
		const question = paid?.round.questions[index];
		if (paid === undefined || player === undefined || question === undefined) return;
		const answered = answerGuess(paid, player, index, clubId);
		if (!answered.ok) return;
		const { isRight, paid: nextPaid, state } = answered.value;
		if (nextPaid !== paid && isRight) rightCount += 1;
		paid = nextPaid;
		if (state !== player) persist(state);
		result = { pickedClubId: clubId, rightClubId: question.hiddenClub };
	}

	async function next(): Promise<void> {
		if (paid === undefined || player === undefined || result === undefined) return;
		result = undefined;
		if (index < paid.round.questions.length - 1) {
			index += 1;
			return;
		}
		const finished = finishGuessRound(paid, player);
		if (!finished.ok) return;
		paid = finished.value.paid;
		persist(finished.value.state);
		stage = { status: 'finished' };
		await Promise.resolve();
		heading?.focus();
	}
</script>

<svelte:head>
	<title>Guess the Club · Soccer Cards</title>
</svelte:head>

<main>
	<h1 class="sr-only">Guess the Club</h1>
	{#if notice}<p class="banner">{notice}</p>{/if}
	{#if stage.status === 'loading'}
		<p>Getting the players ready…</p>
	{:else if stage.status === 'cannot-start' || paid === undefined}
		<div class="empty">
			<h2>The game can't start right now</h2>
			<p>We can't find a player with a career to read. Check you are online, then try again.</p>
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
		{@const shown = question === undefined ? undefined : cards.get(question.playerId)}
		{@const career = question === undefined ? undefined : careers.get(question.playerId)}
		{#if question !== undefined && shown !== undefined && career !== undefined}
			<div class="row">
				<span class="chip">Question {index + 1} of {paid.round.questions.length}</span>
				<span class="chip legend">Right: {rightCount}</span>
				<a class="btn small" href={resolve('/games')}>Back to games</a>
			</div>
			{#key index}
				<GuessBoard
					player={cardPropsOf(shown.card, shown.face).front}
					spells={career.spells.map((spell, position) => ({
						...spell,
						clubName: spell.displayName,
						isHidden: question.hiddenSpells.includes(position)
					}))}
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
