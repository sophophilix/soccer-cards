import type { CardId, Corner, Kick, Moment, SideName, Tactic } from '@soccer-cards/game';
import { TACTIC_WORDS } from './match-words.ts';

/** One line of commentary, and whether it tells of a goal. */
interface CommentaryLine {
	readonly text: string;
	readonly isGoal: boolean;
}

const WHO: Record<SideName, string> = { home: 'you', away: 'the AI' };

/** The line for one moment: who won the ball, who shot and how it ended. */
export function momentLine(moment: Moment, nameOf: (id: CardId) => string): CommentaryLine {
	const who = WHO[moment.side];
	const start = `${String(moment.minute)}' ${nameOf(moment.ballWinner)} wins the ball for ${who}. ${nameOf(moment.shooter)} shoots… `;
	switch (moment.outcome) {
		case 'goal':
			return { text: `${start}GOAL for ${who}!`, isGoal: true };
		case 'save':
			return { text: `${start}saved by ${nameOf(moment.keeper)}.`, isGoal: false };
		case 'wide':
			return { text: `${start}just wide.`, isGoal: false };
		default:
			return moment.outcome satisfies never;
	}
}

const CORNER_WORDS: Record<Corner, string> = { left: 'left', middle: 'the middle', right: 'right' };

/** The line for one penalty kick: where it went, where the keeper dived and how it ended. */
export function kickLine(kick: Kick): CommentaryLine {
	const shot = CORNER_WORDS[kick.shot];
	const dive = CORNER_WORDS[kick.dive];
	const start =
		kick.kicker === 'player'
			? `You shoot ${shot}, the keeper goes ${dive}: `
			: `They shoot ${shot}, your keeper goes ${dive}: `;
	switch (kick.outcome) {
		case 'goal':
			return { text: `${start}GOAL!`, isGoal: true };
		case 'save':
			return { text: `${start}SAVED!`, isGoal: false };
		case 'miss':
			return { text: `${start}over the bar!`, isGoal: false };
		default:
			return kick.outcome satisfies never;
	}
}

/** What the banner says when a side has the tactical edge, or nothing when neither has. */
export function edgeBanner(
	edge: SideName | 'none',
	home: Tactic,
	away: Tactic
): string | undefined {
	const name = (tactic: Tactic): string => TACTIC_WORDS[tactic].name;
	if (edge === 'home') {
		return `Good read! ${name(home)} beats ${name(away)}. Your whole team plays better.`;
	}
	if (edge === 'away') {
		return `The AI out-thought you. ${name(away)} beats ${name(home)}. Its whole team plays better.`;
	}
	return undefined;
}
