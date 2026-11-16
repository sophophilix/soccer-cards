import { createPlayerState } from '../state.ts';
import type { PlayerState } from '../state.ts';

/** Builds a player state for a test. Pass only the fields the test cares about. */
export function aPlayerState(overrides: Partial<PlayerState> = {}): PlayerState {
	return { ...createPlayerState(), ...overrides };
}
