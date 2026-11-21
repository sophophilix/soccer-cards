<!-- The match stage: reveals a match that is already played, one moment at a time, then its result. -->
<script lang="ts">
	import { STANDARD_PACK_COST_COINS } from '@soccer-cards/game';
	import type { CardId } from '@soccer-cards/game';
	import { resolve } from '$app/paths';
	import type { CardFace } from '../../lib/data/card-face-from-summary.ts';
	import type { FinishedMatch, PlayedMatch } from '../../lib/match/play-match.ts';
	import { edgeBanner, momentLine } from './commentary.ts';
	import { DIVISION_NAMES, LINES, LINE_NAMES, TACTIC_WORDS } from './match-words.ts';

	interface Props {
		readonly match: PlayedMatch;
		readonly faces: ReadonlyMap<CardId, CardFace>;
		readonly coins: number;
		readonly finished: FinishedMatch | undefined;
		readonly onFullTime: (won: boolean) => void;
		readonly onAgain: () => void;
	}
	const { match, faces, coins, finished, onFullTime, onAgain }: Props = $props();

	const MOMENT_MS = 1100;
	const REDUCED_MOTION_MOMENT_MS = 150;
	const moments = $derived(match.result.moments);
	const home = $derived(match.home);
	const away = $derived(match.away);
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
	const lines = $derived(revealed.map((each) => momentLine(each, nameOf)).toReversed());
	const isLevel = $derived(isOver && score.home === score.away);
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
		if (!isOver || isLevel || hasReported) return;
		hasReported = true;
		onFullTime(score.home > score.away);
	});
</script>

{#snippet team(side: typeof home)}
	<div class="lines">
		{#each LINES as line (line)}
			<p class="teamline">
				<b>{LINE_NAMES[line]}</b>
				{side.lineUp.lines[line].map(nameOf).join(', ')}
			</p>
		{/each}
	</div>
{/snippet}

<div class="board" aria-label="Score and clock">
	<div class:lead={score.home > score.away}>
		<span class="who">You</span><span class="pts" data-testid="score-you">{score.home}</span>
	</div>
	<span class="vs" data-testid="clock">{clock}</span>
	<div class:lead={score.away > score.home}>
		<span class="who">AI</span><span class="pts" data-testid="score-ai">{score.away}</span>
	</div>
</div>
<div class="row center">
	<span class="chip">You: {plan(home)}</span>
	<span class="chip">AI: {plan(away)}</span>
</div>
{#if banner !== undefined}<p class="banner">{banner}</p>{/if}
{#if isLevel}
	<div class="result">
		<h2>Full time</h2>
		<p>It is level, so it goes to penalties!</p>
	</div>
{:else if finished !== undefined}
	{@const won = score.home > score.away}
	<div class="result">
		<h2>{won ? 'You win!' : 'The AI wins'}</h2>
		<p>
			{score.home} – {score.away}.
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
	{#each lines as line, index (index)}
		<li class:goal={line.isGoal}>{line.text}</li>
	{/each}
	<li>Kick-off!</li>
</ol>
<div class="teams">
	<div>
		<h3>Your team</h3>
		{@render team(home)}
	</div>
	<div>
		<h3>AI team</h3>
		{@render team(away)}
	</div>
</div>

<style>
	.board {
		display: grid;
		grid-template-columns: 1fr auto 1fr;
		border-radius: 14px;
		background: var(--card-ink);
		color: var(--card-paper);
		text-align: center;
	}
	.who {
		display: block;
		font: 800 15px/1 var(--font-data);
	}
	.pts {
		font: 800 italic clamp(34px, 10vw, 52px) / 1 var(--font-data);
	}
	.vs,
	.lead .pts {
		color: var(--booking);
	}
	.vs {
		font: 400 18px/1 var(--font-display);
	}
	.center {
		justify-content: center;
	}
	.banner {
		margin: 0;
		padding: 10px 14px;
		background: var(--booking);
		color: var(--booking-ink);
		font-weight: 700;
	}
	.result {
		display: grid;
		gap: 12px;
		justify-items: center;
	}
	.log {
		display: grid;
		gap: 6px;
		padding: 0;
		list-style: none;
	}
	.log li {
		padding: 8px 10px;
		border-left: 4px solid var(--muted);
	}
	.log li.goal {
		border-left-color: var(--accent);
		font-weight: 700;
	}
	.teams {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
	}
</style>
