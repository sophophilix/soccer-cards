import { checkCardSet, createPlayerState, createRandom, toCardId } from '@soccer-cards/game';
import type { PlayerState } from '@soccer-cards/game';
import { describe, expect, it } from 'vitest';
import { TEAM, aCard, aCardSet, aPlan, aState } from './match-fixtures.ts';
import { finishMatchAndSave, ownedCardIds, startMatch, startPenalties } from './play-match.ts';
import type { PlayedMatch } from './play-match.ts';

const first = TEAM[0] ?? toCardId('x');
const ten = TEAM.slice(0, 10);
const play = (team = TEAM, state = aState()): ReturnType<typeof startMatch> =>
	startMatch(state, aCardSet(), aPlan(team), createRandom(3));

function aPlayedMatch(): PlayedMatch {
	const played = play();
	if (!played.ok) throw new Error('the test match did not start');
	return played.value;
}

describe('ownedCardIds', () => {
	it('lists the cards held at least once, and none for an empty collection', () => {
		const collection = { [first]: 2, [toCardId('other')]: 0 };

		expect(ownedCardIds({ ...createPlayerState(), collection })).toEqual([first]);
		expect(ownedCardIds(createPlayerState())).toEqual([]);
	});
});

describe('startMatch', () => {
	it('returns both line-ups, plans and strengths, and eight moments', () => {
		const match = aPlayedMatch();

		expect([match.home.formation, match.home.tactic]).toEqual(['4-4-2', 'attack']);
		expect(match.away.lineUp.lines.GK).toHaveLength(1);
		expect(match.home.strength.midfield).toBeGreaterThan(0);
		expect(match.result.moments).toHaveLength(8);
	});

	it.each([
		['a card the player does not own', [...ten, toCardId('base-15')], 'card-not-owned'],
		['a duplicate id', [...ten, first], 'not-eleven-different-cards'],
		['a card the set does not have', [...ten, toCardId('gone')], 'card-not-in-set']
	])('refuses %s', (_name, team, reason) => {
		expect(play(team)).toEqual({ ok: false, reason });
	});

	it('refuses fewer than 11 different owned cards', () => {
		const collection = Object.fromEntries(ten.map((id) => [id, 5]));

		const played = play(TEAM, { ...createPlayerState(), collection });

		expect(played).toEqual({ ok: false, reason: 'not-enough-cards' });
	});

	it('refuses with the game reason when the set cannot field the computer', () => {
		const set = checkCardSet(TEAM.map((id) => aCard(id, 'FW')));
		if (!set.ok) throw new Error('the test card set is invalid');

		const played = startMatch(aState(), set.value, aPlan(), createRandom(1));

		expect(played).toEqual({ ok: false, reason: 'not-enough-cards' });
	});
});

describe('startPenalties', () => {
	it('starts a shoot-out with both goalkeeper strengths for a draw only', () => {
		const match = aPlayedMatch();
		const scored = (home: number, away: number): PlayedMatch => ({
			...match,
			result: { ...match.result, score: { home, away } }
		});

		expect(startPenalties(scored(2, 2))?.goalkeepers).toEqual({
			player: match.home.strength.goalkeeper,
			opponent: match.away.strength.goalkeeper
		});
		expect(startPenalties(scored(2, 1))).toBeUndefined();
	});
});

describe('finishMatchAndSave', () => {
	const saves: PlayerState[] = [];
	const store = {
		save: (state: PlayerState): { ok: true } => {
			saves.push(state);
			return { ok: true };
		}
	};

	it('pays the division prize for a win and saves it', () => {
		const done = finishMatchAndSave(store, aState(), true);

		expect([done.coinsWon, done.state.wins, done.wentUp]).toEqual([4, 1, false]);
		expect(saves).toContain(done.state);
	});

	it.each([
		['goes up a division on the third win', { divisionWins: 2 }, 4, true],
		['stays in the top division', { division: 'champions-league', divisionWins: 5 }, 10, false]
	] as const)('a win that %s', (_name, overrides, coins, wentUp) => {
		const done = finishMatchAndSave(store, aState(overrides), true);

		expect([done.coinsWon, done.wentUp]).toEqual([coins, wentUp]);
	});

	it('counts a loss and pays nothing', () => {
		const done = finishMatchAndSave(store, aState({ coins: 3 }), false);

		expect([done.state.losses, done.coinsWon, done.state.coins]).toEqual([1, 0, 3]);
	});

	it('returns the new state when the store cannot save', () => {
		const saved = { ok: false, reason: 'not-saving' } as const;

		const done = finishMatchAndSave({ save: () => saved }, aState(), true);

		expect([done.state.wins, done.saved]).toEqual([1, saved]);
	});
});
