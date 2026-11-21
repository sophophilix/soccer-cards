<script lang="ts">
	import type { Snippet } from 'svelte';
	import CardFront from './CardFront.svelte';
	import type { CardFrontProps } from './card-front.ts';

	interface Props {
		front: CardFrontProps;
		/** What a tap does, for a screen reader: "Look at …", "Pick …", "Trade …". */
		label: string;
		onclick: () => void;
		pressed?: boolean | undefined;
		dim?: boolean;
		outOfPosition?: boolean;
		/** Badges drawn over a corner: a count, a star or a tick. */
		children?: Snippet;
	}

	const {
		front,
		label,
		onclick,
		pressed,
		dim = false,
		outOfPosition = false,
		children
	}: Props = $props();
</script>

<!-- A small card in a grid. The button's name says what a tap does; the card art is decoration. -->
<button
	type="button"
	class={['slot', dim && 'dim', outOfPosition && 'oop']}
	aria-label={label}
	aria-pressed={pressed}
	{onclick}
>
	<span class="art" aria-hidden="true"><CardFront {...front} /></span>
	{@render children?.()}
</button>

<style>
	.art {
		display: block;
		pointer-events: none;
	}
</style>
