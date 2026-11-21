import { POSITIONS, TIER_NAMES, type CardFrontProps } from './card-front.ts';

// The ratings use the player schema's names, so a player's ratings pass straight in.
const OUTFIELD = ['pace', 'shooting', 'passing', 'dribbling', 'defending', 'physical'] as const;
const GOALKEEPER = ['diving', 'handling', 'kicking', 'reflexes', 'speed', 'positioning'] as const;
const LABELS = {
	outfield: ['PACE', 'SHOOT', 'PASS', 'DRIBBLE', 'DEFEND', 'POWER'],
	goalkeeper: ['DIVING', 'HANDLING', 'KICKING', 'REFLEXES', 'SPEED', 'POSITION']
} as const;

export type CardRatings =
	| ({ readonly kind: 'outfield' } & Readonly<Record<(typeof OUTFIELD)[number], number>>)
	| ({ readonly kind: 'goalkeeper' } & Readonly<Record<(typeof GOALKEEPER)[number], number>>);

/** A fee in whole units of an ISO 4217 currency, such as EUR. */
export interface TransferFee {
	readonly currencyCode: string;
	readonly units: number;
}

/** Who the card is: the header, name and line under it, as on the prototype's back. */
interface CardAbout {
	readonly displayName: string;
	readonly positionName: string;
	readonly clubName?: string | undefined;
	readonly nationalTeamCode?: string | undefined;
	readonly cardNumber?: number | undefined;
	readonly tierName: string;
	readonly overall: number;
}

/** Everything the back of a card shows. An absent fact shows no row. */
export interface CardBackProps {
	readonly ratings: CardRatings;
	readonly about?: CardAbout | undefined;
	/** The player's own record on the site, read when the back shows, for its goal counts. */
	readonly detailUri?: string | undefined;
	readonly careerStartYear?: number | undefined;
	readonly careerEndYear?: number | undefined;
	readonly clubGoalCount?: number | undefined;
	readonly nationalTeamGoalCount?: number | undefined;
	readonly transferFee?: TransferFee | undefined;
	readonly awards?: readonly string[] | undefined;
	readonly photoCredit?: { readonly author: string; readonly licenseCode: string } | undefined;
}

/** Lists the six ratings in the prototype's order, with the label the card prints. */
export function listRatings(ratings: CardRatings): readonly { label: string; value: number }[] {
	const values =
		ratings.kind === 'outfield'
			? OUTFIELD.map((key) => ratings[key])
			: GOALKEEPER.map((key) => ratings[key]);
	return LABELS[ratings.kind].map((label, index) => ({ label, value: values[index] ?? 0 }));
}

/** Writes a fee in the short form a child reads, such as €222m. */
export function formatFee(fee: TransferFee): string {
	const parts = new Intl.NumberFormat('en-GB', {
		style: 'currency',
		currency: fee.currencyCode,
		currencyDisplay: 'narrowSymbol',
		notation: 'compact',
		maximumFractionDigits: 1
	}).formatToParts(fee.units);
	return parts
		.map((part) => (part.type === 'compact' ? part.value.toLowerCase() : part.value))
		.join('');
}

/** The years a player played, or null without a start year. */
export function formatCareer(startYear?: number, endYear?: number): string | null {
	if (startYear === undefined) return null;
	return endYear === undefined
		? `From ${String(startYear)}`
		: `${String(startYear)}–${String(endYear)}`;
}

// The national teams' codes as the data writes them, and the name a child reads.
const COUNTRY_NAMES: Readonly<Record<string, string>> = {
	ARG: 'Argentina',
	BEL: 'Belgium',
	BRA: 'Brazil',
	CIV: 'Ivory Coast',
	CRO: 'Croatia',
	DEN: 'Denmark',
	EGY: 'Egypt',
	ENG: 'England',
	ESP: 'Spain',
	FRA: 'France',
	GER: 'Germany',
	HUN: 'Hungary',
	ITA: 'Italy',
	KOR: 'South Korea',
	MAR: 'Morocco',
	NED: 'Netherlands',
	NGA: 'Nigeria',
	NOR: 'Norway',
	POL: 'Poland',
	POR: 'Portugal',
	SCO: 'Scotland',
	SWE: 'Sweden',
	URU: 'Uruguay',
	USA: 'United States',
	WAL: 'Wales'
};

/** The country's name for a national team code, or the code itself when it isn't listed. */
export function countryName(code: string): string {
	return COUNTRY_NAMES[code] ?? code;
}

/** A licence code as people write it: CC-BY-SA-4.0 becomes CC BY-SA 4.0. */
export function formatLicense(code: string): string {
	const match = /^CC-(.+)-(\d+(?:\.\d+)?)$/.exec(code);
	return match === null ? code : `CC ${match[1] ?? ''} ${match[2] ?? ''}`;
}

/** The card's number as printed, such as #017. */
export function formatCardNumber(cardNumber: number): string {
	return `#${String(cardNumber).padStart(3, '0')}`;
}

/** The goal counts in a player's record, each only when it's a whole number. */
export function goalCountsFrom(body: unknown): {
	readonly clubGoalCount?: number;
	readonly nationalTeamGoalCount?: number;
} {
	const valueOf = (field: unknown): number | undefined => {
		if (typeof field !== 'object' || field === null || !('value' in field)) return undefined;
		const { value } = field;
		return typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : undefined;
	};
	if (typeof body !== 'object' || body === null) return {};
	const record = body as Readonly<Record<string, unknown>>;
	const club = valueOf(record.clubGoalCount);
	const country = valueOf(record.nationalTeamGoalCount);
	return {
		...(club !== undefined && { clubGoalCount: club }),
		...(country !== undefined && { nationalTeamGoalCount: country })
	};
}

/** The back for a card: its ratings and photo credit, who it is from its front, and its record. */
export function backFor(
	front: CardFrontProps,
	ratings: CardRatings,
	photoCredit: CardBackProps['photoCredit'],
	cardId: string
): CardBackProps {
	return {
		ratings,
		photoCredit,
		about: {
			displayName: front.displayName,
			positionName: POSITIONS[front.position].name,
			clubName: front.clubName,
			nationalTeamCode: front.nationalTeamCode,
			cardNumber: front.shirtNumber,
			tierName: TIER_NAMES[front.tier],
			overall: front.overall
		},
		detailUri: `/api/v1/players/${encodeURIComponent(cardId)}.json`
	};
}
