<!-- The goal mouth where each moment plays out: the ball flies, the keeper dives, the net ripples,
     and a scorer celebrates. The commentary says the same in words, so the scene is hidden from
     screen readers; only its Replay button is a control. -->
<script lang="ts">
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
	let net = $state<SVGGElement>();
	let word = $state<HTMLElement>();
	let timeline: ReturnType<typeof playShot> | undefined;
	let isReplaying = $state(false);
	const celebration = $derived(shot?.scorer ? celebrationOf(shot.scorer.cardId) : undefined);

	$effect(() => {
		if (shot === undefined || !ball || !keeper || !net || !word) return;
		timeline?.kill();
		timeline = playShot({ ball, keeper, net, word }, shot);
	});

	// The celebration's card and confetti are new for each goal, so they start themselves.
	function burst(node: HTMLElement): void {
		if (celebration === undefined) return;
		const card = node.querySelector<HTMLElement>('.scorer');
		if (card) celebrate(card, [...node.querySelectorAll<HTMLElement>('.bit')], celebration);
	}

	async function playAgain(): Promise<void> {
		if (timeline === undefined || isReplaying) return;
		isReplaying = true;
		onReplay?.(true);
		await replay(timeline);
		isReplaying = false;
		onReplay?.(false);
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
			<g bind:this={keeper} class={['keeper', shot?.keeper ?? 'ai']}>
				<rect x="140" y="62" width="20" height="26" rx="6" />
				<rect class="arm" x="124" y="64" width="18" height="7" rx="3.5" />
				<rect class="arm" x="158" y="64" width="18" height="7" rx="3.5" />
				<rect class="leg" x="142" y="86" width="7" height="16" rx="3" />
				<rect class="leg" x="151" y="86" width="7" height="16" rx="3" />
				<circle class="head" cx="150" cy="54" r="8" />
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
	/* Your keeper wears yellow; the AI's wears pink, so a child knows whose goal it is. */
	.keeper rect,
	.keeper .head {
		stroke: #0e1512;
		stroke-width: 1.5;
	}
	.keeper.player rect {
		fill: #ffc93c;
	}
	.keeper.ai rect {
		fill: #ff7ad9;
	}
	.keeper .head {
		fill: #f3c9a0;
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
