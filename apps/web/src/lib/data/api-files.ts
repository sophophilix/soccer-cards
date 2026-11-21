/** What one entry of the API folder is, as `lstat` sees it, so a link is never followed. */
export type ApiEntryKind = 'file' | 'folder' | 'link' | 'other';

/** The part of `lstat`'s answer that names an entry's kind. */
export interface EntryStats {
	isFile(): boolean;
	isDirectory(): boolean;
	isSymbolicLink(): boolean;
}

// JSON and photos only. An HTML or script file would run on the site's own origin.
const SERVED_EXTENSIONS = ['.json', '.webp'] as const;

/** Names the kind of an entry from what `lstat` says about it. */
export function apiEntryKind(stats: EntryStats): ApiEntryKind {
	if (stats.isSymbolicLink()) return 'link';
	if (stats.isDirectory()) return 'folder';
	return stats.isFile() ? 'file' : 'other';
}

/** Whether the build copies an entry of the API folder: a folder, or a `.json` or `.webp` file, never hidden. */
export function isServedApiEntry(name: string, kind: ApiEntryKind): boolean {
	if (name.startsWith('.')) return false;
	switch (kind) {
		case 'folder':
			return true;
		case 'file':
			return SERVED_EXTENSIONS.some((extension) => name.endsWith(extension));
		case 'link':
		case 'other':
			return false;
		default:
			return kind satisfies never;
	}
}
