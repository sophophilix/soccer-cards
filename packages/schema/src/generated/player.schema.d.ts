// Generated from schemas/v1 by `pnpm run generate`. Do not edit by hand.

/**
 * One player in full, as served at players/{id}.json.
 */
export type Player = PlayerSummary & {
	clubGoals?: GoalCount;
	countryGoals?: GoalCount;
	transferFee?: TransferFee;
	awards?: Award[];
};
export type Position = 'FW' | 'MF' | 'DF';
export type Tier = 'base' | 'rare' | 'legend';
export type Rating = number;
export type Source = string;
export type AsOf = string;

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
	pace: Rating;
	shooting: Rating;
	passing: Rating;
	dribbling: Rating;
	defending: Rating;
	power: Rating;
}
export interface PlayStats {
	attack: Rating;
	defence: Rating;
	control: Rating;
}
export interface GoalCount {
	goals: number;
	source: Source;
	asOf: AsOf;
}
/**
 * An amount in the currency's minor units, such as cents, and an ISO 4217 code.
 */
export interface TransferFee {
	amountMinor: number;
	currency: string;
	source: Source;
	asOf: AsOf;
}
export interface Award {
	title: string;
	source: Source;
	asOf: AsOf;
}
