<script lang="ts">
	import CardFront from './CardFront.svelte';
	import FlipCard from './FlipCard.svelte';
	import type { CardBackProps } from './card-back.ts';
	import type { CardFrontProps } from './card-front.ts';

	interface Props {
		front: CardFrontProps;
		/** With a back the card flips on a tap. Without one it shows the front only. */
		back?: CardBackProps | undefined;
		/** Rises into place when it first shows, as a new card in a pack does. */
		arrive?: boolean;
	}

	const { front, back, arrive = false }: Props = $props();
	let tracking = $state(false);

	// The prototype's tilt: up to 8 degrees each way up and down, 10 left and right. The page's
	// policy refuses style attributes, so the angles go in through the CSS object model.
	function tilt(node: HTMLElement): () => void {
		const still = window.matchMedia('(prefers-reduced-motion: reduce)');
		const move = (event: PointerEvent): void => {
			if (still.matches) return;
			const box = node.getBoundingClientRect();
			const across = (event.clientX - box.left) / box.width;
			const down = (event.clientY - box.top) / box.height;
			tracking = true;
			node.style.setProperty('--rx', `${((0.5 - down) * 16).toFixed(1)}deg`);
			node.style.setProperty('--ry', `${((across - 0.5) * 20).toFixed(1)}deg`);
			node.style.setProperty('--mx', `${(across * 100).toFixed(0)}%`);
			node.style.setProperty('--my', `${(down * 100).toFixed(0)}%`);
		};
		const rest = (): void => {
			tracking = false;
			for (const name of ['--rx', '--ry', '--mx', '--my']) node.style.removeProperty(name);
		};
		node.addEventListener('pointermove', move);
		node.addEventListener('pointerleave', rest);
		node.addEventListener('pointercancel', rest);
		return () => {
			node.removeEventListener('pointermove', move);
			node.removeEventListener('pointerleave', rest);
			node.removeEventListener('pointercancel', rest);
		};
	}
</script>

<div class={['big', tracking ? 'tracking' : 'idle', arrive && 'arrive']} {@attach tilt}>
	<div class="tilt">
		{#if back}
			<FlipCard {front} {back} />
		{:else}
			<CardFront {...front} />
		{/if}
		<div class="glare" aria-hidden="true"></div>
	</div>
</div>

<style>
	.big {
		--rx: 0deg;
		--ry: 0deg;
		position: relative;
		width: min(100%, 320px, 52vh);
		perspective: 1100px;
		touch-action: pan-y;
	}
	.tilt {
		position: relative;
		transform: rotateX(var(--rx)) rotateY(var(--ry));
		transform-style: preserve-3d;
		transition: transform 0.55s cubic-bezier(0.3, 1.3, 0.5, 1);
	}
	.tracking .tilt {
		transition: transform 0.08s linear;
	}
	.glare {
		position: absolute;
		inset: 0;
		border-radius: 5cqw;
		background: radial-gradient(
			circle at var(--mx) var(--my),
			rgba(255, 255, 255, 0.3),
			transparent 44%
		);
		pointer-events: none;
	}
	.idle {
		animation: sheen 5s ease-in-out infinite alternate;
	}
	.idle.arrive {
		animation:
			arrive 0.5s cubic-bezier(0.2, 1.2, 0.4, 1) both,
			sheen 5s ease-in-out infinite alternate;
	}
	@media (prefers-reduced-motion: reduce) {
		.tilt {
			transition: none;
		}
		.idle,
		.idle.arrive {
			animation: none;
		}
	}
</style>
