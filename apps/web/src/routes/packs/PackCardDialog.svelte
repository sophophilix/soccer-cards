<script lang="ts">
	import { onMount } from 'svelte';
	import BigCard from '../../lib/cards/BigCard.svelte';
	import type { CardProps } from './card-props.ts';

	interface Props {
		card: CardProps;
		onclose: () => void;
	}

	const { card, onclose }: Props = $props();
	let dialog: HTMLDialogElement | undefined;
	let opener: Element | null = null;

	// A modal dialog keeps focus inside, and Escape closes it natively.
	onMount(() => {
		opener = document.activeElement;
		dialog?.showModal();
		return () => {
			if (opener instanceof HTMLElement && opener.isConnected) opener.focus();
		};
	});
</script>

<dialog
	bind:this={dialog}
	class="sheet"
	aria-label={`${card.front.displayName}, large`}
	{onclose}
	onclick={(event) => {
		if (event.target === dialog) dialog.close();
	}}
>
	<div class="sheetbox">
		<BigCard front={card.front} back={card.back} />
		<div class="row center">
			<button type="button" class="btn small primary" onclick={() => dialog?.close()}>Close</button>
		</div>
	</div>
</dialog>

<style>
	.sheet {
		width: 100%;
		max-width: none;
		height: 100%;
		max-height: none;
		margin: 0;
		padding: 16px;
		border: 0;
		background: var(--scrim);
	}
	.sheet[open] {
		display: grid;
		place-items: center;
	}
	.sheet::backdrop {
		background: transparent;
	}
</style>
