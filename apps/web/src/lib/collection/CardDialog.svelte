<script lang="ts">
	import { onMount } from 'svelte';
	import FlipCard from '../cards/FlipCard.svelte';
	import CardFront from '../cards/CardFront.svelte';
	import type { CardViewProps } from './owned-cards.ts';

	interface Props {
		view: CardViewProps;
		onclose: () => void;
	}

	const { view, onclose }: Props = $props();
	let dialog: HTMLDialogElement | undefined;

	// Escape closes the dialog natively. The caller returns focus in `onclose`.
	onMount(() => {
		dialog?.showModal();
	});
</script>

<dialog bind:this={dialog} aria-label={`${view.front.displayName}, large`} {onclose}>
	<div>
		{#if view.back}
			<FlipCard front={view.front} back={view.back} />
		{:else}
			<CardFront {...view.front} />
		{/if}
	</div>
	<button type="button" class="close" onclick={() => dialog?.close()}>Close</button>
</dialog>

<style>
	dialog {
		width: min(320px, 90vw);
		padding: 16px;
		border: 2px solid var(--line);
		border-radius: 14px;
		background: var(--surface);
		color: var(--fg);
	}
	dialog::backdrop {
		background: var(--scrim);
	}
	.close {
		width: 100%;
		margin-top: 14px;
		border: 2px solid var(--fg);
		border-radius: 999px;
		background: var(--surface);
		color: var(--fg);
		font: 700 16px var(--font-body);
		cursor: pointer;
	}
</style>
