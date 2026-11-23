<!-- One Connections question: two players, four clubs, and after an answer the result. -->
<script lang="ts">
	import { tick } from 'svelte';
	import CardFront from '../../../lib/cards/CardFront.svelte';
	import type { CardFrontProps } from '../../../lib/cards/card-front.ts';
	import { markText, questionText, rightText, wrongText, yearsLine } from './connections-words.ts';

	const NEXT_GUARD_MS = 700;

	interface Spell {
		readonly startYear: number;
		readonly endYear?: number;
	}
	interface Props {
		readonly players: readonly [CardFrontProps, CardFrontProps];
		readonly options: readonly { readonly clubId: string; readonly name: string }[];
		readonly result?:
			| {
					readonly pickedClubId: string;
					readonly rightClubId: string;
					readonly years: readonly [Spell, Spell];
			  }
			| undefined;
		readonly isLast: boolean;
		readonly onPick: (clubId: string) => void;
		readonly onNext: () => void;
	}
	const { players, options, result, isLast, onPick, onNext }: Props = $props();

	let hasPicked = $state(false);
	let isNextReady = $state(false);
	let nextButton = $state<HTMLButtonElement>();

	const rightName = $derived(options.find((o) => o.clubId === result?.rightClubId)?.name ?? '');
	const status = $derived(
		result === undefined
			? questionText(players[0].displayName, players[1].displayName)
			: result.pickedClubId === result.rightClubId
				? rightText(rightName)
				: wrongText(rightName)
	);

	function pick(clubId: string): void {
		if (hasPicked || result !== undefined) return;
		hasPicked = true;
		onPick(clubId);
	}

	function goNext(): void {
		if (!isNextReady) return;
		onNext();
	}

	$effect(() => {
		if (result === undefined) return;
		const timer = setTimeout(() => {
			isNextReady = true;
		}, NEXT_GUARD_MS);
		void tick().then(() => nextButton?.focus());
		return () => {
			clearTimeout(timer);
		};
	});
</script>

<p class="muted" role="status" aria-live="polite">{status}</p>
<div class="faces">
	{#each players as player, i (i)}
		<div class="face" data-art><CardFront {...player} /></div>
	{/each}
</div>
<h2 class="label" id="clubs-label">Clubs</h2>
<div class="opts" role="group" aria-labelledby="clubs-label">
	{#each options as option (option.clubId)}
		{@const isRight = result?.rightClubId === option.clubId}
		{@const isMiss = result?.pickedClubId === option.clubId && !isRight}
		<div class={['opt', isRight && 'hit', isMiss && 'miss']}>
			<button
				type="button"
				class="btn tile"
				onclick={() => {
					pick(option.clubId);
				}}>{option.name}</button
			>
			{#if isRight || isMiss}
				<small class="mark">{markText(isRight)}</small>
			{/if}
		</div>
	{/each}
</div>
{#if result !== undefined}
	<h2 class="label" id="years-label">Years at {rightName}</h2>
	<div aria-labelledby="years-label" role="group">
		{#each players as player, i (i)}
			<p>{yearsLine(player.displayName, rightName, result.years[i] ?? result.years[0])}</p>
		{/each}
	</div>
	<div class="row">
		<button
			type="button"
			class="btn primary"
			bind:this={nextButton}
			aria-disabled={isNextReady ? undefined : 'true'}
			onclick={goNext}>{isLast ? 'Finish round' : 'Next'}</button
		>
	</div>
{/if}

<style>
	.faces {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 190px));
		gap: 16px;
	}
	.label {
		color: var(--muted);
		font: 800 var(--text-label) / var(--text-label--line-height) var(--font-data);
		letter-spacing: var(--tracking-heading);
		text-transform: uppercase;
	}
	.opts {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 8px;
	}
	.opt {
		min-width: 0;
		padding: 4px;
		border: 2px solid transparent;
		border-radius: 14px;
	}
	.opt.hit {
		border-color: var(--ctrl);
		background: color-mix(in srgb, var(--ctrl) 18%, var(--surface));
	}
	.opt.miss {
		border-color: var(--accent);
	}
	.tile {
		min-height: 44px;
		text-transform: none;
		font-size: 16px;
		line-height: 1.15;
		overflow-wrap: anywhere;
	}
	.mark {
		font-weight: 800;
	}
	@media (max-width: 420px) {
		.faces {
			grid-template-columns: minmax(0, 190px);
			justify-content: center;
		}
		.opts {
			grid-template-columns: minmax(0, 1fr);
		}
	}
</style>
