// Generated from schemas/v1 by `pnpm run generate`. Do not edit by hand.

export type Position = 'FW' | 'MF' | 'DF';
export type Tier = 'base' | 'rare' | 'legend';

/**
 * Every player in the set, as served at players.json.
 */
export interface PlayerList {
	players: PlayerSummary[];
}
export interface PlayerSummary {
	id: number;
	name: string;
	club: string;
	country: string;
	position: Position;
	tier: Tier;
	ratings: Ratings;
	playStats: PlayStats;
	photo?: string;
}
export interface Ratings {
	pace: number;
	shooting: number;
	passing: number;
	dribbling: number;
	defending: number;
	power: number;
}
export interface PlayStats {
	attack: number;
	defence: number;
	control: number;
}
