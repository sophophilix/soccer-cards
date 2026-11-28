/** The version of the coin table. A change to any amount raises it (ADR 0010 D1). */
export const ECONOMY_VERSION = 5;
/** The coins a new player starts with. */
export const STARTING_COINS = 0;
/** The price of a standard pack once the free packs are used. */
export const STANDARD_PACK_COST_COINS = 5;
/** The price of a jumbo pack. A free pack never pays for it. */
export const JUMBO_PACK_COST_COINS = 20;
/** The coins a win pays, by division. */
export const WIN_COINS_BY_DIVISION = {
	'division-4': 4,
	'division-3': 5,
	'division-2': 6,
	'division-1': 8,
	'champions-league': 10
} as const;
/** The coins a Transfer Trail pays for a trail put right on its first check. */
export const TRAIL_RIGHT_COINS = 1;
/** The coins finishing a Transfer Trail round pays. */
export const TRAIL_FINISH_COINS = 2;
/** The coins a Connections question pays for a right first answer. */
export const CONNECTIONS_RIGHT_COINS = 1;
/** The coins finishing a Connections round pays. */
export const CONNECTIONS_FINISH_COINS = 2;
/** The coins a Guess the Club question pays for a right first answer. */
export const GUESS_RIGHT_COINS = 1;
/** The coins finishing a Guess the Club round pays. */
export const GUESS_FINISH_COINS = 2;
/** The coins a finished Pairs board pays, by its number of pairs. */
export const PAIRS_BOARD_COINS = { 6: 3, 8: 4, 10: 5 } as const;
/** The coins added when a Pairs board took no more than twice as many turns as pairs. */
export const PAIRS_FEW_TURNS_BONUS = 1;
