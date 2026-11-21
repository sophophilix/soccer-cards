<!-- The Pick your team screen: the division, the plan and the player's own 11. -->
<script lang="ts">
	import { FORMATIONS, TACTIC_IDS, TEAM_SIZE, sideStrength } from '@soccer-cards/game';
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
<div class="row">
	<span class="chip">{team.length} of {TEAM_SIZE} picked</span>
	<span class="chip legend" data-testid="totals"
		>ATT {total(strength.attack)} · MID {total(strength.midfield)} · DEF {total(strength.defence)} · GK
		{total(strength.goalkeeper)}</span
	>
</div>
<div class="lines">
	{#each LINES as line (line)}
		<div class="line">
			<b>{LINE_NAMES[line]}</b>
			<ul>
				{#each placed.lines[line] as id (id)}
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
<ul class="pickgrid">
	{#each players as card (card.id)}
		{@const isIn = team.includes(card.id)}
		{@const name = faces.get(card.id)?.displayName ?? card.id}
		<li>
			<button
				type="button"
				class="slot pick"
				aria-pressed={isIn}
				aria-label="{isIn ? 'Take out' : 'Pick'} {name}, {POSITION_NAMES[
					card.position
				]}, rating {card.overall}"
				onclick={() => {
					tap(card.id);
				}}
			>
				<span class="name">{name},</span>
				<span class="detail">{POSITION_NAMES[card.position]}, rating {card.overall}</span>
			</button>
		</li>
	{/each}
</ul>

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
	.pickgrid {
		grid-template-columns: repeat(auto-fill, minmax(104px, 1fr));
	}
	.slot {
		display: grid;
		padding: 6px;
		border: 2px solid var(--line);
		border-radius: 8px;
		overflow-wrap: anywhere;
	}
	.pick {
		width: 100%;
		min-height: 44px;
		background: var(--surface);
		color: var(--fg);
		font: inherit;
		text-align: left;
		cursor: pointer;
	}
	.pick[aria-pressed='true']::after {
		content: '✓';
	}
	.pick[aria-pressed='true'] {
		border-color: var(--fg);
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
