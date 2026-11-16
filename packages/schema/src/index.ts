/** Where each schema file is, from the root of this package. */
export const SCHEMA_PATHS = {
	players: 'schemas/v1/players.schema.json',
	player: 'schemas/v1/player.schema.json'
} as const;

export type { PlayerList } from './generated/players.schema.d.ts';
export type * from './generated/player.schema.d.ts';
