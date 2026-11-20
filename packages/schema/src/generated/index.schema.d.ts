// Generated from schemas/v1 by `pnpm run generate`. Do not edit by hand.

/**
 * What the API holds and which data release it is, as served at index.json.
 */
export interface Discovery {
	/**
	 * The data release. A whole number from 1 that goes up with each release.
	 */
	dataVersion: number;
	/**
	 * When the pipeline wrote this release, as an RFC 3339 moment in UTC.
	 */
	generateTime: string;
	/**
	 * Each collection the API holds, with its list file.
	 */
	collections: DiscoveryCollection[];
}
export interface DiscoveryCollection {
	/**
	 * The collection's id, the first part of its resource names, such as players.
	 */
	collectionId: string;
	/**
	 * The collection's list file, as a path inside the API with no host.
	 */
	uri: string;
	/**
	 * The $id of the schema the list file follows, such as players.schema.json.
	 */
	schemaId: string;
	/**
	 * How many items the list file holds.
	 */
	itemCount: number;
}
