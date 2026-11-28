<script lang="ts">
	import CardFront from '../../../lib/cards/CardFront.svelte';
	import type { CardFrontProps } from '../../../lib/cards/card-front.ts';
	import { turnCard } from '../../../lib/ui/motion.ts';
	import { cardName, pairsText, statusText, turnsText, type PairsStatus } from './pairs-words.ts';

	const TAP_GUARD_MS = 400;

	interface BoardCard {
		readonly id: string;
		readonly state: 'down' | 'up' | 'matched';
		readonly front: CardFrontProps;
	}
	interface Props {
		readonly cards: readonly BoardCard[];
		readonly turns: number;
		readonly pairsFound: number;
		readonly status: PairsStatus;
		readonly onTap: (cardId: string) => void;
	}
	const { cards, turns, pairsFound, status, onTap }: Props = $props();

	let tappedId: string | undefined;
	let guardTimer: ReturnType<typeof setTimeout> | undefined;
	const turned = new WeakSet<HTMLElement>();

	function tap(card: BoardCard): void {
		if (card.state !== 'down' || tappedId === card.id) return;
		tappedId = card.id;
		clearTimeout(guardTimer);
		guardTimer = setTimeout(() => {
			tappedId = undefined;
		}, TAP_GUARD_MS);
		onTap(card.id);
	}

	// A card that mounts face down stays still (its class turns it), so no face shows early.
	function turning(isDown: boolean): (inner: HTMLElement) => void {
		return (inner) => {
			if (!turned.has(inner)) {
				turned.add(inner);
				return;
			}
			turnCard(inner, isDown ? 180 : 0);
		};
	}
</script>

<div class="row">
	<span class="chip">{turnsText(turns)}</span>
	<span class="chip legend">{pairsText(pairsFound, cards.length / 2)}</span>
</div>
<p class="muted" role="status" aria-live="polite">{statusText(status)}</p>
<h2 class="muted" id="pairs-cards-label">Cards</h2>
<div
	class={['grid', cards.length === 20 && 'ten']}
	role="group"
	aria-labelledby="pairs-cards-label"
	data-art
>
	{#each cards as card, i (card.id)}
		<div
			class={['slot', card.state === 'down' && 'down', card.state === 'matched' && 'matched']}
			data-testid={`slot-${card.id}`}
		>
			<div
				class="inner"
				data-testid={`turning-${card.id}`}
				{@attach turning(card.state === 'down')}
			>
				<div class="face front" aria-hidden="true" inert>
					<CardFront {...card.front} />
				</div>
				<div class="face cover" aria-hidden="true" inert>
					<div class="ground"></div>
					<div class="seal">SC</div>
				</div>
			</div>
			<button
				type="button"
				class="tap"
				aria-label={card.state === 'down'
					? cardName({ place: i + 1, state: 'down' })
					: cardName({ place: i + 1, state: card.state, name: card.front.displayName })}
				onclick={() => {
					tap(card);
				}}
			></button>
		</div>
	{/each}
</div>

<style>
	.grid {
		--cols: 4;
		display: grid;
		grid-template-columns: repeat(var(--cols), minmax(0, 1fr));
		gap: clamp(6px, 2vw, 12px);
		max-width: 560px;
	}
	.grid.ten {
		--cols: 5;
	}
	.slot {
		position: relative;
		aspect-ratio: 5 / 7;
		container-type: inline-size;
		perspective: 1100px;
	}
	.inner {
		position: relative;
		width: 100%;
		height: 100%;
		transform-style: preserve-3d;
	}
	.slot.down .inner {
		transform: rotateY(180deg);
	}
	.face {
		position: absolute;
		inset: 0;
		backface-visibility: hidden;
	}
	.cover {
		transform: rotateY(180deg);
		overflow: hidden;
		border-radius: 5cqw;
	}
	.ground {
		position: absolute;
		inset: 0;
		background:
			repeating-linear-gradient(62deg, transparent 0 5cqw, rgba(255, 255, 255, 0.07) 5cqw 10cqw),
			linear-gradient(200deg, var(--ctrl), var(--card-ink) 70%);
	}
	.seal {
		position: absolute;
		inset: 0;
		margin: auto;
		width: 54cqw;
		height: 54cqw;
		border-radius: 50%;
		display: grid;
		place-items: center;
		background: var(--booking);
		color: var(--booking-ink);
		border: 2.4cqw solid var(--card-ink);
		box-shadow: inset -4cqw -4cqw 0 rgba(0, 0, 0, 0.16);
		font: 400 15cqw / 1 var(--font-display);
	}
	.slot.matched .front {
		border-radius: 5cqw;
		box-shadow:
			0 0 0 0.8cqw var(--ctrl),
			0 2cqw 6cqw var(--card-shadow);
	}
	.tap {
		position: absolute;
		inset: 0;
		border: 0;
		border-radius: 5cqw;
		background: none;
	}
	.tap:focus-visible {
		outline: 3px solid var(--focus);
		outline-offset: 3px;
	}
</style>
