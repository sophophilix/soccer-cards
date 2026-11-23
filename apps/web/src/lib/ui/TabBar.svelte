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
		{ name: 'Games', path: '/games' },
		{ name: 'Cards', path: '/cards' },
		{ name: 'Guide', path: '/guide' }
	] as const;

	// The start page shows the Packs view, so its tab is current there too.
	const currentPath = $derived.by(() => {
		const trimmed = pathname.length > 1 ? pathname.replace(/\/$/, '') : pathname;
		return trimmed === resolve('/') ? resolve('/packs') : trimmed;
	});

	// A tab is current on its own address and on any page under it.
	function isCurrent(href: string): boolean {
		return currentPath === href || currentPath.startsWith(`${href}/`);
	}
</script>

<nav aria-label="Views">
	{#each VIEWS as view (view.path)}
		{@const href = resolve(view.path)}
		<a {href} aria-current={isCurrent(href) ? 'page' : undefined}
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

	/* On phones the tabs tighten, and their text shrinks with the screen so the bar
	   fits at 320 pixels even in a wide fallback font, with "Cards (N)" on the Cards tab. */
	@media (max-width: 520px) {
		nav {
			max-width: 100%;
		}
		a {
			padding-inline: 4px;
			font-size: clamp(11px, 3.6vw, 16px);
			letter-spacing: 0.02em;
		}
	}
</style>
