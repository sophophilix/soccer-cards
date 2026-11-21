<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		label: string;
		onclose: () => void;
		children: Snippet;
	}

	const { label, onclose, children }: Props = $props();

	// A native modal dialog keeps focus inside and closes on Escape. The first button takes focus.
	function open(node: HTMLDialogElement): void {
		node.showModal();
		node.querySelector<HTMLElement>('[data-autofocus]')?.focus();
	}
</script>

<!-- A tap on the dark scrim around the sheet closes it, as in the prototype. Escape does too. -->
<dialog
	class="modal"
	aria-label={label}
	{@attach open}
	{onclose}
	onclick={(event) => {
		if (event.target === event.currentTarget) event.currentTarget.close();
	}}
>
	<div class="sheetbox">{@render children()}</div>
</dialog>

<style>
	dialog {
		width: 100%;
		max-width: none;
		height: 100%;
		max-height: none;
		margin: 0;
		border: 0;
		color: inherit;
	}
	dialog::backdrop {
		background: transparent;
	}
</style>
