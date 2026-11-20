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

/** Everything the back of a card shows. An absent fact shows no row. */
export interface CardBackProps {
	readonly ratings: CardRatings;
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
