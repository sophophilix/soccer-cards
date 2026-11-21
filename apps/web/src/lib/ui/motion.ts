import { gsap } from 'gsap';

// Every animation a player starts runs through here, so timing and reduced motion live in one
// place. The loops that run on their own (sheen, glow, wiggle) are CSS, in app.css. GSAP writes
// through the CSS object model, which the page's policy allows; style attributes it refuses.

/** Timings from the prototype, in seconds. docs/design/brand-kit.md lists them. */
const MOTION = {
	tear: { shake: 0.7, rip: 0.45, ripDelay: 0.35, drop: 0.3 },
	arrive: 0.5,
	flip: 0.55,
	tiltFollow: 0.08,
	tiltRest: 0.55,
	pop: 0.35,
	shot: { flight: 0.45, dive: 0.35, diveDelay: 0.08, ripple: 0.12, word: 0.3 },
	celebrate: 1.1,
	replaySpeed: 0.35
} as const;

/** True when the player asked for less motion, or when there's no window to ask. */
function prefersStill(): boolean {
	return (
		typeof window === 'undefined' || window.matchMedia('(prefers-reduced-motion: reduce)').matches
	);
}

/** Shakes a pack, tears its strip off and drops it. Resolves when it's gone, at once with reduced motion. */
export function tearPack(pack: HTMLElement): Promise<void> {
	if (prefersStill()) return Promise.resolve();
	const strip = pack.querySelector<HTMLElement>('.strip');
	const { shake, rip, ripDelay, drop } = MOTION.tear;
	return new Promise((done) => {
		const timeline = gsap.timeline({
			onComplete: () => {
				done();
			}
		});
		timeline.to(pack, {
			keyframes: [
				{ rotation: -4, duration: shake * 0.2 },
				{ rotation: 4, scale: 1.03, duration: shake * 0.2 },
				{ rotation: -3, scale: 1, duration: shake * 0.2 },
				{ rotation: 3, scale: 1.05, duration: shake * 0.2 },
				{ rotation: 0, scale: 1, duration: shake * 0.2 }
			],
			ease: 'sine.inOut'
		});
		if (strip) {
			timeline.to(
				strip,
				{
					xPercent: 40,
					yPercent: -260,
					rotation: 24,
					opacity: 0,
					duration: rip,
					ease: 'power2.in'
				},
				ripDelay
			);
		}
		timeline.to(pack, { y: 30, scale: 0.9, opacity: 0, duration: drop, ease: 'power1.in' }, shake);
	});
}

/** A new card rises into place with a little spin. */
export function arrive(node: HTMLElement): void {
	if (prefersStill()) return;
	gsap.from(node, {
		y: 40,
		rotation: -8,
		scale: 0.7,
		opacity: 0,
		duration: MOTION.arrive,
		ease: 'back.out(1.8)',
		clearProps: 'transform,opacity'
	});
}

/** Turns a card to its back (180) or its front (0). Reduced motion turns it at once. */
export function turnCard(inner: HTMLElement, degrees: 0 | 180): void {
	gsap.to(inner, {
		rotationY: degrees,
		duration: prefersStill() ? 0 : MOTION.flip,
		ease: 'back.out(1.4)'
	});
}

/** Pops a result or a banner in, so the moment lands. It only grows: faded text fails contrast. */
export function pop(node: HTMLElement): void {
	if (prefersStill()) return;
	gsap.from(node, {
		scale: 0.8,
		duration: MOTION.pop,
		ease: 'back.out(2)',
		clearProps: 'transform'
	});
}

/**
 * Tilts a card toward the pointer, up to 8 degrees up and down and 10 left and right, and moves
 * its glare and foil with it. Returns the clean-up. `onTrack` says when tracking starts and stops.
 */
export function tiltToPointer(
	surface: HTMLElement,
	tilted: HTMLElement,
	onTrack: (tracking: boolean) => void
): () => void {
	const toX = gsap.quickTo(tilted, 'rotationX', { duration: MOTION.tiltFollow, ease: 'none' });
	const toY = gsap.quickTo(tilted, 'rotationY', { duration: MOTION.tiltFollow, ease: 'none' });
	const move = (event: PointerEvent): void => {
		if (prefersStill()) return;
		const box = surface.getBoundingClientRect();
		const across = (event.clientX - box.left) / box.width;
		const down = (event.clientY - box.top) / box.height;
		onTrack(true);
		toX((0.5 - down) * 16);
		toY((across - 0.5) * 20);
		surface.style.setProperty('--mx', `${(across * 100).toFixed(0)}%`);
		surface.style.setProperty('--my', `${(down * 100).toFixed(0)}%`);
	};
	const rest = (): void => {
		onTrack(false);
		gsap.to(tilted, {
			rotationX: 0,
			rotationY: 0,
			duration: MOTION.tiltRest,
			ease: 'back.out(1.6)'
		});
		surface.style.removeProperty('--mx');
		surface.style.removeProperty('--my');
	};
	gsap.set(tilted, { transformPerspective: 1100 });
	surface.addEventListener('pointermove', move);
	surface.addEventListener('pointerleave', rest);
	surface.addEventListener('pointercancel', rest);
	return () => {
		surface.removeEventListener('pointermove', move);
		surface.removeEventListener('pointerleave', rest);
		surface.removeEventListener('pointercancel', rest);
		gsap.killTweensOf(tilted);
	};
}

/** Where a shot goes, from the shooter's view: a corner of the goal, or past a post. */
export type ShotAim = 'left' | 'middle' | 'right';
/** What a shot does: in, kept out, or past the post. */
export type ShotEnd = 'goal' | 'save' | 'wide';

/** The parts of a goal scene (MomentScene.svelte) a shot moves. */
export interface ShotScene {
	readonly ball: SVGGElement;
	readonly keeper: SVGGElement;
	readonly net: SVGGElement;
	readonly word: HTMLElement;
}

// The scene's goal mouth in its own units (viewBox 0 0 300 170): where the ball ends for each aim.
const BALL_START = { x: 150, y: 152 };
const AIMS: Readonly<Record<ShotAim, { x: number; y: number; dive: number; turn: number }>> = {
	left: { x: 88, y: 50, dive: -52, turn: -70 },
	middle: { x: 150, y: 44, dive: 0, turn: 0 },
	right: { x: 212, y: 50, dive: 52, turn: 70 }
};
const WIDE = { left: { x: 42, y: 34 }, middle: { x: 150, y: 6 }, right: { x: 258, y: 34 } };

/**
 * Plays one shot: the ball flies, the keeper dives to `dive`, and the net ripples on a goal or
 * the ball bounces off on a save. Returns the timeline, so a save can be replayed slowly. With
 * reduced motion everything jumps to the end at once.
 */
export function playShot(
	scene: ShotScene,
	shot: { readonly aim: ShotAim; readonly dive: ShotAim; readonly end: ShotEnd }
): gsap.core.Timeline {
	const { flight, dive, diveDelay, ripple, word } = MOTION.shot;
	const target = shot.end === 'wide' ? WIDE[shot.aim] : AIMS[shot.aim];
	const keeper = AIMS[shot.dive];
	const timeline = gsap.timeline();
	timeline
		.set(scene.ball, { x: 0, y: 0, scale: 1, rotation: 0, opacity: 1 })
		.set(scene.keeper, { x: 0, y: 0, rotation: 0 })
		.set(scene.net, { scaleY: 1, skewX: 0, transformOrigin: '50% 0%' })
		.set(scene.word, { scale: 0, opacity: 0 })
		.to(
			scene.ball,
			{
				x: target.x - BALL_START.x,
				y: target.y - BALL_START.y,
				scale: 0.55,
				rotation: 540,
				duration: flight,
				ease: 'power2.out'
			},
			0
		)
		.to(
			scene.keeper,
			{
				x: keeper.dive,
				y: shot.dive === 'middle' ? -14 : -20,
				rotation: keeper.turn,
				duration: dive,
				ease: 'power3.out',
				// The keeper turns about the middle of the body, so the gloves reach the corner.
				transformOrigin: '50% 50%'
			},
			diveDelay
		);
	if (shot.end === 'goal') {
		timeline.to(
			scene.net,
			{
				scaleY: 1.12,
				skewX: shot.aim === 'left' ? -6 : 6,
				duration: ripple,
				yoyo: true,
				repeat: 3
			},
			flight
		);
	} else if (shot.end === 'save') {
		timeline.to(
			scene.ball,
			{
				x: shot.aim === 'left' ? '+=30' : '-=30',
				y: '+=60',
				scale: 0.7,
				duration: 0.35,
				ease: 'bounce.out'
			},
			flight
		);
	}
	timeline.to(scene.word, { scale: 1, opacity: 1, duration: word, ease: 'back.out(3)' }, flight);
	if (prefersStill()) timeline.progress(1).pause();
	return timeline;
}

/** Plays a finished shot again in slow motion, as a replay. Resolves when it ends. */
export function replay(timeline: gsap.core.Timeline): Promise<void> {
	if (prefersStill()) return Promise.resolve();
	return new Promise((done) => {
		timeline.eventCallback('onComplete', () => {
			timeline.timeScale(1);
			timeline.eventCallback('onComplete', null);
			done();
		});
		timeline.timeScale(MOTION.replaySpeed).restart();
	});
}

/** The celebrations a scorer can do. Each player always does the same one. */
const CELEBRATIONS = ['Knee slide', 'Spin', 'Jump for joy', 'Big wave'] as const;
export type Celebration = (typeof CELEBRATIONS)[number];

/** A player's own celebration, the same every time, picked from their card's id. */
export function celebrationOf(cardId: string): Celebration {
	let hash = 0;
	for (const char of cardId) hash = (hash * 31 + char.charCodeAt(0)) % 9973;
	return CELEBRATIONS[hash % CELEBRATIONS.length] ?? 'Spin';
}

/** The scorer's card bursts in and celebrates, while confetti flies. */
export function celebrate(
	card: HTMLElement,
	confetti: readonly HTMLElement[],
	move: Celebration
): void {
	if (prefersStill()) return;
	const duration = MOTION.celebrate;
	const timeline = gsap.timeline();
	timeline.from(card, { scale: 0.3, opacity: 0, duration: 0.3, ease: 'back.out(2)' });
	if (move === 'Knee slide') {
		timeline.from(
			card,
			{ x: -140, rotation: -12, duration: duration * 0.6, ease: 'power3.out' },
			0
		);
	} else if (move === 'Spin') {
		timeline.to(card, { rotationY: 720, duration: duration * 0.8, ease: 'power2.inOut' }, 0.1);
	} else if (move === 'Jump for joy') {
		timeline.to(
			card,
			{ y: -36, duration: duration * 0.18, yoyo: true, repeat: 3, ease: 'power1.out' },
			0.2
		);
	} else {
		timeline.to(
			card,
			{ rotation: 8, duration: duration * 0.12, yoyo: true, repeat: 5, ease: 'sine.inOut' },
			0.2
		);
	}
	for (const bit of confetti) {
		timeline.fromTo(
			bit,
			{ x: 0, y: 0, opacity: 1, rotation: 0 },
			{
				x: gsap.utils.random(-140, 140),
				y: gsap.utils.random(-110, 60),
				rotation: gsap.utils.random(-540, 540),
				opacity: 0,
				duration: gsap.utils.random(0.8, 1.3),
				ease: 'power2.out'
			},
			0.05
		);
	}
}
