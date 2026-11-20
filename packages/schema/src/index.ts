/** Where each schema file is, from the root of this package. */
export const SCHEMA_PATHS = {
	players: 'schemas/v1/players.schema.json',
	player: 'schemas/v1/player.schema.json',
	clubs: 'schemas/v1/clubs.schema.json',
	club: 'schemas/v1/club.schema.json',
	editions: 'schemas/v1/editions.schema.json',
	edition: 'schemas/v1/edition.schema.json',
	index: 'schemas/v1/index.schema.json',
	credits: 'schemas/v1/credits.schema.json'
} as const;

export type { PlayerList } from './generated/players.schema.d.ts';
export type * from './generated/player.schema.d.ts';
export type { ClubList } from './generated/clubs.schema.d.ts';
export type { Club } from './generated/club.schema.d.ts';
export type { EditionList } from './generated/editions.schema.d.ts';
export type { Edition } from './generated/edition.schema.d.ts';
export type { Discovery, DiscoveryCollection } from './generated/index.schema.d.ts';
export type { Credit, CreditList } from './generated/credits.schema.d.ts';
