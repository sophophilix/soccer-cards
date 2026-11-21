<script lang="ts">
	import { resolve } from '$app/paths';
	import CardFront from '../cards/CardFront.svelte';
	import { cardViewProps, type OwnedCard } from './owned-cards.ts';

	interface Props {
		owned: readonly OwnedCard[];
	}

	const { owned }: Props = $props();

	const copies = (count: number): string => (count === 1 ? '1 copy' : `${String(count)} copies`);
</script>

{#if owned.length === 0}
	<p>
		You have no cards yet. Open a pack on the <a href={resolve('/packs')}>Packs</a> page to get some.
	</p>
{:else}
	<ul class="grid">
		{#each owned as entry (entry.id)}
			<li>
				{#if entry.kind === 'known'}
					<div class="tile">
						<CardFront {...cardViewProps(entry.card, entry.face).front} />
						{#if entry.count > 1}<span class="count"
								>×{entry.count}<span class="hidden">&nbsp;copies</span></span
							>{/if}
					</div>
				{:else}
					<div class="unknown">
						<p>Unknown card</p>
						<p>You have {copies(entry.count)}.</p>
					</div>
				{/if}
			</li>
		{/each}
	</ul>
{/if}

<style>
	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
		gap: 14px;
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.tile {
		position: relative;
	}
	.count {
		position: absolute;
		top: 6px;
		right: 6px;
		padding: 2px 10px;
		border-radius: 999px;
		background: var(--accent);
		color: var(--accent-ink);
		font: 700 16px/1.4 var(--font-data);
	}
	/* Read by a screen reader, never seen. */
	.hidden {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip-path: inset(50%);
		white-space: nowrap;
	}
	.unknown {
		display: grid;
		place-content: center;
		aspect-ratio: 5 / 7;
		padding: 8px;
		border: 2px dashed var(--line);
		border-radius: 12px;
		text-align: center;
	}
</style>
