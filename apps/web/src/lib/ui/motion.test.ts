import { gsap } from 'gsap';
import { afterEach, expect, test, vi } from 'vitest';
import {
	arrive,
	celebrate,
	celebrationOf,
	playShot,
	pop,
	replay,
	tearPack,
	tiltToPointer
} from './motion.ts';
import type { ShotScene } from './motion.ts';

afterEach(() => {
	vi.restoreAllMocks();
	gsap.globalTimeline.clear();
});

/** Stubs the player's motion setting. */
function askForReducedMotion(reduce: boolean): void {
	vi.spyOn(window, 'matchMedia').mockImplementation(
		(query) => ({ matches: reduce, media: query }) as MediaQueryList
	);
}

function aBox(): HTMLElement {
	const box = document.createElement('div');
	document.body.append(box);
	return box;
}

function aGroup(): SVGGElement {
	return document.createElementNS('http://www.w3.org/2000/svg', 'g');
}

function aScene(): ShotScene {
	return {
		ball: aGroup(),
		keeper: aGroup(),
		arms: [aGroup(), aGroup()],
		net: aGroup(),
		word: aBox()
	};
}

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

test('a pack tears at once with reduced motion', async () => {
	askForReducedMotion(true);
	const timeline = vi.spyOn(gsap, 'timeline');

	await tearPack(aBox());

	expect(timeline).not.toHaveBeenCalled();
});

test('a pack tears over time without reduced motion', () => {
	askForReducedMotion(false);
	const timeline = vi.spyOn(gsap, 'timeline');

	void tearPack(aBox());

	expect(timeline).toHaveBeenCalledOnce();
});

test('a replay resolves at once with reduced motion', async () => {
	askForReducedMotion(true);
	const timeline = gsap.timeline({ paused: true });

	await replay(timeline);

	expect(timeline.timeScale()).toBe(1);
});

test('a replay runs slowly without reduced motion', () => {
	askForReducedMotion(false);
	const timeline = gsap.timeline({ paused: true }).to(aBox(), { x: 10, duration: 1 });

	void replay(timeline);

	expect(timeline.timeScale()).toBeLessThan(1);
});

test('a shot ends at once with the word showing under reduced motion', () => {
	askForReducedMotion(true);
	const scene = aScene();

	const timeline = playShot(scene, { aim: 'left', dive: 'right', end: 'goal' });

	expect(timeline.progress()).toBe(1);
	expect(timeline.paused()).toBe(true);
	expect(scene.word.style.opacity).toBe('1');
});

test('a shot starts from the beginning without reduced motion', () => {
	askForReducedMotion(false);
	const scene = aScene();

	const timeline = playShot(scene, { aim: 'left', dive: 'right', end: 'save' });

	expect(timeline.progress()).toBeLessThan(1);
	expect(scene.word.style.opacity).not.toBe('1');
});

test('a card arrives with no tween under reduced motion', () => {
	askForReducedMotion(true);
	const from = vi.spyOn(gsap, 'from');

	arrive(aBox());

	expect(from).not.toHaveBeenCalled();
});

test('a card arrives with a tween without reduced motion', () => {
	askForReducedMotion(false);
	const from = vi.spyOn(gsap, 'from');

	arrive(aBox());

	expect(from).toHaveBeenCalledOnce();
});

test('a banner pops with no tween under reduced motion', () => {
	askForReducedMotion(true);
	const from = vi.spyOn(gsap, 'from');

	pop(aBox());

	expect(from).not.toHaveBeenCalled();
});

test('a banner pops with a tween without reduced motion', () => {
	askForReducedMotion(false);
	const from = vi.spyOn(gsap, 'from');

	pop(aBox());

	expect(from).toHaveBeenCalledOnce();
});

test('a celebration starts no tween under reduced motion', () => {
	askForReducedMotion(true);
	const timeline = vi.spyOn(gsap, 'timeline');

	celebrate(aBox(), [aBox()], 'Spin');

	expect(timeline).not.toHaveBeenCalled();
});

test('a celebration starts a timeline without reduced motion', () => {
	askForReducedMotion(false);
	const timeline = vi.spyOn(gsap, 'timeline');

	celebrate(aBox(), [aBox()], 'Spin');

	expect(timeline).toHaveBeenCalledOnce();
});

test('a card does not tilt toward the pointer under reduced motion', () => {
	askForReducedMotion(true);
	const surface = aBox();
	const onTrack = vi.fn();
	const stop = tiltToPointer(surface, aBox(), onTrack);

	surface.dispatchEvent(new PointerEvent('pointermove', { clientX: 5, clientY: 5 }));

	expect(onTrack).not.toHaveBeenCalled();
	expect(surface.style.getPropertyValue('--mx')).toBe('');
	stop();
});

test('a card tilts toward the pointer without reduced motion', () => {
	askForReducedMotion(false);
	const surface = aBox();
	const onTrack = vi.fn();
	const stop = tiltToPointer(surface, aBox(), onTrack);

	surface.dispatchEvent(new PointerEvent('pointermove', { clientX: 5, clientY: 5 }));

	expect(onTrack).toHaveBeenCalledWith(true);
	stop();
});
