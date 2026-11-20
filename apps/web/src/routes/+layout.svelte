<script lang="ts">
	import type { Snippet } from 'svelte';
	import { page } from '$app/state';
	import TabBar from '../lib/ui/TabBar.svelte';
	import '../app.css';

	interface Props {
		children: Snippet;
	}

	const { children }: Props = $props();
</script>

<div class="page">
	<header>
		<p class="game-name">Soccer Cards</p>
		<TabBar pathname={page.url.pathname} />
	</header>
	{@render children()}
</div>

<style>
	.page {
		display: grid;
		gap: 22px;
		max-width: 980px;
		margin: 0 auto;
	}

	header {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 12px 20px;
	}

	/* The name sits on a surface, never on the stripes, so its contrast can be measured. */
	.game-name {
		padding: 8px 14px 6px;
		border: 2px solid var(--fg);
		border-radius: 999px;
		background: var(--surface);
		font: 400 clamp(20px, 5vw, 28px) / 1 var(--font-display);
	}
</style>
