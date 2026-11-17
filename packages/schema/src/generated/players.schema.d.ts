// Generated from schemas/v1 by `pnpm run generate`. Do not edit by hand.

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

/**
 * Every player in the set, as served at players.json.
 */
export interface PlayerList {
	players: PlayerSummary[];
}
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
	outfieldRatings?: OutfieldRatings;
	goalkeeperRatings?: GoalkeeperRatings;
	playStats: PlayStats;
	photo?: string;
}
/**
 * The six ratings of a player who is not a goalkeeper. Absent for a goalkeeper.
 */
export interface OutfieldRatings {
	pace: number;
	shooting: number;
	passing: number;
	dribbling: number;
	defending: number;
	/**
	 * Strength, stamina and jumping.
	 */
	physical: number;
}
/**
 * The six ratings of a goalkeeper. Absent for every other position.
 */
export interface GoalkeeperRatings {
	/**
	 * Reaching a shot with a dive.
	 */
	diving: number;
	/**
	 * Catching and holding the ball.
	 */
	handling: number;
	/**
	 * Kicking the ball far and true.
	 */
	kicking: number;
	/**
	 * Reacting to a close shot.
	 */
	reflexes: number;
	/**
	 * Running off the goal line.
	 */
	speed: number;
	/**
	 * Standing in the right place for a shot.
	 */
	positioning: number;
}
export interface PlayStats {
	attack: number;
	defence: number;
	control: number;
}
