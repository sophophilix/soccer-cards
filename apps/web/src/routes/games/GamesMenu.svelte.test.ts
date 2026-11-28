import { expect, test } from 'vitest';
import { render } from 'vitest-browser-svelte';
import GamesMenu from './GamesMenu.svelte';

test('says what the games are for, with nothing taken away', async () => {
	const screen = await render(GamesMenu);

	await expect
		.element(
			screen.getByText('Pick a game. You win coins for playing. Nothing is ever taken away.')
		)
		.toBeVisible();
	await expect.element(screen.getByRole('heading', { name: 'Games' })).toBeVisible();
});

test('offers Transfer Trail as a link to its own page', async () => {
	const screen = await render(GamesMenu);

	const link = screen.getByRole('link', {
		name: /Transfer Trail.*Put a player’s clubs in the order they joined them\./
	});

	await expect.element(link).toHaveAttribute('href', '/games/transfer-trail');
});

test('links to the page with no rel, so the site treats it as its own', async () => {
	const screen = await render(GamesMenu);

	await expect
		.element(screen.getByRole('link', { name: /Transfer Trail/ }))
		.not.toHaveAttribute('rel');
});

test('offers Pairs first, as a link to its own page', async () => {
	const screen = await render(GamesMenu);

	const links = screen.getByRole('link').elements();
	expect(links.map((link) => link.getAttribute('href'))).toEqual([
		'/games/pairs',
		'/games/transfer-trail',
		'/games/connections',
		'/games/guess-the-club'
	]);
});

test('offers Guess the Club with its line', async () => {
	const screen = await render(GamesMenu);

	await expect
		.element(
			screen.getByRole('link', {
				name: /Guess the Club.*Read a career with one club hidden\. Pick the missing club\./
			})
		)
		.toBeVisible();
});

test('offers Pairs with its line', async () => {
	const screen = await render(GamesMenu);

	await expect
		.element(
			screen.getByRole('link', {
				name: /Pairs.*Turn two cards at a time\. Find the pairs of the same player\./
			})
		)
		.toHaveAttribute('href', '/games/pairs');
});
