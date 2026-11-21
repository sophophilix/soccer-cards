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
	pop: 0.35
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
