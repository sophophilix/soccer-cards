import { expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import MomentScene from './MomentScene.svelte';
import type { SceneShot } from './scene-shot.ts';

function aSave(key: string): SceneShot {
	return { key, aim: 'left', dive: 'left', end: 'save', keeper: 'ai' };
}

test('a new shot during a replay ends it and brings the button back', async () => {
	const onReplay = vi.fn();
	const screen = await render(MomentScene, { shot: aSave('moment-10'), onReplay });
	await screen.getByRole('button', { name: 'Replay the save' }).click();
	await expect.element(screen.getByRole('button', { name: 'Replaying…' })).toBeDisabled();

	await screen.rerender({ shot: aSave('moment-20'), onReplay });

	await expect.element(screen.getByRole('button', { name: 'Replay the save' })).toBeEnabled();
	expect(onReplay.mock.calls).toEqual([[true], [false]]);
});

test('pressing replay twice starts one replay', async () => {
	const onReplay = vi.fn();
	const screen = await render(MomentScene, { shot: aSave('moment-10'), onReplay });

	await screen.getByRole('button', { name: 'Replay the save' }).click();
	await screen.getByRole('button', { name: 'Replaying…' }).click({ force: true });

	expect(onReplay.mock.calls).toEqual([[true]]);
});
