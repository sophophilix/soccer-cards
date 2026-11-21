<!-- The Pick your team screen: the division, the plan and the player's own 11. -->
<script lang="ts">
	import { FORMATIONS, TACTIC_IDS, TEAM_SIZE, sideStrength } from '@soccer-cards/game';
	import type { CardId, CheckedCardSet, Formation, Tactic } from '@soccer-cards/game';
	import CardSlot from '../../lib/cards/CardSlot.svelte';
	import type { CardFace } from '../../lib/data/card-face-from-summary.ts';
	import { cardPropsOf } from '../packs/card-props.ts';
	import {
		LINES,
		LINE_NAMES,
		POSITION_NAMES,
		TACTIC_WORDS,
		lineUpHint,
		tacticHint
	} from './match-words.ts';
	import { arrangeTeam, clearTeam, pickBest, sortOwned, togglePick } from './team-picks.ts';

	interface Props {
		readonly cardSet: CheckedCardSet;
		readonly faces: ReadonlyMap<CardId, CardFace>;
		readonly owned: readonly CardId[];
		readonly formation: Formation;
		readonly tactic: Tactic;
		readonly initialTeam: readonly CardId[] | undefined;
		readonly onKickOff: (team: readonly CardId[]) => void;
		readonly onFormation: (formation: Formation) => void;
		readonly onTactic: (tactic: Tactic) => void;
	}
	const {
		cardSet,
		faces,
		owned,
		formation,
		tactic,
		initialTeam,
		onKickOff,
		onFormation,
		onTactic
	}: Props = $props();

	const FORMATION_NAMES = Object.keys(FORMATIONS) as Formation[];
	// The team is the player's own choice. It starts as the best one and keeps its players when
	// the formation changes.
	// svelte-ignore state_referenced_locally
	let team = $state.raw<readonly CardId[]>(initialTeam ?? pickBest(cardSet, owned, formation));
	let message = $state('');
	const placed = $derived(arrangeTeam(team, cardSet, formation));
	const cardOf = $derived(new Map(cardSet.map((card) => [card.id, card])));
	const strength = $derived(sideStrength({ lineUp: placed, cards: cardSet, tactic }, tactic));
	const outOfPosition = $derived(placed.outOfPosition);
	const players = $derived(sortOwned(cardSet, owned));
	const isFull = $derived(team.length === TEAM_SIZE);

	const total = (worth: number): string => String(Math.round(worth));

	function tap(id: CardId): void {
		const result = togglePick(team, id);
		if (result.ok) {
			team = result.team;
			message = '';
		} else {
			message = `You already have ${String(TEAM_SIZE)}. Take one out first.`;
		}
	}
</script>

<p>
	You are the manager. Choose a formation, put players in their own positions and pick a tactic. A
	weaker team with the right plan can beat a stronger one.
</p>
<h3>Formation</h3>
<div class="row">
	{#each FORMATION_NAMES as name (name)}
		<button
			type="button"
			class="btn small"
			aria-pressed={name === formation}
			onclick={() => {
				onFormation(name);
			}}>{name}</button
		>
	{/each}
</div>
<h3>Tactic</h3>
<div class="row">
	{#each TACTIC_IDS as id (id)}
		<button
			type="button"
			class="btn small"
			aria-pressed={id === tactic}
			onclick={() => {
				onTactic(id);
			}}>{TACTIC_WORDS[id].name}</button
		>
	{/each}
</div>
<p class="muted">{tacticHint(tactic)}</p>
<div class="row">
	<span class="chip">{team.length} of {TEAM_SIZE} picked</span>
	<span class="chip legend" data-testid="totals"
		>ATT {total(strength.attack)} · MID {total(strength.midfield)} · DEF {total(strength.defence)} · GK
		{total(strength.goalkeeper)}</span
	>
</div>
<div class="lines" data-testid="lineup">
	{#each LINES as line (line)}
		<div class="line" data-testid="line-{line}">
			<b>{LINE_NAMES[line]}</b>
			<div class="grid">
				{#each placed.lines[line] as id (id)}
					{@const card = cardOf.get(id)}
					{@const face = faces.get(id)}
					{#if card !== undefined && face !== undefined}
						{@const isOut = outOfPosition.includes(id)}
						<CardSlot
							front={cardPropsOf(card, face).front}
							label="{face.displayName}, {POSITION_NAMES[card.position]}{isOut
								? ', out of position'
								: ''}"
							outOfPosition={isOut}
							onclick={() => {
								tap(id);
							}}
						/>
					{/if}
				{/each}
			</div>
		</div>
	{/each}
</div>
<p class="muted">
	{isFull ? lineUpHint(outOfPosition.length) : 'Tap players below to fill the team.'}
</p>
<div class="row">
	<button
		type="button"
		class="btn primary"
		disabled={!isFull}
		onclick={() => {
			onKickOff(team);
		}}>Kick off</button
	>
	<button
		type="button"
		class="btn small"
		onclick={() => {
			team = pickBest(cardSet, owned, formation);
			message = '';
		}}>Pick my best team</button
	>
	<button
		type="button"
		class="btn small"
		onclick={() => {
			team = clearTeam();
			message = '';
		}}>Clear</button
	>
</div>
<p class="muted" role="status">{message}</p>
<h3>Your players</h3>
<div class="grid fixed pickgrid" data-testid="your-players">
	{#each players as card (card.id)}
		{@const face = faces.get(card.id)}
		{#if face !== undefined}
			{@const isIn = team.includes(card.id)}
			<CardSlot
				front={cardPropsOf(card, face).front}
				label="{isIn ? 'Take out' : 'Pick'} {face.displayName}, {POSITION_NAMES[
					card.position
				]}, rating {card.overall}"
				pressed={isIn}
				dim={!isIn}
				onclick={() => {
					tap(card.id);
				}}
			>
				{#if isIn}<span class="badge tick" aria-hidden="true">✓</span>{/if}
			</CardSlot>
		{/if}
	{/each}
</div>

<style>
	/* The prototype dims a player who is not picked. Grey keeps the card's text readable. */
	.pickgrid :global(.slot.dim) {
		opacity: 1;
		filter: grayscale(0.85);
	}
</style>
