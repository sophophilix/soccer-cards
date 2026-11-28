/** The stable id of one card in the set. */
export type CardId = string & { readonly __brand: 'CardId' };

/** The tiers of a card, from least to most rare. */
export const TIERS = ['base', 'rare', 'legend', 'icon'] as const;

/** How rare a card is. */
export type Tier = (typeof TIERS)[number];

/** The positions a card can play, in the order a line-up shows them. */
export const POSITIONS = ['FW', 'MF', 'DF', 'GK'] as const;

/** Where a card plays. */
export type Position = (typeof POSITIONS)[number];

const MIN_OVERALL = 1;
const MAX_OVERALL = 99;

/** The part of a card the game rules need. */
export interface Card {
	readonly id: CardId;
	readonly tier: Tier;
	readonly position: Position;
	/** A whole number from 1 to 99. */
	readonly overall: number;
	readonly attack: number;
	readonly defence: number;
	readonly control: number;
	/** The national team's three-letter code, such as `AUS`. A card without one never counts towards a pack limit. */
	readonly nationalTeam?: string;
}

/** Turns a checked, non-empty string into a card id. */
export function toCardId(value: string): CardId {
	if (value.trim() === '') {
		throw new RangeError('a card id must not be empty');
	}
	// The one place a plain string becomes a card id, straight after the check.
	return value as CardId;
}

/** A card set that `checkCardSet` accepted: not empty, every id once, every field known. */
export type CheckedCardSet = readonly Card[] & { readonly __brand: 'CheckedCardSet' };

type CardField = 'tier' | 'position' | 'overall' | 'nationalTeam';

const NATIONAL_TEAM_CODE = /^[A-Z]{3}$/u;

/** The checked card set, or the reason the cards were refused. */
export type CardSetResult =
	| { readonly ok: true; readonly value: CheckedCardSet }
	| { readonly ok: false; readonly reason: 'empty-card-set' }
	| { readonly ok: false; readonly reason: 'repeated-card-id'; readonly cardId: CardId }
	| {
			readonly ok: false;
			readonly reason: 'invalid-card-field';
			readonly cardId: CardId;
			readonly field: CardField;
	  };

function findInvalidField(card: Card): CardField | undefined {
	// Widened first, because a card read from a data file can hold any value.
	const tiers: readonly string[] = TIERS;
	const positions: readonly string[] = POSITIONS;
	if (!tiers.includes(card.tier)) {
		return 'tier';
	}
	if (!positions.includes(card.position)) {
		return 'position';
	}
	const isWholeNumber = Number.isInteger(card.overall);
	if (!isWholeNumber || card.overall < MIN_OVERALL || card.overall > MAX_OVERALL) {
		return 'overall';
	}
	// Widened first, as a data file can hold a value of any type.
	const team: unknown = card.nationalTeam;
	if (team !== undefined && (typeof team !== 'string' || !NATIONAL_TEAM_CODE.test(team))) {
		return 'nationalTeam';
	}
	return undefined;
}

/** Checks that a card set is not empty, lists every id once and holds only known values. */
export function checkCardSet(cards: readonly Card[]): CardSetResult {
	if (cards.length === 0) {
		return { ok: false, reason: 'empty-card-set' };
	}
	// A set, so a card id can never be mistaken for a built-in property of an object.
	const seen = new Set<CardId>();
	for (const card of cards) {
		const field = findInvalidField(card);
		if (field !== undefined) {
			return { ok: false, reason: 'invalid-card-field', cardId: card.id, field };
		}
		if (seen.has(card.id)) {
			return { ok: false, reason: 'repeated-card-id', cardId: card.id };
		}
		seen.add(card.id);
	}
	// The one place a list of cards becomes a checked card set, straight after the check.
	return { ok: true, value: cards as CheckedCardSet };
}
