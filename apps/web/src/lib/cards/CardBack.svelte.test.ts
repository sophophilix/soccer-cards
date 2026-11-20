import { expect, test } from 'vitest';
import { render } from 'vitest-browser-svelte';
import CardBack from './CardBack.svelte';
import type { CardBackProps } from './card-back.ts';

function aBack(overrides: Partial<CardBackProps> = {}): CardBackProps {
	const ratings = { kind: 'outfield', pace: 97, shooting: 91, passing: 81 } as const;
	return { ratings: { ...ratings, dribbling: 92, defending: 36, physical: 77 }, ...overrides };
}

function aFullBack(overrides: Partial<CardBackProps> = {}): CardBackProps {
	return aBack({
		careerStartYear: 2015,
		careerEndYear: 2024,
		clubGoalCount: 250,
		nationalTeamGoalCount: 48,
		transferFee: { currencyCode: 'EUR', units: 222_000_000 },
		awards: ['Golden Shoe 2024'],
		photoCredit: { author: 'Jane Example', licenseCode: 'CC-BY-SA-4.0' },
		...overrides
	});
}

/** The text of each element the selector finds, with its spaces collapsed. */
function rows(container: HTMLElement, selector: string): string[] {
	const elements = [...container.querySelectorAll(selector)];
	return elements.map((row) => row.textContent.replace(/\s+/g, ' ').trim());
}

test('an outfield player shows six named ratings with their values', async () => {
	const screen = await render(CardBack, aBack());

	expect(rows(screen.container, '.ratings > div').join(', ')).toBe(
		'PACE 97, SHOOT 91, PASS 81, DRIBBLE 92, DEFEND 36, POWER 77'
	);
});

// The CSP blocks a prerendered style attribute, so an SVG attribute sets each bar's length.
test('each bar fills its track as far as its rating, with no style attribute', async () => {
	const screen = await render(CardBack, aBack());

	const share = [...screen.container.querySelectorAll('.track')].map((track) => {
		const bar = track.querySelector('rect')?.getBoundingClientRect().width ?? 0;
		return Math.round((bar / track.getBoundingClientRect().width) * 100);
	});
	expect(share).toEqual([97, 91, 81, 92, 36, 77]);
	expect(screen.container.querySelector('[style]')).toBeNull();
});

test('a goalkeeper shows the six goalkeeper ratings instead', async () => {
	const keeper = { kind: 'goalkeeper', diving: 86, handling: 85, kicking: 84 } as const;

	const screen = await render(CardBack, {
		ratings: { ...keeper, reflexes: 89, speed: 56, positioning: 90 }
	});

	expect(rows(screen.container, '.ratings > div').join(', ')).toBe(
		'DIVING 86, HANDLING 85, KICKING 84, REFLEXES 89, SPEED 56, POSITION 90'
	);
});

test('every fact shows in its own row, with the awards', async () => {
	const screen = await render(CardBack, aFullBack());

	expect(rows(screen.container, '.facts > div').join(', ')).toBe(
		'PLAYED 2015–2024, CLUB GOALS 250, COUNTRY GOALS 48, TRANSFER FEE €222m'
	);
	await expect.element(screen.getByText('Golden Shoe 2024')).toBeVisible();
});

test('a player with no facts shows no fact rows, no awards, no zero and no "unknown"', async () => {
	const screen = await render(CardBack, aBack({ awards: [] }));

	expect(screen.container.querySelector('.facts')).toBeNull();
	expect(screen.container.querySelector('.awards')).toBeNull();
	expect(screen.container.textContent).not.toMatch(/unknown|\b0\b/i);
});

test.each([
	['PLAYED', { careerStartYear: undefined }],
	['CLUB GOALS', { clubGoalCount: undefined }],
	['COUNTRY GOALS', { nationalTeamGoalCount: undefined }],
	['TRANSFER FEE', { transferFee: undefined }]
] as const)('without its fact, the %s row is absent and the others stay', async (label, gap) => {
	const screen = await render(CardBack, aFullBack(gap));

	const labels = rows(screen.container, '.facts dt');
	expect(labels).toHaveLength(3);
	expect(labels).not.toContain(label);
});

test('a career with no end year shows the year it started', async () => {
	const screen = await render(CardBack, aFullBack({ careerEndYear: undefined }));

	expect(rows(screen.container, '.facts > div')).toContain('PLAYED From 2015');
});

test.each([
	[{ currencyCode: 'EUR', units: 1_500_000_000 }, 'TRANSFER FEE €1.5bn'],
	[{ currencyCode: 'GBP', units: 35_500_000 }, 'TRANSFER FEE £35.5m'],
	[{ currencyCode: 'EUR', units: 750_000 }, 'TRANSFER FEE €750k']
] as const)('a fee of %o shows in short form', async (transferFee, row) => {
	const screen = await render(CardBack, aBack({ transferFee }));

	expect(rows(screen.container, '.facts > div')).toEqual([row]);
});

test('the credit line names the photo author and the licence as text', async () => {
	const photoCredit = { author: '<b>Jane</b> Example', licenseCode: 'CC-BY-SA-4.0' };

	const screen = await render(CardBack, aBack({ photoCredit }));

	expect(rows(screen.container, '.credit')).toEqual(['Photo: <b>Jane</b> Example, CC-BY-SA-4.0']);
	expect(screen.container.querySelector('.credit b, .credit a')).toBeNull();
});

test('a player with no photo has no credit line', async () => {
	const screen = await render(CardBack, aFullBack({ photoCredit: undefined }));

	expect(screen.container.textContent).not.toContain('Photo:');
});

test.each([180, 320])(
	'at %i pixels wide the back is 5 by 7, sized from its width, and fits eight long awards',
	async (widthPx) => {
		const awards = Array.from(
			{ length: 8 },
			(_, index) => `Champions League winner and Player of the Season ${String(2010 + index)}`
		);
		const screen = await render(CardBack, aFullBack({ awards }));
		screen.container.style.width = `${String(widthPx)}px`;

		const box = (selector: string): DOMRect =>
			screen.container.querySelector(selector)?.getBoundingClientRect() ?? new DOMRect();
		const fontPx = (selector: string): number =>
			Number.parseFloat(
				getComputedStyle(screen.container.querySelector(selector) ?? document.body).fontSize
			);
		expect(box('.card').width).toBe(widthPx);
		expect(box('.card').height).toBeCloseTo((widthPx * 7) / 5, 0);
		expect(fontPx('.ratings dt')).toBeCloseTo(widthPx * 0.04, 1);
		expect(fontPx('.credit')).toBeCloseTo(widthPx * 0.027, 1);
		expect(box('.awards li:last-child').bottom).toBeLessThanOrEqual(box('.awards').bottom);
		expect(box('.credit').bottom).toBeLessThanOrEqual(box('.card').bottom);
	}
);

test('the back takes its paper and ink from the card tokens, not the page theme', async () => {
	const screen = await render(CardBack, aFullBack());
	screen.container.style.setProperty('--card-ink', 'rgb(1, 2, 3)');
	screen.container.style.setProperty('--card-paper', 'rgb(4, 5, 6)');

	const back = getComputedStyle(screen.container.querySelector('.back') ?? document.body);
	expect(back.backgroundColor).toBe('rgb(1, 2, 3)');
	expect(back.color).toBe('rgb(4, 5, 6)');
});
