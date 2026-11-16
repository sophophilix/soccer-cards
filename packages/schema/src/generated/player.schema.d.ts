// Generated from schemas/v1 by `pnpm run generate`. Do not edit by hand.

/**
 * One player in full, as served at players/{player}.json.
 */
export type Player = PlayerSummary & {
	/**
	 * When this player's content last changed, as an RFC 3339 moment in UTC.
	 */
	updateTime: string;
	clubGoals?: GoalCount;
	countryGoals?: GoalCount;
	transferFee?: TransferFee;
	awards?: Award[];
};
/**
 * Whether the player still plays. Treat a value you don't know as unknown.
 */
export type State = 'ACTIVE' | 'RETIRED';
/**
 * Where the player plays. Treat a value you don't know as unknown.
 */
export type Position = 'GOALKEEPER' | 'DEFENDER' | 'MIDFIELDER' | 'FORWARD';
/**
 * How rare the card is. Treat a value you don't know as unknown.
 */
export type Tier = 'BASE' | 'RARE' | 'LEGEND';
export type Rating = number;
export type Source = string;
export type AsOf = string;

export interface PlayerSummary {
	/**
	 * The resource name, players/{player}. The slug is stable and never reused.
	 */
	name: string;
	/**
	 * The player's name as the card shows it.
	 */
	displayName: string;
	/**
	 * The player's given name. Absent unless the player has a given and a family name.
	 */
	givenName?: string;
	/**
	 * The player's family name. Absent unless the player has a given and a family name.
	 */
	familyName?: string;
	state: State;
	/**
	 * The resource name of the player's club, clubs/{club}. Absent for a retired player.
	 */
	club?: string;
	/**
	 * The FIFA three-letter code of the player's national team, such as ARG.
	 */
	nationalTeamCode: string;
	position: Position;
	tier: Tier;
	/**
	 * The number printed on the card. Absent when the card has none.
	 */
	cardNumber?: number;
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
