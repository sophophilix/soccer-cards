<!-- The goal mouth where each moment plays out: the ball flies, the keeper dives, the net ripples,
     and a scorer celebrates. The commentary says the same in words, so the scene is hidden from
     screen readers; only its Replay button is a control. -->
<script lang="ts">
	import { untrack } from 'svelte';
	import CardFront from '../../lib/cards/CardFront.svelte';
	import { celebrate, celebrationOf, playShot, replay } from '../../lib/ui/motion.ts';
	import type { SceneShot } from './scene-shot.ts';

	interface Props {
		readonly shot: SceneShot | undefined;
		/** Says when a replay starts and ends, so the match can wait for it. */
		readonly onReplay?: ((isReplaying: boolean) => void) | undefined;
	}

	const { shot, onReplay }: Props = $props();
	const WORDS = { goal: 'GOAL!', save: 'SAVED!', wide: 'WIDE!' } as const;
	const CONFETTI = Array.from({ length: 22 }, (_, index) => index);

	let ball = $state<SVGGElement>();
	let keeper = $state<SVGGElement>();
	let armLeft = $state<SVGGElement>();
	let armRight = $state<SVGGElement>();
	let net = $state<SVGGElement>();
	let word = $state<HTMLElement>();
	let timeline: ReturnType<typeof playShot> | undefined;
	let isReplaying = $state(false);
	const celebration = $derived(shot?.scorer ? celebrationOf(shot.scorer.cardId) : undefined);

	$effect(() => {
		if (shot === undefined || !ball || !keeper || !net || !word || !armLeft || !armRight) return;
		timeline?.kill();
		endReplay();
		timeline = playShot({ ball, keeper, arms: [armLeft, armRight], net, word }, shot);
	});

	// The celebration's card and confetti are new for each goal, so they start themselves.
	function burst(node: HTMLElement): void {
		if (celebration === undefined) return;
		const card = node.querySelector<HTMLElement>('.scorer');
		if (card) celebrate(card, [...node.querySelectorAll<HTMLElement>('.bit')], celebration);
	}

	// A new shot kills the timeline a replay waits on, so the replay ends here instead.
	function endReplay(): void {
		if (!untrack(() => isReplaying)) return;
		isReplaying = false;
		onReplay?.(false);
	}

	async function playAgain(): Promise<void> {
		if (timeline === undefined || isReplaying) return;
		isReplaying = true;
		onReplay?.(true);
		await replay(timeline);
		endReplay();
	}
</script>

<div class="scene" data-testid="scene">
	<div class="stage" aria-hidden="true">
		<svg viewBox="0 0 300 170" role="presentation">
			<rect class="grass" width="300" height="170" />
			<g class="stripes">
				{#each [0, 1, 2, 3, 4] as stripe (stripe)}<rect
						x={stripe * 60}
						width="30"
						height="170"
					/>{/each}
			</g>
			<path
				class="lines"
				d="M20 120 H280 M70 120 V96 H230 V120 M150 170 m-36 0 a36 36 0 0 1 72 0"
			/>
			<g bind:this={net} class="net">
				{#each Array.from({ length: 13 }, (_, i) => i) as i (i)}<line
						x1={66 + i * 14}
						y1="22"
						x2={66 + i * 14}
						y2="92"
					/>{/each}
				{#each Array.from({ length: 6 }, (_, i) => i) as i (i)}<line
						x1="60"
						y1={28 + i * 12}
						x2="240"
						y2={28 + i * 12}
					/>{/each}
			</g>
			<path class="frame" d="M60 94 V20 H240 V94" />
			<!-- A sticker-style keeper: boots, socks, shorts, a striped jersey with a number one,
			     hair and big gloves. The arms are their own parts, so they reach for the ball. -->
			<g bind:this={keeper} class={['keeper', shot?.keeper ?? 'ai']}>
				<path class="skin" d="M143 86h6v9h-6zM151 86h6v9h-6z" />
				<path class="sock" d="M142.5 92.5h7v8h-7zM150.5 92.5h7v8h-7z" />
				<path class="boot" d="M141 100h9l1.5 4.5h-12zM149.5 100h9l2 4.5h-12z" />
				<path class="shorts" d="M139 80h22l1.5 9.5h-10l-2.5-3-2.5 3h-10z" />
				<path class="shirt" d="M137.5 59.5q12.5-6.5 25 0l2 22.5q-14.5 3.2-29 0z" />
				<path class="stripe" d="M136.6 67h26.8l.3 4.2h-27.4z" />
				<path class="collar" d="M145 55.6l5 5 5-5" />
				<text class="number" x="150" y="80.5">1</text>
				<g bind:this={armLeft} class="arm">
					<path class="sleeve" d="M134.6 58.5h6.2l.8 12.5h-7.4z" />
					<rect class="glove" x="133.6" y="69.5" width="8.4" height="9.5" rx="3.4" />
				</g>
				<g bind:this={armRight} class="arm">
					<path class="sleeve" d="M159.2 58.5h6.2l-.4 12.5h-7.4z" />
					<rect class="glove" x="157.8" y="69.5" width="8.4" height="9.5" rx="3.4" />
				</g>
				<circle class="skin" cx="150" cy="49" r="7.5" />
				<path class="hair" d="M142.4 48.6q0-9 7.6-9t7.6 9q-2.4-4.4-7.6-4.4t-7.6 4.4z" />
				<circle class="eye" cx="147.2" cy="49.6" r="1.1" />
				<circle class="eye" cx="152.8" cy="49.6" r="1.1" />
				<path class="smile" d="M147.6 52.6q2.4 1.8 4.8 0" />
			</g>
			<g bind:this={ball} class="ball">
				<circle cx="150" cy="152" r="7" />
				<path d="M150 147 l3 2 -1 3.5 h-4 l-1 -3.5 z M143.5 151 l2 1 M156.5 151 l-2 1" />
			</g>
		</svg>
		<p class={['word', shot?.end]} bind:this={word}>{shot ? WORDS[shot.end] : ''}</p>
		{#if shot?.end === 'goal' && shot.scorer && celebration}
			{#key shot.key}
				<div class="party" {@attach burst}>
					{#each CONFETTI as bit (bit)}<span class={['bit', `c${String(bit % 5)}`]}></span>{/each}
					<div class="scorer">
						<CardFront {...shot.scorer.front} />
						<span class="move">{celebration}!</span>
					</div>
				</div>
			{/key}
		{/if}
	</div>
	{#if shot?.end === 'save'}
		<div class="row center">
			<button
				type="button"
				class="btn small"
				disabled={isReplaying}
				onclick={() => void playAgain()}>{isReplaying ? 'Replaying…' : 'Replay the save'}</button
			>
		</div>
	{/if}
</div>

<style>
	.scene {
		display: grid;
		justify-self: center;
		gap: 8px;
		width: 100%;
		max-width: 520px;
	}
	.stage {
		position: relative;
		overflow: hidden;
		border-radius: var(--radius-panel, 14px);
		box-shadow: 0 6px 18px var(--card-shadow);
	}
	svg {
		display: block;
		width: 100%;
		height: auto;
	}
	.grass {
		fill: #1f8a4c;
	}
	.stripes rect {
		fill: #23974f;
	}
	.lines {
		fill: none;
		stroke: #ffffffb3;
		stroke-width: 2;
	}
	.net line {
		stroke: #ffffff8c;
		stroke-width: 1;
	}
	.frame {
		fill: none;
		stroke: #fff;
		stroke-width: 5;
		stroke-linejoin: round;
	}
	/* Your keeper wears yellow; the AI's wears pink, so a child knows whose goal it is. Every
	   part has the same dark outline, like a sticker. */
	.keeper path,
	.keeper rect,
	.keeper circle {
		stroke: #0e1512;
		stroke-width: 1.4;
		stroke-linejoin: round;
	}
	.keeper.player {
		--kit: #ffc93c;
		--kit-dark: #e0a400;
	}
	.keeper.ai {
		--kit: #ff7ad9;
		--kit-dark: #c8379f;
	}
	.shirt,
	.sleeve,
	.sock {
		fill: var(--kit);
	}
	.keeper .stripe {
		fill: var(--kit-dark);
		stroke: none;
	}
	.shorts,
	.boot,
	.hair {
		fill: #1b2a24;
	}
	.skin {
		fill: #e8b48a;
	}
	.collar {
		fill: none;
		stroke-linecap: round;
	}
	.glove {
		fill: #b6ff3c;
	}
	.keeper .eye {
		fill: #0e1512;
		stroke: none;
	}
	.keeper .smile {
		fill: none;
		stroke-width: 1;
		stroke-linecap: round;
	}
	.number {
		fill: #0e1512;
		font: 800 9px/1 var(--font-data);
		text-anchor: middle;
	}
	.ball circle {
		fill: #fff;
		stroke: #0e1512;
		stroke-width: 1.5;
	}
	.ball path {
		fill: #0e1512;
		stroke: #0e1512;
		stroke-width: 1;
	}
	.word {
		position: absolute;
		top: 80%;
		left: 50%;
		margin: 0;
		translate: -50% -50%;
		color: #fff;
		font: 400 clamp(26px, 9vw, 44px) / 1 var(--font-display);
		text-shadow: 3px 3px 0 #0e1512;
		pointer-events: none;
	}
	.word.goal {
		color: var(--booking);
	}
	.party {
		position: absolute;
		inset: 0;
		display: grid;
		place-items: center;
		pointer-events: none;
	}
	.scorer {
		position: absolute;
		right: 6%;
		bottom: 8%;
		display: grid;
		justify-items: center;
		gap: 4px;
		width: 22%;
		container-type: inline-size;
	}
	.move {
		padding: 3px 7px 2px;
		border-radius: var(--radius-chip, 4px);
		background: var(--accent);
		color: var(--accent-ink);
		font: 800 12px/1 var(--font-data);
		letter-spacing: 0.06em;
		text-transform: uppercase;
		white-space: nowrap;
	}
	/* The confetti bursts from the scorer's card. */
	.bit {
		position: absolute;
		right: 16%;
		bottom: 42%;
		width: 9px;
		height: 13px;
		border-radius: 2px;
		opacity: 0;
	}
	.c0 {
		background: var(--accent);
	}
	.c1 {
		background: var(--booking);
	}
	.c2 {
		background: var(--def);
	}
	.c3 {
		background: var(--ctrl);
	}
	.c4 {
		background: #ff7ad9;
	}
</style>
