// Generated from schemas/v1 by `pnpm run generate`. Do not edit by hand.

/**
 * The credit of every photo the API serves, as served at credits.json.
 */
export interface CreditList {
	/**
	 * Each photo's credit. The list is one file, so it is capped.
	 *
	 * @maxItems 1000
	 */
	credits: Credit[];
}
export interface Credit {
	/**
	 * The resource name of the player in the photo, players/{player}.
	 */
	player: string;
	/**
	 * The photo file, as a path inside the API with no host.
	 */
	uri: string;
	attribution: Attribution;
}
/**
 * The photo's credit and licence.
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
