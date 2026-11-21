<!-- The Pick your team screen: the division, the plan and the best team for it. -->
<script lang="ts">
	import { FORMATIONS, TACTIC_IDS, bestTeam, lineUp, sideStrength } from '@soccer-cards/game';
	import type { CardId, CheckedCardSet, Formation, Tactic } from '@soccer-cards/game';
	import type { CardFace } from '../../lib/data/card-face-from-summary.ts';
	import {
		LINES,
		LINE_NAMES,
		POSITION_NAMES,
		TACTIC_WORDS,
		lineUpHint,
		tacticHint
	} from './match-words.ts';

	interface Props {
		readonly cardSet: CheckedCardSet;
		readonly faces: ReadonlyMap<CardId, CardFace>;
		readonly owned: readonly CardId[];
		readonly formation: Formation;
		readonly tactic: Tactic;
		readonly onFormation: (formation: Formation) => void;
		readonly onTactic: (tactic: Tactic) => void;
	}
	const { cardSet, faces, owned, formation, tactic, onFormation, onTactic }: Props = $props();

	const FORMATION_NAMES = Object.keys(FORMATIONS) as Formation[];
	const placed = $derived(lineUp(bestTeam(cardSet, owned, formation), cardSet, formation));
	const cardOf = $derived(new Map(cardSet.map((card) => [card.id, card])));
	const strength = $derived(
		placed.ok ? sideStrength({ lineUp: placed.value, cards: cardSet, tactic }, tactic) : undefined
	);
	const outOfPosition = $derived(placed.ok ? placed.value.outOfPosition : []);

	const total = (worth: number): string => String(Math.round(worth));
</script>

<p>
	You are the manager. Choose a formation and a tactic. A weaker team with the right plan can beat a
	stronger one.
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
{#if placed.ok && strength !== undefined}
	<div class="row">
		<span class="chip legend" data-testid="totals"
			>ATT {total(strength.attack)} · MID {total(strength.midfield)} · DEF {total(strength.defence)}
			· GK {total(strength.goalkeeper)}</span
		>
	</div>
	<div class="lines">
		{#each LINES as line (line)}
			<div class="line">
				<b>{LINE_NAMES[line]}</b>
				<ul>
					{#each placed.value.lines[line] as id (id)}
						{@const card = cardOf.get(id)}
						{#if card !== undefined}
							{@const isOut = outOfPosition.includes(id)}
							<li class="slot" class:oop={isOut}>
								<span class="name">{faces.get(card.id)?.displayName ?? card.id}</span>
								<span class="detail">{POSITION_NAMES[card.position]} · {card.overall}</span>
								{#if isOut}<span class="sr-only">, out of position</span>{/if}
							</li>
						{/if}
					{/each}
				</ul>
			</div>
		{/each}
	</div>
	<p class="muted">{lineUpHint(outOfPosition.length)}</p>
{/if}
<div class="row">
	<button type="button" class="btn primary" disabled>Kick off</button>
</div>

<style>
	.lines {
		display: grid;
		gap: 8px;
	}
	.line {
		display: grid;
		grid-template-columns: 3.4em minmax(0, 1fr);
		gap: 8px;
		align-items: center;
	}
	ul {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(84px, 1fr));
		gap: 6px;
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.slot {
		display: grid;
		padding: 6px;
		border: 2px solid var(--line);
		border-radius: 8px;
		overflow-wrap: anywhere;
	}
	.slot.oop {
		outline: 3px dashed var(--fg);
		outline-offset: 2px;
	}
	.detail {
		color: var(--muted);
	}
	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip-path: inset(50%);
	}
</style>
