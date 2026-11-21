<script lang="ts">
	import { LUCKY_ODDS, PACK_CONTENTS } from '@soccer-cards/game';
	import type { CardId, CheckedCardSet, PlayerState, Tier } from '@soccer-cards/game';
	import CardSlot from '../../lib/cards/CardSlot.svelte';
	import CardDetail from '../../lib/collection/CardDetail.svelte';
	import { cardViewProps, type KnownCard } from '../../lib/collection/owned-cards.ts';
	import type { CardFace } from '../../lib/data/card-face-from-summary.ts';

	interface Props {
		player: PlayerState;
		cardSet: CheckedCardSet;
		faces: ReadonlyMap<CardId, CardFace>;
		/** Deletes every card. Returns false when this device wouldn't let it. */
		onreset: () => boolean;
	}

	const { player, cardSet, faces, onreset }: Props = $props();
	const GROUPS: readonly { readonly tier: Tier; readonly name: string }[] = [
		{ tier: 'icon', name: 'Icons' },
		{ tier: 'legend', name: 'Legends' },
		{ tier: 'rare', name: 'Rares' },
		{ tier: 'base', name: 'Base cards' }
	];
	const ODDS = `Each lucky card: Rare ${String(LUCKY_ODDS.rare)} in 100 · Legend ${String(LUCKY_ODDS.legend)} in 100 · Icon ${String(LUCKY_ODDS.icon)} in 100`;
	const { standard, jumbo } = PACK_CONTENTS;
	const PACKS = `A pack has ${String(standard.base)} base cards and ${String(standard.lucky)} lucky cards. A jumbo pack has ${String(jumbo.base)} base cards and ${String(jumbo.lucky)} lucky cards.`;

	let resetArmed = $state(false);
	let openedId = $state<CardId>();
	let opener: HTMLElement | undefined;

	const copies = (id: CardId): number =>
		Object.hasOwn(player.collection, id) ? (player.collection[id] ?? 0) : 0;
	// Each card's number is its place in the card set, as printed on the prototype's cards.
	const entries = $derived(
		cardSet.flatMap((card, index) => {
			const face = faces.get(card.id);
			return face === undefined ? [] : [{ card, face, number: index + 1 }];
		})
	);
	const collected = $derived(entries.filter((entry) => copies(entry.card.id) > 0).length);
	const share = $derived(entries.length === 0 ? 0 : collected / entries.length);
	const opened = $derived.by((): KnownCard | undefined => {
		const entry = entries.find((each) => each.card.id === openedId);
		return entry && { kind: 'known', id: entry.card.id, count: copies(entry.card.id), ...entry };
	});

	// The page's policy refuses style attributes, so the meter is filled through the CSS object model.
	function fill(node: HTMLElement): void {
		node.style.setProperty('transform', `scaleX(${String(share)})`);
	}

	const surname = (name: string): string => name.split(' ').at(-1) ?? name;
	const numberText = (number: number): string => `#${String(number).padStart(3, '0')}`;

	function reset(): void {
		if (!resetArmed) {
			resetArmed = true;
			return;
		}
		resetArmed = false;
		onreset();
	}
</script>

<p class="label">{collected} of {entries.length} collected</p>
<div class="meter" aria-hidden="true"><i {@attach fill}></i></div>
<p class="muted">
	Every card in the set. Cards join your collection only when you find them in a pack or trade for
	them.
</p>

{#each GROUPS as group (group.tier)}
	{@const inTier = entries.filter((entry) => entry.card.tier === group.tier)}
	{#if inTier.length > 0}
		<section class="tier-group">
			<div class="tierhead">
				<h2 class="group-name">{group.name}</h2>
				<span class="muted"
					>{inTier.filter((entry) => copies(entry.card.id) > 0).length} of {inTier.length}</span
				>
			</div>
			<ul class="grid deck">
				{#each inTier as entry (entry.card.id)}
					<li>
						{#if copies(entry.card.id) > 0}
							<CardSlot
								front={cardViewProps(entry.card, entry.face).front}
								label={`Look at ${entry.face.displayName}`}
								onclick={() => {
									opener =
										document.activeElement instanceof HTMLElement
											? document.activeElement
											: undefined;
									openedId = entry.card.id;
								}}
							>
								{#if player.favourites.includes(entry.card.id)}<span
										class="badge star"
										aria-hidden="true">★</span
									>{/if}
							</CardSlot>
						{:else}
							<div
								class="missing"
								role="img"
								aria-label={`${entry.face.displayName}, not collected yet`}
							>
								<b aria-hidden="true" data-art>?</b>
								<span aria-hidden="true" data-art
									>{numberText(entry.number)}<br />{surname(entry.face.displayName)}</span
								>
							</div>
						{/if}
					</li>
				{/each}
			</ul>
		</section>
	{/if}
{/each}

<p class="muted">{PACKS} {ODDS}.</p>
<p class="muted">
	Icons are all-time greats, picked by hand. Every other card earns its kind from the big number on
	its front: Legend is 88 or more, Rare is 84 to 87, and Base is 83 or less. Photos come from
	Wikimedia Commons under free licences, and the back of each card names the photographer.
</p>
<div class="row">
	<button class="btn small" type="button" onclick={reset}
		>{resetArmed ? 'Tap again to delete all cards' : 'Start again'}</button
	>
	<span class="muted">Your cards are saved on this device only.</span>
</div>

{#if opened}
	<CardDetail
		entry={opened}
		onclose={() => {
			openedId = undefined;
			opener?.focus();
		}}
	/>
{/if}

<style>
	ul {
		margin: 0;
		padding: 0;
		list-style: none;
	}
	/* A section's name is a heading for a screen reader, drawn as the prototype's small caps. */
	.group-name {
		color: var(--muted);
		font: 800 15px/1.2 var(--font-data);
		letter-spacing: 0.14em;
		text-transform: uppercase;
	}
</style>
