import {
  compareSentence,
  createSrsState,
  isSentenceCorrect,
  reviewSrs,
  srsPriority,
} from '../shared/learning';

describe('sentence comparison', () => {
  it('ignores case and punctuation while preserving word accuracy', () => {
    expect(
      isSentenceCorrect(
        'Deep work is difficult, but valuable.',
        'deep work is difficult but valuable',
      ),
    ).toBe(true);
  });

  it('locates changed, missing and extra words', () => {
    const changed = compareSentence(
      'Attention is a valuable resource',
      'Attention was a valuable resource',
    );
    const extra = compareSentence(
      'Attention is valuable',
      'Attention is very valuable',
    );
    const missing = compareSentence(
      'Attention is a valuable resource',
      'Attention is resource',
    );
    expect(changed.some((token) => token.status === 'changed')).toBe(true);
    expect(extra.some((token) => token.status === 'extra')).toBe(true);
    expect(missing.some((token) => token.status === 'missing')).toBe(true);
  });
});

describe('SM-2 review state', () => {
  const now = new Date('2026-07-23T00:00:00.000Z');

  it('increases review intervals after successful reviews', () => {
    const initial = createSrsState(now);
    const first = reviewSrs(initial, true, now);
    const second = reviewSrs(first, true, now);
    const third = reviewSrs(second, true, now);

    expect(first.interval).toBe(1);
    expect(second.interval).toBe(6);
    expect(third.interval).toBeGreaterThan(second.interval);
  });

  it('prioritizes repeatedly missed words over learned words', () => {
    const initial = createSrsState(now);
    const missed = reviewSrs(reviewSrs(initial, false, now), false, now);
    const learned = reviewSrs(reviewSrs(initial, true, now), true, now);

    expect(srsPriority(missed, now)).toBeGreaterThan(srsPriority(learned, now));
  });

  it('resets repetitions after an incorrect answer', () => {
    const learned = reviewSrs(
      reviewSrs(createSrsState(now), true, now),
      true,
      now,
    );
    expect(reviewSrs(learned, false, now).repetitions).toBe(0);
  });
});
