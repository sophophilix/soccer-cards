<script lang="ts">
	import { onMount } from 'svelte';
	import { createRandom, dealPairs, payPairsBoard, settleTurn, turnCard } from '@soccer-cards/game';
	import type {
		CardId,
		CheckedCardSet,
		PaidPairsBoard,
		PairsSize,
		PlayerState
	} from '@soccer-cards/game';
	import type { CardFace } from '../../../lib/data/card-face-from-summary.ts';
	import { randomSeed } from '../../../lib/packs/pack-session.ts';
	import type { PlayerStore } from '../../../lib/state/player-store.ts';
	import { cardPropsOf } from '../../packs/card-props.ts';
	import { CONNECTIONS_SAVE_NOTICES } from '../connections/connections-words.ts';
	import PairsBoard from './PairsBoard.svelte';
	import { finishText, type PairsStatus } from './pairs-words.ts';

	const MISMATCH_SHOWN_MS = 1000;

	interface Props {
		readonly size: PairsSize;
		readonly player: PlayerState;
		readonly cardSet: CheckedCardSet;
		readonly faces: ReadonlyMap<CardId, CardFace>;
		readonly store: PlayerStore;
		readonly onOtherSize: () => void;
	}
	const { size, player: given, cardSet, faces, store, onOtherSize }: Props = $props();

	let paidState = $state.raw<PlayerState>();
	const player = $derived(paidState ?? given);
	let board = $state.raw<PaidPairsBoard>();
	let status = $state.raw<PairsStatus>({ kind: 'first' });
	let notice = $state('');
	let heading = $state<HTMLElement>();
	let settleTimer: ReturnType<typeof setTimeout> | undefined;

	const found = $derived(
		board === undefined ? 0 : board.cards.filter((c) => c.state === 'matched').length / 2
	);
	const cards = $derived(
		(board?.cards ?? []).flatMap((entry, i) => {
			const card = cardSet.find((each) => each.id === entry.id);
			const face = faces.get(entry.id);
			return card === undefined || face === undefined
				? []
				: [{ id: String(i), state: entry.state, front: cardPropsOf(card, face).front }];
		})
	);

	onMount(() => {
		deal();
		return () => {
			clearTimeout(settleTimer);
		};
	});

	function deal(): void {
		const dealt = dealPairs(player, cardSet, size, createRandom(randomSeed()));
		if (!dealt.ok) return;
		clearTimeout(settleTimer);
		board = dealt.value;
		status = { kind: 'first' };
	}

	function nameAt(index: number): string {
		const id = board?.cards[index]?.id;
		return (id === undefined ? undefined : faces.get(id)?.displayName) ?? '';
	}

	async function pay(finished: PaidPairsBoard): Promise<void> {
		const paid = payPairsBoard(finished, player);
		if (!paid.ok) return;
		board = paid.value.board;
		paidState = paid.value.state;
		const saved = store.save(paid.value.state);
		if (!saved.ok) notice = CONNECTIONS_SAVE_NOTICES[saved.reason];
		await Promise.resolve();
		heading?.focus();
	}

	function tap(place: string): void {
		const index = Number(place);
		if (board === undefined) return;
		const next = turnCard(board, index);
		if (next === board) return;
		board = next;
		if (next.isComplete) {
			status = { kind: 'match', name: nameAt(index) };
			void pay(next);
		} else if (next.mismatch !== null) {
			status = { kind: 'miss' };
			settleTimer = setTimeout(() => {
				if (board === undefined) return;
				board = settleTurn(board);
				status = { kind: 'first' };
			}, MISMATCH_SHOWN_MS);
		} else {
			status =
				next.firstIndex === null ? { kind: 'match', name: nameAt(index) } : { kind: 'second' };
		}
	}
</script>

{#if notice}<p class="banner">{notice}</p>{/if}
{#if board !== undefined}
	{#if board.isPaid === true}
		<div class="empty">
			<h2 tabindex="-1" bind:this={heading}>All {board.size} pairs found!</h2>
			<p>{finishText(board.size, board.turns)}</p>
			<div class="row center">
				<button type="button" class="btn primary" onclick={deal}>Play again</button>
				<button type="button" class="btn" onclick={onOtherSize}>Another board size</button>
			</div>
		</div>
	{/if}
	<PairsBoard {cards} turns={board.turns} pairsFound={found} {status} onTap={tap} />
{/if}
