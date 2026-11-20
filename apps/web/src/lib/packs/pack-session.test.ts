import { checkCardSet, createPlayerState, createRandom, toCardId } from '@soccer-cards/game';
import type { Card, CheckedCardSet, PackToOpen, PlayerState, Tier } from '@soccer-cards/game';
import { describe, expect, it } from 'vitest';
import { createPlayerStore } from '../state/player-store.ts';
import type { ItemStorage, SaveResult } from '../state/player-store.ts';
import {
	addPackAndSave,
	frontOf,
	nameFromCardId,
	openPackAndSave,
	randomSeed,
	revealOrder
} from './pack-session.ts';

function aCard(id: string, tier: Tier = 'base'): Card {
	return {
		id: toCardId(id),
		tier,
		position: 'FW',
		overall: 70,
		attack: 72,
		defence: 40,
		control: 61
	};
}

/** A card set with every tier, enough to fill a standard pack. */
function aCardSet(): CheckedCardSet {
	const checked = checkCardSet([
		...['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i'].map((id) => aCard(`base-${id}`)),
		aCard('rare-a', 'rare'),
		aCard('legend-a', 'legend'),
		aCard('icon-a', 'icon')
	]);
	if (!checked.ok) throw new Error('the test card set is invalid');
	return checked.value;
}

/** A store that records what it saves and answers with `answer`. */
function aStore(answer: SaveResult = { ok: true }): {
	saves: PlayerState[];
	save: (state: PlayerState) => SaveResult;
} {
	const saves: PlayerState[] = [];
	const save = (state: PlayerState): SaveResult => {
		saves.push(state);
		return answer;
	};
	return { saves, save };
}

/** Storage held in memory, as a reload of the same browser would find it. */
function aMemoryStorage(): ItemStorage {
	const items = new Map<string, string>();
	return { getItem: (key) => items.get(key) ?? null, setItem: (key, text) => items.set(key, text) };
}

/** A standard pack with its own seeded random source, so no test shares one. */
function aPack(): PackToOpen {
	return { kind: 'standard', cardSet: aCardSet(), random: createRandom(7) };
}

describe('revealOrder', () => {
	it('shows the base cards first in drawn order and the best card last', () => {
		const ids = ['icon-a', 'base-b', 'rare-a', 'base-a', 'legend-a'].map(toCardId);

		const order = revealOrder(ids, aCardSet()).map((card) => card.id);

		expect(order).toEqual(['base-b', 'base-a', 'rare-a', 'legend-a', 'icon-a']);
	});

	it('leaves out a card the set no longer has', () => {
		const order = revealOrder([toCardId('gone'), toCardId('base-a')], aCardSet());

		expect(order.map((card) => card.id)).toEqual(['base-a']);
	});
});

describe('openPackAndSave', () => {
	it('saves the opened pack as pending, with a free pack spent', () => {
		const store = aStore();

		const result = openPackAndSave(store, createPlayerState(), aPack());

		expect(result.ok && result.saved).toEqual({ ok: true });
		expect(store.saves[0]?.pendingPack?.cardIds).toHaveLength(10);
		expect(store.saves[0]?.freePacks).toBe(1);
	});

	it('still opens the pack when the device cannot save', () => {
		const result = openPackAndSave(
			aStore({ ok: false, reason: 'not-saving' }),
			createPlayerState(),
			aPack()
		);

		expect(result.ok && result.value.pendingPack?.cardIds).toHaveLength(10);
		expect(result.ok && result.saved).toEqual({ ok: false, reason: 'not-saving' });
	});

	it('refuses a pack the player cannot pay for and saves nothing', () => {
		const store = aStore();

		const result = openPackAndSave(store, { ...createPlayerState(), freePacks: 0 }, aPack());

		expect(result).toEqual({ ok: false, reason: 'not-enough-coins' });
		expect(store.saves).toEqual([]);
	});
});

describe('addPackAndSave', () => {
	it('refuses when no pack is pending and saves nothing', () => {
		const store = aStore();

		expect(addPackAndSave(store, createPlayerState())).toEqual({
			ok: false,
			reason: 'no-pending-pack'
		});
		expect(store.saves).toEqual([]);
	});

	it('keeps the added cards for the next load, as a reload does', () => {
		const storage = aMemoryStorage();
		const store = createPlayerStore(() => storage);
		const opened = openPackAndSave(store, store.load().state, aPack());
		const added = opened.ok ? addPackAndSave(store, opened.value) : opened;

		const reloaded = createPlayerStore(() => storage).load();

		expect(added.ok && added.saved).toEqual({ ok: true });
		expect(Object.values(reloaded.state.collection).reduce((sum, copies) => sum + copies, 0)).toBe(
			10
		);
		expect(reloaded.state.pendingPack).toBeNull();
	});
});

describe('frontOf', () => {
	it('names the card from its id and uses the card front values', () => {
		const front = frontOf(aCard('ana-maria-oliveira', 'legend'));

		expect(front).toMatchObject({
			displayName: 'Ana Maria Oliveira',
			tier: 'LEGEND',
			position: 'FORWARD'
		});
	});

	it('writes a one-word id as one name', () => {
		expect(nameFromCardId(toCardId('pele'))).toBe('Pele');
	});
});

describe('randomSeed', () => {
	it('gives a whole number that the random source accepts', () => {
		const seed = randomSeed();

		expect(Number.isSafeInteger(seed) && seed >= 0).toBe(true);
		expect(() => createRandom(seed)).not.toThrow();
	});
});
