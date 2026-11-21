import { describe, expect, it } from 'vitest';
import club from '../../../../../packages/schema/schemas/v1/examples/club.example.json';
import goalkeeper from '../../../../../packages/schema/schemas/v1/examples/player.goalkeeper.json';
import outfield from '../../../../../packages/schema/schemas/v1/examples/player.outfield.json';
import { cardFaceFromSummary, clubNamesFromList } from './card-face-from-summary.ts';

const CLUB_NAMES: ReadonlyMap<string, string> = new Map([['harbour-rovers', 'Harbour Rovers']]);
const OUTFIELD_RATINGS = outfield.outfieldRatings;

/** Builds an invented outfield player, with accents in the name. Pass only the fields the test cares about. */
function aSummary(overrides: Readonly<Record<string, unknown>> = {}): Record<string, unknown> {
	return { ...outfield, name: 'players/zoe', displayName: 'Zoë Ånström', ...overrides };
}

describe('cardFaceFromSummary', () => {
	it('reads every face field of the outfield example', () => {
		expect(cardFaceFromSummary(outfield, CLUB_NAMES)).toEqual({
			displayName: 'Tavi Brightwell',
			nationalTeamCode: 'ENG',
			clubName: 'Harbour Rovers',
			cardTitle: 'Speedster',
			cardNumber: 9,
			photo: {
				src: '/api/v1/photos/tavi-brightwell.webp',
				widthPx: 600,
				heightPx: 800,
				credit: { author: 'Ina Vented', licenseCode: 'CC-BY-SA-4.0' }
			},
			ratings: { kind: 'outfield', ...OUTFIELD_RATINGS }
		});
	});

	it('reads the goalkeeper ratings of a retired keeper with no club', () => {
		const face = cardFaceFromSummary(goalkeeper, CLUB_NAMES);

		expect(face?.ratings).toEqual({ kind: 'goalkeeper', ...goalkeeper.goalkeeperRatings });
		expect(face && 'clubName' in face).toBe(false);
	});

	it('leaves out the photo of a player with none, so the card shows the avatar', () => {
		const face = cardFaceFromSummary(aSummary({ photo: undefined }), CLUB_NAMES);

		expect(face && 'photo' in face).toBe(false);
		expect(face?.displayName).toBe('Zoë Ånström');
	});

	it.each(['clubs/nowhere', 'rovers', 7])('leaves out only the club name for %j', (id) => {
		const face = cardFaceFromSummary(aSummary({ club: id }), CLUB_NAMES);

		expect(face && 'clubName' in face).toBe(false);
		expect(face?.nationalTeamCode).toBe('ENG');
	});

	it.each(['eng', 'ENGL', ''])('leaves out only the nation for the code %j', (code) => {
		const face = cardFaceFromSummary(aSummary({ nationalTeamCode: code }), CLUB_NAMES);

		expect(face && 'nationalTeamCode' in face).toBe(false);
		expect(face?.clubName).toBe('Harbour Rovers');
	});

	it('keeps a card title at the schema maximum of 30 letters', () => {
		const cardTitle = 'É'.repeat(30);

		expect(cardFaceFromSummary(aSummary({ cardTitle }), CLUB_NAMES)?.cardTitle).toBe(cardTitle);
	});

	it.each(['', ' Speedster', '<b>Speedster</b>', 'Speed\u202ester', 'S'.repeat(31), 7])(
		'leaves out only the card title for %j',
		(cardTitle) => {
			const face = cardFaceFromSummary(aSummary({ cardTitle }), CLUB_NAMES);

			expect(face && 'cardTitle' in face).toBe(false);
			expect(face?.cardNumber).toBe(9);
		}
	);

	it.each([0, -9, 9.5, '9', undefined])('leaves out only the card number for %j', (cardNumber) => {
		const face = cardFaceFromSummary(aSummary({ cardNumber }), CLUB_NAMES);

		expect(face && 'cardNumber' in face).toBe(false);
		expect(face?.cardTitle).toBe('Speedster');
	});

	it.each([
		{ uri: 'https://elsewhere.example/tavi.webp' },
		{ uri: 'photos/tavi.jpg' },
		{ widthPx: 0 },
		{ mimeType: 'image/jpeg' },
		{ attribution: undefined },
		{ attribution: { ...outfield.photo.attribution, author: '<b>Ina</b>' } },
		{ attribution: { ...outfield.photo.attribution, author: 'I'.repeat(201) } },
		{ attribution: { ...outfield.photo.attribution, licenseCode: 'CC-BY-NC-4.0' } },
		{ attribution: { ...outfield.photo.attribution, sourceUri: 'https://elsewhere.example/a' } }
	])('leaves out a photo with %j, since it has no valid credit or source', (photoOverrides) => {
		const photo = { ...outfield.photo, ...photoOverrides };

		const face = cardFaceFromSummary(aSummary({ photo }), CLUB_NAMES);

		expect(face && 'photo' in face).toBe(false);
		expect(face?.clubName).toBe('Harbour Rovers');
	});

	it.each([
		['a missing rating group', { outfieldRatings: undefined }],
		['a rating out of range', { outfieldRatings: { ...OUTFIELD_RATINGS, pace: 100 } }],
		['a missing rating', { outfieldRatings: { ...OUTFIELD_RATINGS, physical: undefined } }],
		['the wrong group for the position', { position: 'GOALKEEPER' }]
	])('leaves out the ratings for %s', (_label, overrides) => {
		const face = cardFaceFromSummary(aSummary(overrides), CLUB_NAMES);

		expect(face && 'ratings' in face).toBe(false);
		expect(face?.photo).toBeDefined();
	});

	it.each([null, [], { displayName: '' }, { displayName: 7 }])('has no face for %j', (body) => {
		expect(cardFaceFromSummary(body, CLUB_NAMES)).toBeUndefined();
	});
});

describe('clubNamesFromList', () => {
	it('maps each club slug to its name, from the schema example', () => {
		expect(clubNamesFromList({ clubs: [club] }).get('harbour-rovers')).toBe('Harbour Rovers');
	});

	it.each([
		{ name: 'harbour-rovers' },
		{ name: 7 },
		{ name: 'players/harbour-rovers' },
		{ displayName: '' },
		{ displayName: '<i>Rovers</i>' },
		{ displayName: 'R'.repeat(61) }
	])('leaves out a club with %j and keeps the rest', (overrides) => {
		const invented = { name: 'clubs/lantern-athletic', displayName: 'Lantern Athletic' };

		const names = clubNamesFromList({ clubs: [invented, { ...club, ...overrides }] });

		expect([...names.keys()]).toEqual(['lantern-athletic']);
	});

	it.each([null, {}, { clubs: 'all' }, { clubs: [null, 7] }])('has no clubs for %j', (body) => {
		expect(clubNamesFromList(body).size).toBe(0);
	});
});
