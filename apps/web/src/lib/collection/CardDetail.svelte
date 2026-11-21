<script lang="ts">
	import BigCard from '../cards/BigCard.svelte';
	import Modal from './Modal.svelte';
	import { cardViewProps, type KnownCard } from './owned-cards.ts';

	interface Props {
		entry: KnownCard;
		/** Whether the card is a favourite. Absent hides the star button. */
		favourite?: boolean | undefined;
		onfavourite?: (() => void) | undefined;
		ontrade?: (() => void) | undefined;
		onclose: () => void;
	}

	const { entry, favourite, onfavourite, ontrade, onclose }: Props = $props();
	const view = $derived(cardViewProps(entry.card, entry.face));
	let holder: HTMLElement | undefined;

	// The card turns itself on a tap. The Flip button presses that same control.
	function flip(): void {
		holder?.querySelector<HTMLButtonElement>('button[aria-label*="Press to see"]')?.click();
	}
</script>

<Modal label={`${entry.face.displayName}, large`} {onclose}>
	<div class="holder" bind:this={holder}>
		<BigCard front={view.front} back={view.back} />
	</div>
	<div class="row center">
		{#if view.back}
			<button class="btn small" type="button" onclick={flip}>Flip</button>
		{/if}
		{#if favourite !== undefined && onfavourite}
			<button class="btn small" type="button" aria-pressed={favourite} onclick={onfavourite}
				>★ Favourite</button
			>
		{/if}
		{#if ontrade}
			<button class="btn small" type="button" onclick={ontrade}>Trade</button>
		{/if}
		<button
			class="btn small primary"
			type="button"
			data-autofocus
			onclick={(event) => {
				event.currentTarget.closest('dialog')?.close();
			}}>Close</button
		>
	</div>
</Modal>

<style>
	.holder {
		display: grid;
		justify-items: center;
		width: 100%;
	}
</style>
