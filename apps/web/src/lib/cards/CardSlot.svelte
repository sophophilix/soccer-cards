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

	// WebKit doesn't focus a button on a click, so a dialog this opens would have no place to
	// return focus to. Focusing it first makes every browser behave the same.
	function press(event: MouseEvent & { currentTarget: HTMLButtonElement }): void {
		event.currentTarget.focus();
		onclick();
	}
</script>

<!-- The card art sits outside the button, as FlipCard's faces do, so the button's name is the
     whole of what it says (WCAG 2.5.3, label in name). The button covers the art. -->
<div class={['slot', dim && 'dim', outOfPosition && 'oop']}>
	<span class="art" aria-hidden="true" data-art><CardFront {...front} /></span>
	<button type="button" class="cover" aria-label={label} aria-pressed={pressed} onclick={press}
	></button>
	{@render children?.()}
</div>

<style>
	.art {
		display: block;
		pointer-events: none;
	}
</style>
