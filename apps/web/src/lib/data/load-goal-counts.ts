import type { FetchFile } from './load-card-set.ts';

/** The two goal counts of a player's record, each present only when the record has a whole number. */
export interface GoalCounts {
	readonly clubGoalCount?: number;
	readonly nationalTeamGoalCount?: number;
}

/** Where the site serves one player's record, on its own origin (ADR 0003 D5). */
function playerPath(playerId: string): string {
	return `/api/v1/players/${encodeURIComponent(playerId)}.json`;
}

// The player schema's GoalCount: a sourced fact whose `value` is the number of goals.
function goalCountOf(field: unknown): number | undefined {
	if (typeof field !== 'object' || field === null || !('value' in field)) return undefined;
	const { value } = field;
	return typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : undefined;
}

/** Reads the goal counts out of a player record body. A count that fails the check is left out. */
export function goalCountsFrom(body: unknown): GoalCounts {
	if (typeof body !== 'object' || body === null) return {};
	const club = 'clubGoalCount' in body ? goalCountOf(body.clubGoalCount) : undefined;
	const country =
		'nationalTeamGoalCount' in body ? goalCountOf(body.nationalTeamGoalCount) : undefined;
	return {
		...(club !== undefined && { clubGoalCount: club }),
		...(country !== undefined && { nationalTeamGoalCount: country })
	};
}

/** Fetches a player's record and returns its goal counts. A failed request or a bad body gives none. */
export async function loadGoalCounts(fetchFile: FetchFile, playerId: string): Promise<GoalCounts> {
	try {
		const response = await fetchFile(playerPath(playerId));
		return response.ok ? goalCountsFrom(await response.json()) : {};
	} catch {
		return {};
	}
}
