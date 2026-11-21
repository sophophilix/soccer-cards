<script lang="ts">
	import CardFront from './CardFront.svelte';
	import FlipCard from './FlipCard.svelte';
	import type { CardBackProps } from './card-back.ts';
	import type { CardFrontProps } from './card-front.ts';
	import { arrive as rise, tiltToPointer } from '../ui/motion.ts';

	interface Props {
		front: CardFrontProps;
		/** With a back the card flips on a tap. Without one it shows the front only. */
		back?: CardBackProps | undefined;
		/** Rises into place when it first shows, as a new card in a pack does. */
		arrive?: boolean;
	}

	const { front, back, arrive = false }: Props = $props();
	let tracking = $state(false);

	// GSAP follows the pointer; the sheen runs in CSS while the card is still.
	function tilt(surface: HTMLElement): () => void {
		if (arrive) rise(surface);
		const tilted = surface.firstElementChild;
		if (!(tilted instanceof HTMLElement)) return () => undefined;
		return tiltToPointer(surface, tilted, (isTracking) => {
			tracking = isTracking;
		});
	}
</script>

<div
	class={['relative w-[min(100%,320px,52vh)] touch-pan-y', !tracking && 'animate-sheen']}
	{@attach tilt}
>
	<div class="@container relative transform-3d">
		{#if back}
			<FlipCard {front} {back} />
		{:else}
			<CardFront {...front} />
		{/if}
		<div class="glare" aria-hidden="true"></div>
	</div>
</div>

<style>
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
</style>
