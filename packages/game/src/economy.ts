/** The version of the coin table. A change to any amount raises it (ADR 0010 D1). */
export const ECONOMY_VERSION = 1;
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
