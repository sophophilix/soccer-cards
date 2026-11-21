import { expect, test } from 'vitest';
import { celebrationOf } from './motion.ts';

test('a player always celebrates the same way', () => {
	expect(celebrationOf('lionel-messi')).toBe(celebrationOf('lionel-messi'));
});

test('every celebration is one the scene knows how to play', () => {
	const moves = new Set(['Knee slide', 'Spin', 'Jump for joy', 'Big wave']);
	const ids = ['lionel-messi', 'erling-haaland', 'bukayo-saka', 'pedri', 'jordan-pickford'];

	for (const id of ids) expect(moves).toContain(celebrationOf(id));
});

test('players do not all share one celebration', () => {
	const ids = ['a', 'bb', 'ccc', 'dddd', 'eeeee', 'ffffff', 'ggggggg', 'hhhhhhhh'];

	expect(new Set(ids.map((id) => celebrationOf(id))).size).toBeGreaterThan(1);
});
