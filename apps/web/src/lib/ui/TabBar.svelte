<script lang="ts">
	import { resolve } from '$app/paths';

	interface Props {
		pathname: string;
		/** How many cards the player holds, shown on the Cards tab once known. */
		cardCount?: number | undefined;
	}

	const { pathname, cardCount }: Props = $props();

	const VIEWS = [
		{ name: 'Packs', path: '/packs' },
		{ name: 'Match', path: '/match' },
		{ name: 'Cards', path: '/cards' },
		{ name: 'Guide', path: '/guide' }
	] as const;

	// The start page shows the Packs view, so its tab is current there too.
	const currentPath = $derived.by(() => {
		const trimmed = pathname.length > 1 ? pathname.replace(/\/$/, '') : pathname;
		return trimmed === resolve('/') ? resolve('/packs') : trimmed;
	});
</script>

<nav aria-label="Views">
	{#each VIEWS as view (view.path)}
		{@const href = resolve(view.path)}
		<a {href} aria-current={href === currentPath ? 'page' : undefined}
			>{view.name}{#if view.name === 'Cards' && cardCount !== undefined}&nbsp;({cardCount}){/if}</a
		>
	{/each}
</nav>

<style>
	nav {
		display: flex;
		gap: 4px;
		padding: 4px;
		border: 2px solid var(--fg);
		border-radius: 999px;
		background: var(--surface);
	}

	a {
		flex: 1 1 auto;
		padding: 10px 12px 9px;
		border-radius: 999px;
		color: var(--fg);
		font: 800 16px/1 var(--font-data);
		letter-spacing: 0.08em;
		text-decoration: none;
		text-transform: uppercase;
		white-space: nowrap;
	}

	a[aria-current='page'] {
		background: var(--fg);
		color: var(--bg);
	}

	/* On the narrowest phones the tabs tighten to fit. */
	@media (max-width: 400px) {
		a {
			padding-inline: 4px;
			letter-spacing: 0.02em;
		}
	}
</style>
