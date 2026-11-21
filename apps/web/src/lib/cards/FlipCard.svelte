<script lang="ts">
	import CardBack from './CardBack.svelte';
	import CardFront from './CardFront.svelte';
	import type { CardBackProps } from './card-back.ts';
	import { TIER_NAMES, type CardFrontProps } from './card-front.ts';
	import { turnCard } from '../ui/motion.ts';

	interface Props {
		front: CardFrontProps;
		back: CardBackProps;
	}

	const { front, back }: Props = $props();
	let side = $state<'front' | 'back'>('front');
	const isBackShowing = $derived(side === 'back');
	// The tier is in the name, so a screen reader still hears it while the front is hidden.
	const label = $derived(
		`${front.displayName}, ${TIER_NAMES[front.tier]} card, showing the ` +
			(isBackShowing ? 'back. Press to see the front.' : 'front. Press to see the back.')
	);

	// GSAP turns the card whenever the side changes; the first run sets the front without motion.
	function turning(inner: HTMLElement): void {
		turnCard(inner, isBackShowing ? 180 : 0);
	}

	function turn(): void {
		side = isBackShowing ? 'front' : 'back';
	}
</script>

<!-- The faces sit outside the button, so a screen reader reads the side that shows. -->
<div class={['flip', isBackShowing && 'flipped']}>
	<div class="inner" data-testid="turning" {@attach turning}>
		<div
			class="side front"
			data-testid="front"
			aria-hidden={isBackShowing || undefined}
			inert={isBackShowing}
		>
			<CardFront {...front} />
		</div>
		<div
			class="side back"
			data-testid="back"
			aria-hidden={!isBackShowing || undefined}
			inert={!isBackShowing}
		>
			<CardBack {...back} />
		</div>
	</div>
	<button type="button" class="turn" aria-label={label} onclick={turn}></button>
</div>

<style>
	/* The CSP blocks style attributes, so the flipped class turns the card. */
	.flip {
		position: relative;
		width: 100%;
		aspect-ratio: 5 / 7;
		container-type: inline-size;
		perspective: 1100px;
	}
	.inner {
		position: relative;
		width: 100%;
		height: 100%;
		transform-style: preserve-3d;
	}
	.side {
		position: absolute;
		inset: 0;
		backface-visibility: hidden;
		-webkit-backface-visibility: hidden;
	}
	.side.back {
		transform: rotateY(180deg);
	}
	.turn {
		position: absolute;
		inset: 0;
		margin: 0;
		padding: 0;
		border: 0;
		border-radius: 5cqw;
		background: none;
		cursor: pointer;
		touch-action: manipulation;
	}
	.turn:focus-visible {
		outline: 3px solid var(--focus);
		outline-offset: 3px;
	}
</style>
