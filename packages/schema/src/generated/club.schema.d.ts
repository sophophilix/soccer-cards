// Generated from schemas/v1 by `pnpm run generate`. Do not edit by hand.

/**
 * One club, as the list at clubs.json holds it. A club is text: it has no crest and no logo.
 */
export type ClubSchemaJson = Club;

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
