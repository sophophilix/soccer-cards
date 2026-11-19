// Generated from schemas/v1 by `pnpm run generate`. Do not edit by hand.

/**
 * Every club a player points to, as served at clubs.json.
 */
export interface ClubList {
	/**
	 * Each club in full. The list is one file, so it is capped.
	 *
	 * @maxItems 1000
	 */
	clubs: Club[];
}
export interface Club {
	/**
	 * The resource name, clubs/{club}. The slug is stable and never reused.
	 */
	name: string;
	/**
	 * The club's name as the card shows it, as plain text with no markup.
	 */
	displayName: string;
	/**
	 * The FIFA three-letter code of the club's association, such as ENG. Absent when it is not known.
	 */
	countryCode?: string;
	/**
	 * When this club's content last changed, as an RFC 3339 moment in UTC.
	 */
	updateTime: string;
}
