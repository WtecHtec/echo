import { SrsState } from './types';

const WORD_PATTERN = /[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*/gu;

export interface DiffToken {
  value: string;
  status: 'correct' | 'missing' | 'extra' | 'changed';
  expected?: string;
}

const normalizeToken = (value: string) =>
  value.toLocaleLowerCase().replace('’', "'");

export const tokenize = (value: string): string[] =>
  value.match(WORD_PATTERN) ?? [];

export const compareSentence = (
  expectedText: string,
  answerText: string,
): DiffToken[] => {
  const expected = tokenize(expectedText);
  const answer = tokenize(answerText);
  const rows = expected.length + 1;
  const columns = answer.length + 1;
  const distance = Array.from({ length: rows }, () =>
    Array<number>(columns).fill(0),
  );

  for (let row = 0; row < rows; row += 1) distance[row][0] = row;
  for (let column = 0; column < columns; column += 1)
    distance[0][column] = column;

  for (let row = 1; row < rows; row += 1) {
    for (let column = 1; column < columns; column += 1) {
      const matches =
        normalizeToken(expected[row - 1]) ===
        normalizeToken(answer[column - 1]);
      distance[row][column] = Math.min(
        distance[row - 1][column] + 1,
        distance[row][column - 1] + 1,
        distance[row - 1][column - 1] + (matches ? 0 : 1),
      );
    }
  }

  const result: DiffToken[] = [];
  let row = expected.length;
  let column = answer.length;
  while (row > 0 || column > 0) {
    const isMatch =
      row > 0 &&
      column > 0 &&
      normalizeToken(expected[row - 1]) === normalizeToken(answer[column - 1]);
    if (
      row > 0 &&
      column > 0 &&
      distance[row][column] ===
        distance[row - 1][column - 1] + (isMatch ? 0 : 1)
    ) {
      result.unshift({
        value: answer[column - 1],
        status: isMatch ? 'correct' : 'changed',
        expected: isMatch ? undefined : expected[row - 1],
      });
      row -= 1;
      column -= 1;
    } else if (
      column > 0 &&
      distance[row][column] === distance[row][column - 1] + 1
    ) {
      result.unshift({ value: answer[column - 1], status: 'extra' });
      column -= 1;
    } else {
      result.unshift({ value: expected[row - 1], status: 'missing' });
      row -= 1;
    }
  }
  return result;
};

export const isSentenceCorrect = (expected: string, answer: string) => {
  const expectedTokens = tokenize(expected).map(normalizeToken);
  const answerTokens = tokenize(answer).map(normalizeToken);
  return (
    expectedTokens.length === answerTokens.length &&
    expectedTokens.every((token, index) => token === answerTokens[index])
  );
};

export const createSrsState = (now = new Date()): SrsState => ({
  repetitions: 0,
  interval: 0,
  easeFactor: 2.5,
  dueAt: now.toISOString(),
  correctCount: 0,
  incorrectCount: 0,
  mastered: false,
});

export const reviewSrs = (
  current: SrsState,
  correct: boolean,
  now = new Date(),
): SrsState => {
  const quality = correct ? 5 : 2;
  const repetitions = correct ? current.repetitions + 1 : 0;
  let interval = 1;
  if (correct && repetitions === 2) interval = 6;
  if (correct && repetitions > 2) {
    interval = Math.max(1, Math.round(current.interval * current.easeFactor));
  }

  const easeFactor = Math.max(
    1.3,
    current.easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)),
  );
  const dueAt = new Date(now);
  dueAt.setDate(dueAt.getDate() + interval);

  return {
    ...current,
    repetitions,
    interval,
    easeFactor,
    dueAt: dueAt.toISOString(),
    lastReviewedAt: now.toISOString(),
    correctCount: current.correctCount + (correct ? 1 : 0),
    incorrectCount: current.incorrectCount + (correct ? 0 : 1),
  };
};

export const srsPriority = (state: SrsState, now = new Date()): number => {
  if (state.mastered) return Number.NEGATIVE_INFINITY;
  const overdueDays =
    (now.getTime() - new Date(state.dueAt).getTime()) / 86_400_000;
  const errorWeight = state.incorrectCount * 2 - state.correctCount * 0.25;
  return overdueDays + errorWeight + (state.repetitions === 0 ? 3 : 0);
};
