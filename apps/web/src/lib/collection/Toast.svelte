<script lang="ts">
	interface Props {
		/** The message to show. A new object shows it again, even with the same words. */
		message: { readonly text: string } | undefined;
		onhide: () => void;
	}

	const { message, onhide }: Props = $props();
	// How long a message stays, as in the prototype.
	const SHOW_MS = 2800;

	$effect(() => {
		if (message === undefined) return;
		const timer = setTimeout(onhide, SHOW_MS);
		return () => {
			clearTimeout(timer);
		};
	});
</script>

<!-- Always in the page, so a screen reader is listening before the first message. -->
<div class="toast" role="status" aria-live="polite" hidden={message === undefined}>
	{message?.text ?? ''}
</div>
