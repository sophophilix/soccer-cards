import type { CardRatings } from '../cards/card-back.ts';

type Fields = Readonly<Record<string, unknown>>;

/** What a card's faces show beyond the game's card. A field that failed its check is absent. */
export interface CardFace {
	readonly displayName: string;
	readonly nationalTeamCode?: string;
	readonly clubName?: string;
	// On the site's own origin, with the credit its licence needs.
	readonly photo?: {
		readonly src: string;
		readonly widthPx: number;
		readonly heightPx: number;
		readonly credit: { readonly author: string; readonly licenseCode: string };
	};
	readonly ratings?: CardRatings;
}

// The API's root on the site. A photo's uri is a path inside it (ADR 0005).
const API_ROOT = '/api/v1/';
const OUTFIELD = ['pace', 'shooting', 'passing', 'dribbling', 'defending', 'physical'] as const;
const GOALKEEPER = ['diving', 'handling', 'kicking', 'reflexes', 'speed', 'positioning'] as const;
const MIN_RATING = 1;
const MAX_RATING = 99;
const MAX_AUTHOR_LENGTH = 200;
const MAX_CLUB_LENGTH = 60;
const MAX_URI_LENGTH = 2048;
// The schema's patterns. A photo is a WebP inside the API, and its source is a Commons file page.
const NATIONAL_TEAM_CODE = /^[A-Z]{3}$/;
const CLUB_NAME = /^clubs\/([a-z][a-z0-9-]{0,62})$/;
const PHOTO_URI = /^photos\/[A-Za-z0-9_-]+\.webp$/;
const SOURCE_URI = /^https:\/\/commons\.wikimedia\.org\/wiki\/File:[A-Za-z0-9._~:@!$&'()*+,;=%-]+$/;
// Plain text: no markup, no control or bidi-override characters (\p{Cc} is \u0000-\u001f and \u007f-\u009f).
const PLAIN_TEXT =
	/^[^\s<>\p{Cc}\u202a-\u202e\u2066-\u2069][^<>\p{Cc}\u202a-\u202e\u2066-\u2069]*$/u;
const LICENSE_CODE =
	/^(CC0-1\.0|CC-PDM-1\.0|CC-BY-(1\.0|2\.0|2\.5(-AU)?|3\.0(-(AT|AU|DE|IGO|NL|US))?|4\.0)|CC-BY-SA-(1\.0|2\.0(-UK)?|2\.1-JP|2\.5|3\.0(-(AT|DE|IGO))?|4\.0))$/;

const isFields = (value: unknown): value is Fields =>
	typeof value === 'object' && value !== null && !Array.isArray(value);
const isWholeAtLeastOne = (value: unknown): value is number =>
	Number.isInteger(value) && Number(value) >= 1;
const matches = (value: unknown, pattern: RegExp, maxLength = MAX_URI_LENGTH): value is string =>
	typeof value === 'string' && value.length <= maxLength && pattern.test(value);
const isRating = (value: unknown): boolean =>
	Number.isInteger(value) && Number(value) >= MIN_RATING && Number(value) <= MAX_RATING;

function ratingsOf(summary: Fields): CardRatings | undefined {
	const isKeeper = summary.position === 'GOALKEEPER';
	const group = isKeeper ? summary.goalkeeperRatings : summary.outfieldRatings;
	const keys = isKeeper ? GOALKEEPER : OUTFIELD;
	if (!isFields(group) || !keys.every((key) => isRating(group[key]))) return undefined;
	const values = Object.fromEntries(keys.map((key) => [key, group[key]]));
	// Every key was checked as a rating just above.
	return { kind: isKeeper ? 'goalkeeper' : 'outfield', ...values } as CardRatings;
}

function photoOf(photo: unknown): CardFace['photo'] {
	if (!isFields(photo) || !isFields(photo.attribution)) return undefined;
	const { uri, widthPx, heightPx, mimeType } = photo;
	const { author, licenseCode, sourceUri } = photo.attribution;
	const isImage = matches(uri, PHOTO_URI) && mimeType === 'image/webp';
	if (!isImage || !isWholeAtLeastOne(widthPx) || !isWholeAtLeastOne(heightPx)) return undefined;
	if (!matches(licenseCode, LICENSE_CODE) || !matches(sourceUri, SOURCE_URI)) return undefined;
	if (!matches(author, PLAIN_TEXT, MAX_AUTHOR_LENGTH)) return undefined;
	return { src: `${API_ROOT}${uri}`, widthPx, heightPx, credit: { author, licenseCode } };
}

const slugOf = (club: unknown): string | undefined =>
	typeof club === 'string' ? CLUB_NAME.exec(club)?.[1] : undefined;

/** Maps each club's slug to the name a card shows, from the body of clubs.json. Bad clubs are left out. */
export function clubNamesFromList(body: unknown): ReadonlyMap<string, string> {
	const names = new Map<string, string>();
	const clubs: unknown = isFields(body) ? body.clubs : undefined;
	if (!Array.isArray(clubs)) return names;
	for (const club of clubs as readonly unknown[]) {
		const slug = isFields(club) ? slugOf(club.name) : undefined;
		const name = isFields(club) ? club.displayName : undefined;
		if (slug !== undefined && matches(name, PLAIN_TEXT, MAX_CLUB_LENGTH)) names.set(slug, name);
	}
	return names;
}

/** Reads the face fields of one summary from players.json, or `undefined` when it has no name to show. */
export function cardFaceFromSummary(
	summary: unknown,
	clubNames: ReadonlyMap<string, string>
): CardFace | undefined {
	if (!isFields(summary)) return undefined;
	const { displayName, nationalTeamCode } = summary;
	if (typeof displayName !== 'string' || displayName === '') return undefined;
	const slug = slugOf(summary.club);
	const clubName = slug === undefined ? undefined : clubNames.get(slug);
	const photo = photoOf(summary.photo);
	const ratings = ratingsOf(summary);
	return {
		displayName,
		...(matches(nationalTeamCode, NATIONAL_TEAM_CODE) && { nationalTeamCode }),
		...(clubName !== undefined && { clubName }),
		...(photo !== undefined && { photo }),
		...(ratings !== undefined && { ratings })
	};
}
