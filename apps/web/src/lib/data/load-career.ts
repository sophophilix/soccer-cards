import type { FetchFile } from './load-card-set.ts';

/** One spell at a club, with the club's published name. */
interface TrailSpell {
	readonly clubId: string;
	readonly displayName: string;
	readonly startYear: number;
	readonly endYear?: number;
}

/**
 * A player and the clubs they played for, in order. T-0158 declares the same
 * shape for the Transfer Trail rules; this is replaced by its import then.
 */
export interface Career {
	readonly playerId: string;
	readonly spells: readonly TrailSpell[];
}

const CLUB_PREFIX = 'clubs/';

/** Where the site serves one player's record, on its own origin (ADR 0003 D5). */
function playerPath(playerId: string): string {
	return `/api/v1/players/${encodeURIComponent(playerId)}.json`;
}

function isYear(value: unknown): value is number {
	return typeof value === 'number' && Number.isInteger(value);
}

function spellFrom(raw: unknown, clubNames: ReadonlyMap<string, string>): TrailSpell | undefined {
	if (typeof raw !== 'object' || raw === null) return undefined;
	const fields = raw as Record<string, unknown>;
	const { club, startYear, endYear } = fields;
	if (typeof club !== 'string' || !club.startsWith(CLUB_PREFIX) || !isYear(startYear)) {
		return undefined;
	}
	const displayName = clubNames.get(club);
	if (displayName === undefined) return undefined;
	const clubId = club.slice(CLUB_PREFIX.length);
	if (endYear === undefined) return { clubId, displayName, startYear };
	if (!isYear(endYear) || endYear < startYear) return undefined;
	return { clubId, displayName, startYear, endYear };
}

function careerFrom(
	playerId: string,
	body: unknown,
	clubNames: ReadonlyMap<string, string>
): Career | undefined {
	if (typeof body !== 'object' || body === null) return undefined;
	const raw = (body as Record<string, unknown>).careerSpells;
	if (!Array.isArray(raw) || raw.length === 0) return undefined;
	const spells: TrailSpell[] = [];
	for (const item of raw as unknown[]) {
		const spell = spellFrom(item, clubNames);
		if (spell === undefined) return undefined;
		spells.push(spell);
	}
	return { playerId, spells };
}

/** Fetches a player's record and returns their career, or undefined when it can't be used whole. */
export async function loadCareer(
	fetchFile: FetchFile,
	playerId: string,
	clubNames: ReadonlyMap<string, string>
): Promise<Career | undefined> {
	try {
		const response = await fetchFile(playerPath(playerId));
		return response.ok ? careerFrom(playerId, await response.json(), clubNames) : undefined;
	} catch {
		return undefined;
	}
}
