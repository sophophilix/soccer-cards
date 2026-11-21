<!-- The penalty shoot-out panel: the score, whose kick it is, and a button for each corner. -->
<script lang="ts">
	import { CORNERS } from '@soccer-cards/game';
	import type { Corner, ShootOut } from '@soccer-cards/game';

	interface Props {
		readonly shootOut: ShootOut;
		readonly onPick: (corner: Corner) => void;
	}
	const { shootOut, onPick }: Props = $props();

	const KICK_MS = 900;
	const REDUCED_MOTION_KICK_MS = 150;
	const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	const LABELS: Record<Corner, string> = { left: 'Left', middle: 'Middle', right: 'Right' };

	let isShowingKick = $state(false);
	let timer: ReturnType<typeof setTimeout> | undefined;
	const isOver = $derived(shootOut.status.kind === 'over');
	const ask = $derived(
		shootOut.status.kind === 'kicking' && shootOut.status.next === 'opponent'
			? 'Their kick. Pick where your keeper dives.'
			: 'Your kick. Pick where to shoot.'
	);

	function pick(corner: Corner): void {
		// A second tap while a kick is shown takes no kick.
		if (isShowingKick || isOver) return;
		isShowingKick = true;
		onPick(corner);
		timer = setTimeout(
			() => {
				isShowingKick = false;
			},
			reducedMotion ? REDUCED_MOTION_KICK_MS : KICK_MS
		);
	}

	$effect(() => () => {
		clearTimeout(timer);
	});
</script>

<div class="pens">
	<h2>Penalty shoot-out</h2>
	<p class="score" data-testid="pens-score">{shootOut.score.player} – {shootOut.score.opponent}</p>
	{#if !isOver}<p>{ask}</p>{/if}
	<div class="row">
		{#each CORNERS as corner (corner)}
			<button
				type="button"
				class="btn"
				disabled={isShowingKick || isOver}
				onclick={() => {
					pick(corner);
				}}>{LABELS[corner]}</button
			>
		{/each}
	</div>
</div>

<style>
	.pens {
		display: grid;
		gap: 10px;
		justify-items: center;
		text-align: center;
	}
	.score {
		margin: 0;
		font: 800 italic clamp(34px, 10vw, 52px) / 1 var(--font-data);
	}
	.row {
		justify-content: center;
	}
</style>
