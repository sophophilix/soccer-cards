// Generated from schemas/v1 by `pnpm run generate`. Do not edit by hand.

/**
 * One player in full, as served at players/{player}.json.
 */
export type Player = PlayerSummary & {
	/**
	 * When this player's content last changed, as an RFC 3339 moment in UTC.
	 */
	updateTime: string;
	/**
	 * The player's goals for clubs.
	 */
	clubGoalCount?: GoalCount;
	/**
	 * The player's goals for the national team.
	 */
	nationalTeamGoalCount?: GoalCount;
	transferFee?: TransferFee;
	/**
	 * The awards the player won.
	 */
	awards?: Award[];
	/**
	 * The clubs the player played for, oldest first. Youth and reserve sides are left out.
	 *
	 * @minItems 1
	 */
	careerSpells?: [CareerSpell, ...CareerSpell[]];
	/**
	 * The year of the first senior match.
	 */
	careerStartYear?: number;
	/**
	 * The year of the last senior match.
	 */
	careerEndYear?: number;
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
export type Tier = 'BASE' | 'RARE' | 'LEGEND' | 'ICON';
export type GoalCount = Sourced & GoalCount1;
/**
 * The highest fee a club paid for the player.
 */
export type TransferFee = Sourced & {
	/**
	 * The ISO 4217 code.
	 */
	currencyCode: string;
	/**
	 * Whole units.
	 */
	units: number;
	/**
	 * Billionths of a unit.
	 */
	nanos: number;
};
export type Award = Sourced & Award1;
/**
 * The player's games for the club in this spell.
 */
export type AppearanceCount = Sourced & {
	/**
	 * The number of games.
	 */
	value: number;
};
/**
 * The player's goals for the club in this spell.
 */
export type GoalCount2 = Sourced & {
	/**
	 * The number of goals.
	 */
	value: number;
};

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
export interface Sourced {
	/**
	 * Where the fact was read.
	 */
	sourceUri: string;
	/**
	 * The day the fact was read, as YYYY-MM-DD. The pattern passes a day that doesn't exist, such as 2026-02-30. The pipeline's validate stage checks for a real date.
	 */
	retrieveDate: string;
}
export interface GoalCount1 {
	/**
	 * The number of goals.
	 */
	value: number;
}
export interface Award1 {
	/**
	 * The award's name.
	 */
	displayName: string;
}
export interface CareerSpell {
	/**
	 * The club's resource name, clubs/{club}.
	 */
	club: string;
	/**
	 * The year the spell began.
	 */
	startYear: number;
	/**
	 * The year the spell ended. Absent while the player is still at the club.
	 */
	endYear?: number;
	appearanceCount?: AppearanceCount;
	goalCount?: GoalCount2;
}
