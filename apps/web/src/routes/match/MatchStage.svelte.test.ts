import { expect, test } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { createRandom } from '@soccer-cards/game';
import type { Moment, SideName } from '@soccer-cards/game';
import { aCardSet, aPlan, aState } from '../../lib/match/match-fixtures.ts';
import { startMatch } from '../../lib/match/play-match.ts';
import type { FinishedMatch, PlayedMatch } from '../../lib/match/play-match.ts';
import MatchStage from './MatchStage.svelte';

function aMatchWith(moments: readonly Moment[]): PlayedMatch {
	const started = startMatch(aState(), aCardSet(), aPlan(), createRandom(1));
	if (!started.ok) throw new Error('the test match did not start');
	return { ...started.value, result: { ...started.value.result, moments } };
}

function aGoalFor(side: SideName, match: PlayedMatch): Moment {
	const { shooter, keeper } = match.result.moments[0] ?? {
		shooter: match.home.lineUp.lines.FW[0],
		keeper: match.home.lineUp.lines.GK[0]
	};
	return { minute: 10, side, ballWinner: shooter, shooter, keeper, outcome: 'goal' } as Moment;
}

const FINISHED: FinishedMatch = {
	state: aState(),
	coinsWon: 0,
	wentUp: false,
	saved: { ok: true }
};

test.each([
	['a win', 'home', 'You win!'],
	['a loss', 'away', 'The AI wins']
] as const)('the result panel is a status for %s', async (_name, side, heading) => {
	const played = aMatchWith([]);
	const match = aMatchWith([aGoalFor(side, played)]);
	const screen = await render(MatchStage, {
		match,
		cardSet: aCardSet(),
		faces: new Map(),
		coins: 0,
		finished: FINISHED,
		onFullTime: () => undefined,
		onAgain: () => undefined
	});

	await screen.getByRole('button', { name: 'Skip to full time' }).click();

	await expect
		.element(screen.getByRole('status').getByRole('heading', { name: heading }))
		.toBeVisible();
});

test('the result panel is a status for a draw', async () => {
	const screen = await render(MatchStage, {
		match: aMatchWith([]),
		cardSet: aCardSet(),
		faces: new Map(),
		coins: 0,
		finished: undefined,
		onFullTime: () => undefined,
		onAgain: () => undefined
	});

	await expect
		.element(screen.getByRole('status').getByRole('heading', { name: 'Full time' }))
		.toBeVisible();
});
