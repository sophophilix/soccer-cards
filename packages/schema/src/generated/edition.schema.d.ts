// Generated from schemas/v1 by `pnpm run generate`. Do not edit by hand.

/**
 * One edition, as the list at editions.json holds it. An edition is one set of cards.
 */
export type EditionSchemaJson = Edition;

export interface Edition {
	/**
	 * The resource name, editions/{edition}. The slug is stable and never reused.
	 */
	name: string;
	/**
	 * The edition's name as the game shows it, as plain text with no markup.
	 */
	displayName: string;
	/**
	 * The year the edition is for, such as 2026.
	 */
	year: number;
	/**
	 * When this edition's content last changed, as an RFC 3339 moment in UTC.
	 */
	updateTime: string;
}
