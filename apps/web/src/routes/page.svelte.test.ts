import { expect, test } from 'vitest';
import { render } from 'vitest-browser-svelte';
import HomePage from './+page.svelte';

test('the home page shows the name of the game as its heading', async () => {
	const screen = await render(HomePage);

	await expect.element(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Soccer Cards');
});
