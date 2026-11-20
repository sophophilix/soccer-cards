<script lang="ts">
	import CardBack from './CardBack.svelte';
	import CardFront from './CardFront.svelte';
	import type { CardBackProps } from './card-back.ts';
	import type { CardFrontProps } from './card-front.ts';

	interface Props {
		front: CardFrontProps;
		back: CardBackProps;
	}

	const { front, back }: Props = $props();
	let side = $state<'front' | 'back'>('front');
	const isBackShowing = $derived(side === 'back');
	const label = $derived(
		isBackShowing
			? `${front.displayName} card, showing the back. Press to see the front.`
			: `${front.displayName} card, showing the front. Press to see the back.`
	);

	function turn(): void {
		side = isBackShowing ? 'front' : 'back';
	}
</script>

<!-- The faces sit outside the button, so a screen reader reads the side that shows. -->
<div class={['flip', isBackShowing && 'flipped']}>
	<div class="inner">
		<div class="side front" aria-hidden={isBackShowing || undefined} inert={isBackShowing}>
			<CardFront {...front} />
		</div>
		<div class="side back" aria-hidden={!isBackShowing || undefined} inert={!isBackShowing}>
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
		transition: transform 0.55s cubic-bezier(0.3, 1.3, 0.5, 1);
	}
	.flipped .inner {
		transform: rotateY(180deg);
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
	@media (prefers-reduced-motion: reduce) {
		.inner {
			transition: none;
		}
	}
</style>
