<!-- One Guess the Club question: the card, the career with one club hidden, four clubs and the result. -->
<script lang="ts">
	import { tick } from 'svelte';
	import CardFront from '../../../lib/cards/CardFront.svelte';
	import type { CardFrontProps } from '../../../lib/cards/card-front.ts';
	import {
		HIDDEN_CLUB_TEXT,
		markText,
		questionText,
		rightText,
		spellFacts,
		wrongText
	} from './guess-words.ts';

	const NEXT_GUARD_MS = 700;

	interface Spell {
		readonly clubName: string;
		readonly isHidden: boolean;
		readonly startYear: number;
		readonly endYear?: number;
		readonly games?: number;
		readonly goals?: number;
	}
	interface Props {
		readonly player: CardFrontProps;
		readonly spells: readonly Spell[];
		readonly options: readonly { readonly clubId: string; readonly name: string }[];
		readonly result?: { readonly pickedClubId: string; readonly rightClubId: string } | undefined;
		readonly isLast: boolean;
		readonly onPick: (clubId: string) => void;
		readonly onNext: () => void;
	}
	const { player, spells, options, result, isLast, onPick, onNext }: Props = $props();

	let hasPicked = $state(false);
	let isNextReady = $state(false);
	let nextButton = $state<HTMLButtonElement>();

	const rightName = $derived(options.find((o) => o.clubId === result?.rightClubId)?.name ?? '');
	const status = $derived(
		result === undefined
			? questionText(player.displayName)
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
<div class="w-[min(190px,100%)]" data-art><CardFront {...player} /></div>
<h2 class="label muted" id="career-label">Career</h2>
<ol class="spells m-0 grid list-none gap-1.5 p-0" aria-labelledby="career-label">
	{#each spells as spell, i (i)}
		{@const isHole = spell.isHidden && result === undefined}
		<li class={[isHole && 'hole', spell.isHidden && result !== undefined && 'hit']}>
			{#if isHole}
				<span aria-hidden="true">?</span><span class="sr-only">{HIDDEN_CLUB_TEXT}</span>
			{:else}
				<span>{spell.isHidden ? rightName : spell.clubName}</span>
			{/if}
			<small class="muted text-sm">{spellFacts(spell)}</small>
		</li>
	{/each}
</ol>
<h2 class="label muted" id="clubs-label">Clubs</h2>
<div
	class="grid grid-cols-1 gap-2 min-[421px]:grid-cols-2"
	role="group"
	aria-labelledby="clubs-label"
>
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
				<small class="font-extrabold">{markText(isRight)}</small>
			{/if}
		</div>
	{/each}
</div>
{#if result !== undefined}
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
	.spells li {
		display: grid;
		min-height: 44px;
		align-content: center;
		padding: 3px 10px;
		border: 2px solid var(--line);
		border-radius: 12px;
		overflow-wrap: anywhere;
	}
	.spells .hole {
		border: 2px dashed var(--fg);
	}
	.opt {
		min-width: 0;
		padding: 4px;
		border: 2px solid transparent;
		border-radius: 14px;
	}
	.spells .hit,
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
</style>
