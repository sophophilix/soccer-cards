<script lang="ts">
	import { resolve } from '$app/paths';

	const GAMES = [
		{
			name: 'Pairs',
			blurb: 'Turn two cards at a time. Find the pairs of the same player.',
			slug: 'pairs'
		},
		{
			name: 'Transfer Trail',
			blurb: 'Put a player’s clubs in the order they joined them.',
			slug: 'transfer-trail'
		},
		{
			name: 'Connections',
			blurb: 'Two players. Name a club they both played for.',
			slug: 'connections'
		},
		{
			name: 'Guess the Club',
			blurb: 'Read a career with one club hidden. Pick the missing club.',
			slug: 'guess-the-club'
		}
	] as const;
</script>

<h2>Games</h2>
<p class="muted">Pick a game. You win coins for playing. Nothing is ever taken away.</p>
<div class="gamelist">
	{#each GAMES as game (game.slug)}
		<a class="gamebtn" href={resolve(`/games/${game.slug}`)}>
			<b>{game.name}</b><span>{game.blurb}</span>
		</a>
	{/each}
</div>

<style>
	.gamelist {
		display: grid;
		gap: 12px;
		max-width: 520px;
	}

	.gamebtn {
		display: grid;
		justify-content: stretch;
		gap: 6px;
		box-sizing: border-box;
		padding: 14px 16px;
		border: 2px solid var(--fg);
		border-radius: 14px;
		background: var(--surface);
		box-shadow: 0 3px 0 var(--fg);
		color: var(--fg);
		text-decoration: none;
	}

	.gamebtn b {
		font: 400 22px/1.1 var(--font-display);
	}

	.gamebtn span {
		color: var(--muted);
	}
</style>
