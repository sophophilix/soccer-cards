import fc from 'fast-check';

// A fixed seed, so every run of a commit checks the same inputs (ADR 0011 D3).
// Vitest loads this file before each test file, so a new property test can't leave it out.
fc.configureGlobal({ seed: 20261116 });
