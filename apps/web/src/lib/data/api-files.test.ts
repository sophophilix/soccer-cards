import { describe, expect, it } from 'vitest';
import { apiEntryKind, isServedApiEntry } from './api-files.ts';

/** Builds what `lstat` says about one entry. */
function anEntry(kind: 'file' | 'folder' | 'link' | 'socket') {
	return {
		isFile: () => kind === 'file',
		isDirectory: () => kind === 'folder',
		isSymbolicLink: () => kind === 'link'
	};
}

describe('apiEntryKind', () => {
	it.each([
		['file', 'file'],
		['folder', 'folder'],
		['link', 'link'],
		['socket', 'other']
	] as const)('names a %s as %s', (entry, kind) => {
		expect(apiEntryKind(anEntry(entry))).toBe(kind);
	});
});

describe('isServedApiEntry', () => {
	it.each([
		['players.json', 'file'],
		['tavi-brightwell.webp', 'file'],
		['photos', 'folder']
	] as const)('serves %s, a %s', (name, kind) => {
		expect(isServedApiEntry(name, kind)).toBe(true);
	});

	it.each([
		['index.html', 'file'],
		['players.js', 'file'],
		['notes.txt', 'file'],
		['players.json.html', 'file'],
		['.hidden.json', 'file'],
		['.cache', 'folder'],
		['players.json', 'link'],
		['photos', 'link'],
		['players.json', 'other']
	] as const)('skips %s, a %s', (name, kind) => {
		expect(isServedApiEntry(name, kind)).toBe(false);
	});
});
