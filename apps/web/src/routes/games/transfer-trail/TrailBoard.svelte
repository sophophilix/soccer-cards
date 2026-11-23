<!-- One player's trail: the clubs to place, the numbered trail, and the check. -->
<script lang="ts">
	import { tick } from 'svelte';
	import type { ClubId, TrailCheck, TrailStep } from '@soccer-cards/game';
	import CardFront from '../../../lib/cards/CardFront.svelte';
	import type { CardFrontProps } from '../../../lib/cards/card-front.ts';
	import { checkText, placeText } from './trail-words.ts';

	interface Props {
		readonly step: TrailStep;
		readonly front: CardFrontProps;
		readonly nameOf: (clubId: ClubId) => string;
		readonly isLast: boolean;
		readonly onCheck: (answer: readonly ClubId[]) => TrailCheck | undefined;
		readonly onNext: () => void;
	}
	const { step, front, nameOf, isLast, onCheck, onNext }: Props = $props();

	let placed = $state.raw<readonly number[]>([]);
	let check = $state.raw<TrailCheck>();
	let said = $state('');
	let bank = $state<HTMLElement>();
	let checkButton = $state<HTMLButtonElement>();
	let nextButton = $state<HTMLButtonElement>();

	const isFull = $derived(placed.length === step.dealt.length);
	const answer = $derived(placed.map((tile) => step.dealt[tile] ?? ''));
	const status = $derived(
		said || `Which club did ${front.displayName} join first? Tap the clubs in order.`
	);

	function firstFreeTile(): HTMLElement | null {
		return bank?.querySelector<HTMLElement>('button:not(.gone)') ?? null;
	}

	async function place(tile: number): Promise<void> {
		if (check !== undefined || placed.includes(tile)) return;
		placed = [...placed, tile];
		if (placed.length === step.dealt.length) {
			said = 'The trail is full. Press Check.';
			await tick();
			checkButton?.focus();
		} else {
			await tick();
			firstFreeTile()?.focus();
		}
	}

	async function takeBack(tile: number): Promise<void> {
		if (check !== undefined || !placed.includes(tile)) return;
		placed = placed.filter((each) => each !== tile);
		said = `Took ${nameOf(step.dealt[tile] ?? '')} back.`;
		await tick();
		bank?.querySelectorAll<HTMLElement>('button')[tile]?.focus();
	}

	function goNext(event: MouseEvent): void {
		if (event.detail > 1) return;
		onNext();
	}

	async function checkTrail(): Promise<void> {
		if (check !== undefined) return;
		const result = onCheck(answer);
		if (result === undefined) {
			said = "We couldn't check that trail. Try again.";
			return;
		}
		check = result;
		said = checkText(result.isRight, front.displayName);
		await tick();
		nextButton?.focus();
	}
</script>

<p class="muted" role="status" aria-live="polite">{status}</p>
<div class="play">
	<div class="face"><CardFront {...front} /></div>
	<div class="side">
		{#if check === undefined && !isFull}
			<h3 id="bank-label">Clubs to place</h3>
			<div class="bank" role="group" aria-labelledby="bank-label" bind:this={bank}>
				{#each step.dealt as clubId, tile (tile)}
					<button
						type="button"
						class={['btn small tile', placed.includes(tile) && 'gone']}
						onclick={() => void place(tile)}>{nameOf(clubId)}</button
					>
				{/each}
			</div>
		{/if}
		<h3 id="trail-label">Trail, first club to last</h3>
		<ol class="trail" aria-labelledby="trail-label">
			{#each step.spells as spell, place (place)}
				{@const tile = placed[place]}
				{@const isRight = check?.places[place]}
				<li
					class={[
						'step',
						tile !== undefined && 'filled',
						isRight === true && 'hit',
						isRight === false && 'miss'
					]}
				>
					{#if check !== undefined}
						<span class="ans">
							<b>{nameOf(spell.clubId)}</b>
							<small class="muted"
								>{placeText(spell, isRight === true, nameOf(answer[place] ?? ''))}</small
							>
						</span>
					{:else if tile !== undefined}
						<button type="button" class="btn small tile" onclick={() => void takeBack(tile)}
							>{nameOf(step.dealt[tile] ?? '')}</button
						>
					{:else}
						<span class="muted">Club {place + 1}</span>
					{/if}
				</li>
			{/each}
		</ol>
		{#if check === undefined}
			<p class="muted">Tap a club in the trail to take it back.</p>
			{#if isFull}
				<div class="row">
					<button type="button" class="btn primary" bind:this={checkButton} onclick={checkTrail}
						>Check</button
					>
				</div>
			{/if}
		{:else}
			<div class="row">
				<button type="button" class="btn primary" bind:this={nextButton} onclick={goNext}
					>{isLast ? 'Finish round' : 'Next player'}</button
				>
			</div>
		{/if}
	</div>
</div>

<style>
	.play {
		display: grid;
		grid-template-columns: minmax(0, 190px) minmax(0, 1fr);
		gap: 16px;
		align-items: start;
	}
	.side {
		display: grid;
		gap: 10px;
		min-width: 0;
	}
	.bank {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}
	.gone {
		visibility: hidden;
	}
	.tile {
		min-height: 44px;
		max-width: 100%;
		border-radius: 12px;
		text-align: left;
		text-transform: none;
		font-size: 16px;
		line-height: 1.15;
		overflow-wrap: anywhere;
	}
	.trail {
		display: grid;
		gap: 6px;
		margin: 0;
		padding: 0;
		list-style: none;
		counter-reset: step;
	}
	.step {
		counter-increment: step;
		display: flex;
		gap: 8px;
		align-items: center;
		min-height: 44px;
		padding: 3px 8px 3px 6px;
		border: 2px dashed var(--line);
		border-radius: 12px;
	}
	.step::before {
		content: counter(step);
		display: grid;
		flex: none;
		width: 26px;
		height: 26px;
		place-items: center;
		border-radius: 50%;
		background: var(--fg);
		color: var(--bg);
		font: 800 15px/1 var(--font-data);
	}
	.step.filled {
		border-style: solid;
		border-color: var(--fg);
	}
	.step.hit {
		border-color: var(--ctrl);
		background: color-mix(in srgb, var(--ctrl) 18%, var(--surface));
	}
	.step.miss {
		border-color: var(--accent);
	}
	.ans {
		display: grid;
		min-width: 0;
		overflow-wrap: anywhere;
	}
	@media (max-width: 420px) {
		.play {
			grid-template-columns: minmax(0, 1fr);
		}
		.face {
			max-width: 190px;
		}
	}
</style>
