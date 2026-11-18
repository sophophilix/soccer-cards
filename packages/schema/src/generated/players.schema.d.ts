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
export type Tier = 'BASE' | 'RARE' | 'LEGEND' | 'ICON';

/**
 * Every player in the set, as served at players.json.
 */
export interface PlayerList {
	/**
	 * A summary of each player.
	 */
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
	 * A short title under the name, such as Magician, as plain text with no markup. The project writes it. It is not a sourced fact. Absent when the card has none.
	 */
	cardTitle?: string;
	/**
	 * The number printed on the card. Absent when the card has none.
	 */
	cardNumber?: number;
	outfieldRatings?: OutfieldRatings;
	goalkeeperRatings?: GoalkeeperRatings;
	playStats: PlayStats;
	photo?: Photo;
}
/**
 * The six ratings of a player who is not a goalkeeper. Absent for a goalkeeper.
 */
export interface OutfieldRatings {
	/**
	 * Running fast.
	 */
	pace: number;
	/**
	 * Scoring with a shot.
	 */
	shooting: number;
	/**
	 * Finding a team-mate with the ball.
	 */
	passing: number;
	/**
	 * Running with the ball.
	 */
	dribbling: number;
	/**
	 * Winning the ball back.
	 */
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
/**
 * The three numbers a battle uses, and the overall rating.
 */
export interface PlayStats {
	/**
	 * How well the card scores in a battle.
	 */
	attack: number;
	/**
	 * How well the card stops a goal in a battle.
	 */
	defence: number;
	/**
	 * How well the card keeps the ball in a battle.
	 */
	control: number;
	/**
	 * The big number on the front of the card.
	 */
	overall: number;
}
/**
 * Absent when no photo is licensed.
 */
export interface Photo {
	/**
	 * The photo file, as a path inside the API with no host.
	 */
	uri: string;
	/**
	 * The width in pixels.
	 */
	widthPx: number;
	/**
	 * The height in pixels.
	 */
	heightPx: number;
	/**
	 * The media type.
	 */
	mimeType: 'image/webp';
	attribution: Attribution;
}
/**
 * The credit and licence.
 */
export interface Attribution {
	/**
	 * The photo's author, as plain text with no markup.
	 */
	author: string;
	/**
	 * The licence's SPDX id. Only CC0-1.0, CC-PDM-1.0 for the public domain, and the CC-BY and CC-BY-SA versions on the SPDX list are allowed.
	 */
	licenseCode: string;
	/**
	 * The photo's file page on Wikimedia Commons.
	 */
	sourceUri: string;
}
