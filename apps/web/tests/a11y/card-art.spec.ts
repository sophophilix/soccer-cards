import { AxeBuilder } from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { createPlayerState } from '@soccer-cards/game';
import { readFile } from 'node:fs/promises';
import { STATE_KEY } from '../../src/lib/state/player-store.ts';

const TIERS = ['BASE', 'RARE', 'LEGEND', 'ICON'] as const;

interface Finding {
	readonly nodes: readonly {
		readonly target: unknown;
		readonly any: readonly { readonly data?: unknown }[];
	}[];
}

const example = async (name: string): Promise<unknown> =>
	JSON.parse(await readFile(`../../packages/schema/schemas/v1/examples/${name}`, 'utf8'));

/** Serves one invented outfield player for each tier and saves a collection that holds them. */
async function ownOneOfEachTier(page: Page): Promise<void> {
	const outfield = (await example('player.outfield.json')) as Record<string, unknown>;
	const players = TIERS.map((tier) => ({
		...outfield,
		name: `players/${tier.toLowerCase()}-player`,
		displayName: `${tier} Player`,
		tier
	}));
	const clubs = [await example('club.example.json')];
	await page.route('**/api/v1/players.json', (route) => route.fulfill({ json: { players } }));
	await page.route('**/api/v1/clubs.json', (route) => route.fulfill({ json: { clubs } }));
	await page.route('**/api/v1/photos/**', (route) => route.fulfill({ status: 404 }));
	const collection = Object.fromEntries(TIERS.map((tier) => [`${tier.toLowerCase()}-player`, 1]));
	const text = JSON.stringify({ ...createPlayerState(), collection });
	await page.addInitScript(
		([key, value]) => {
			localStorage.setItem(key, value);
		},
		[STATE_KEY, text] as const
	);
}

/** Names each contrast finding by element and measured ratio, so the report can quote it. */
function describeFindings(findings: readonly Finding[]): string[] {
	return findings.flatMap((finding) =>
		finding.nodes.map(
			(node) => `${JSON.stringify(node.target)}: ${JSON.stringify(node.any[0]?.data ?? null)}`
		)
	);
}

for (const colorScheme of ['light', 'dark'] as const) {
	test.describe(`card art with the system in ${colorScheme} mode`, () => {
		test.use({ colorScheme });

		for (const tier of TIERS) {
			test(`axe finds no contrast violation on a large ${tier.toLowerCase()} card front (most text is unmeasured)`, async ({
				page
			}, testInfo) => {
				await ownOneOfEachTier(page);
				await page.goto('/cards');
				await page.getByRole('button', { name: new RegExp(`${tier} Player`) }).click();
				await expect(page.getByRole('dialog')).toBeVisible();
				await page.evaluate(async () => document.fonts.ready);

				const results = await new AxeBuilder({ page })
					.withRules(['color-contrast'])
					.include('dialog')
					.analyze();

				expect(describeFindings(results.violations)).toEqual([]);
				// Axe can't measure text over a gradient or an overlap, so it lists that text as incomplete.
				// If it ever measures the art, this fails and the test should assert real ratios (T-0132).
				expect(results.incomplete).not.toEqual([]);
				testInfo.annotations.push({
					type: 'unmeasured',
					description: describeFindings(results.incomplete).join('\n')
				});
			});
		}

		test('axe finds no contrast violation on the sealed pack shelf (most text is unmeasured)', async ({
			page
		}, testInfo) => {
			await ownOneOfEachTier(page);
			await page.goto('/packs');
			await expect(page.getByRole('heading', { name: 'Open a pack' })).toBeVisible();
			await page.evaluate(async () => document.fonts.ready);

			const results = await new AxeBuilder({ page })
				.withRules(['color-contrast'])
				.include('.shelf')
				.analyze();

			expect(describeFindings(results.violations)).toEqual([]);
			// Axe can't measure text over a gradient or an overlap, so it lists that text as incomplete.
			// If it ever measures the art, this fails and the test should assert real ratios (T-0132).
			expect(results.incomplete).not.toEqual([]);
			testInfo.annotations.push({
				type: 'unmeasured',
				description: describeFindings(results.incomplete).join('\n')
			});
		});
	});
}
