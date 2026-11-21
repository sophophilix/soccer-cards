<!-- The match stage: reveals a match that is already played, one moment at a time, then its result. -->
<script lang="ts">
	import { tick } from 'svelte';
	import { STANDARD_PACK_COST_COINS, createRandom, takeKick } from '@soccer-cards/game';
	import type { CardId, CheckedCardSet, Corner, Random, ShootOut } from '@soccer-cards/game';
	import { resolve } from '$app/paths';
	import CardFront from '../../lib/cards/CardFront.svelte';
	import type { CardFace } from '../../lib/data/card-face-from-summary.ts';
	import { startPenalties } from '../../lib/match/play-match.ts';
	import type { FinishedMatch, PlayedMatch } from '../../lib/match/play-match.ts';
	import { randomSeed } from '../../lib/packs/pack-session.ts';
	import { cardPropsOf } from '../packs/card-props.ts';
	import { edgeBanner, kickLine, momentLine } from './commentary.ts';
	import { DIVISION_NAMES, LINES, LINE_NAMES, TACTIC_WORDS } from './match-words.ts';
	import Penalties from './Penalties.svelte';

	interface Props {
		readonly match: PlayedMatch;
		readonly cardSet: CheckedCardSet;
		readonly faces: ReadonlyMap<CardId, CardFace>;
		readonly coins: number;
		readonly finished: FinishedMatch | undefined;
		readonly onFullTime: (won: boolean) => void;
		readonly onAgain: () => void;
	}
	const { match, cardSet, faces, coins, finished, onFullTime, onAgain }: Props = $props();

	const MOMENT_MS = 1100;
	const REDUCED_MOTION_MOMENT_MS = 150;
	const moments = $derived(match.result.moments);
	const home = $derived(match.home);
	const away = $derived(match.away);
	const cardOf = $derived(new Map(cardSet.map((card) => [card.id, card])));
	const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	const nameOf = (id: CardId): string => faces.get(id)?.displayName ?? id;

	let shown = $state(0);
	let hasReported = false;
	const isOver = $derived(shown >= moments.length);
	const revealed = $derived(moments.slice(0, shown));
	const score = $derived({
		home: revealed.filter((each) => each.outcome === 'goal' && each.side === 'home').length,
		away: revealed.filter((each) => each.outcome === 'goal' && each.side === 'away').length
	});
	const clock = $derived(isOver ? 'FT' : `${String(revealed.at(-1)?.minute ?? 0)}'`);
	const isLevel = $derived(isOver && score.home === score.away);
	let penalties = $state<HTMLDivElement>();
	let resultHeading = $state<HTMLHeadingElement>();
	let shootOut = $state.raw<ShootOut>();
	let random: Random | undefined;
	const penaltyWinner = $derived(
		shootOut?.status.kind === 'over' ? shootOut.status.winner : undefined
	);
	const lines = $derived(
		[
			...revealed.map((each) => momentLine(each, nameOf)),
			...(shootOut?.kicks ?? []).map((kick) => kickLine(kick))
		]
			.map((line, id) => ({ id, ...line }))
			.toReversed()
	);
	const won = $derived(
		penaltyWinner === undefined ? score.home > score.away : penaltyWinner === 'player'
	);
	const onPenalties = $derived(
		shootOut === undefined || penaltyWinner === undefined
			? ''
			: ` (${String(shootOut.score.player)} – ${String(shootOut.score.opponent)} on penalties)`
	);
	const banner = $derived(edgeBanner(match.result.tacticalEdge, home.tactic, away.tactic));
	const plan = (side: typeof home): string =>
		`${side.formation} · ${TACTIC_WORDS[side.tactic].name}`;

	$effect(() => {
		// Reading `shown` here sets the next moment's timer each time one is shown.
		if (shown >= moments.length) return;
		const timer = setTimeout(
			() => {
				shown += 1;
			},
			reducedMotion ? REDUCED_MOTION_MOMENT_MS : MOMENT_MS
		);
		return () => {
			clearTimeout(timer);
		};
	});

	$effect(() => {
		if (isLevel && shootOut === undefined) {
			random = createRandom(randomSeed());
			shootOut = startPenalties(match);
			// Skip has just removed the focused button, so the first corner takes focus.
			void tick().then(() => {
				if (document.activeElement === document.body) {
					penalties?.querySelector('button')?.focus();
				}
			});
		}
	});

	$effect(() => {
		if (!isOver || (isLevel && penaltyWinner === undefined) || hasReported) return;
		hasReported = true;
		onFullTime(won);
	});

	// The Skip button and the corner buttons go away or stop working, so focus moves on.
	$effect(() => {
		if (finished === undefined) return;
		void tick().then(() => resultHeading?.focus());
	});

	function pickCorner(corner: Corner): void {
		if (shootOut === undefined || random === undefined) return;
		const next = takeKick(shootOut, corner, random);
		if (next.ok) shootOut = next.value;
	}
</script>

{#snippet team(side: typeof home)}
	<div class="lines">
		{#each LINES as line (line)}
			<div class="line">
				<b>{LINE_NAMES[line]}</b>
				<div class="grid">
					{#each side.lineUp.lines[line] as id (id)}
						{@const card = cardOf.get(id)}
						{@const face = faces.get(id)}
						{#if card !== undefined && face !== undefined}
							<div class={['slot', 'still', side.lineUp.outOfPosition.includes(id) && 'oop']}>
								<CardFront {...cardPropsOf(card, face).front} />
							</div>
						{/if}
					{/each}
				</div>
			</div>
		{/each}
	</div>
{/snippet}

<div class="board" role="group" aria-label="Score and clock">
	<div class={['side', score.home > score.away && 'lead']}>
		<span class="who">You</span><span class="pts" data-testid="score-you">{score.home}</span>
	</div>
	<span class="vs" data-testid="clock">{clock}</span>
	<div class={['side', score.away > score.home && 'lead']}>
		<span class="who">AI</span><span class="pts" data-testid="score-ai">{score.away}</span>
	</div>
</div>
<div class="row center">
	<span class="chip">You: {plan(home)}</span>
	<span class="chip">AI: {plan(away)}</span>
</div>
{#if banner !== undefined}<p class="banner">{banner}</p>{/if}
{#if isLevel && penaltyWinner === undefined}
	<div class="result" role="status">
		<h2>Full time</h2>
		<p>It is level, so it goes to penalties!</p>
	</div>
{/if}
{#if shootOut !== undefined}<div bind:this={penalties}>
		<Penalties {shootOut} onPick={pickCorner} />
	</div>{/if}
{#if finished !== undefined}
	<div class="result" role="status">
		<h2 tabindex="-1" bind:this={resultHeading}>{won ? 'You win!' : 'The AI wins'}</h2>
		<p>
			{score.home} – {score.away}{onPenalties}.
			{#if won}
				You earned {finished.coinsWon} coins.{finished.wentUp
					? ` You go up to ${DIVISION_NAMES[finished.state.division]}!`
					: ''}
			{:else}
				Try another formation or tactic, or find stronger cards.
			{/if}
		</p>
		<div class="row center">
			<button type="button" class="btn primary" onclick={onAgain}>Play again</button>
			{#if coins >= STANDARD_PACK_COST_COINS}
				<a class="btn" href={resolve('/packs')}>Open a pack</a>
			{/if}
		</div>
	</div>
{/if}
{#if !isOver}
	<div class="row center">
		<button
			type="button"
			class="btn small"
			onclick={() => {
				shown = moments.length;
			}}>Skip to full time</button
		>
	</div>
{/if}
<ol class="log" aria-live="polite" aria-label="Commentary">
	{#each lines as line (line.id)}
		<li class:goal={line.isGoal}>{line.text}</li>
	{/each}
	<li>Kick-off!</li>
</ol>
<div class="teams">
	<div class="teambox">
		<h3>Your team</h3>
		{@render team(home)}
	</div>
	<div class="teambox">
		<h3>AI team</h3>
		{@render team(away)}
	</div>
</div>

<style>
	/* A card in a line-up during the match is only shown, not tapped. */
	.still {
		cursor: default;
	}
</style>
