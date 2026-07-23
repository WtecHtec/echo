import { FormEvent, useEffect, useMemo, useState } from 'react';
import { reviewSrs, srsPriority } from '../../shared/learning';
import { VocabularyEntry } from '../../shared/types';
import Icon from '../components/Icon';

interface Props {
  entries: VocabularyEntry[];
  articleId: string | undefined;
  onExit: () => void;
  onSave: (entries: VocabularyEntry[]) => Promise<void>;
  onSpeak: (word: string) => void;
}

type Scope = 'article' | 'global';

export default function WordPracticeView({
  entries,
  articleId,
  onExit,
  onSave,
  onSpeak,
}: Props) {
  const [scope, setScope] = useState<Scope>(articleId ? 'article' : 'global');
  const [answer, setAnswer] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [showIpa, setShowIpa] = useState(false);
  const [showMeaning, setShowMeaning] = useState(false);
  const [vocabulary, setVocabulary] = useState(entries);
  const [activeWord, setActiveWord] = useState('');
  const [correctCount, setCorrectCount] = useState(0);
  const [reviewedCount, setReviewedCount] = useState(0);

  const queue = useMemo(() => {
    const filtered = vocabulary.filter(
      (entry) =>
        !entry.srs.mastered &&
        (scope === 'global' || entry.articleIds.includes(articleId ?? '')),
    );
    return [...filtered].sort(
      (left, right) => srsPriority(right.srs) - srsPriority(left.srs),
    );
  }, [articleId, scope, vocabulary]);

  const current =
    vocabulary.find(
      (entry) =>
        activeWord &&
        entry.word.toLocaleLowerCase() === activeWord.toLocaleLowerCase(),
    ) ??
    queue[0] ??
    null;

  useEffect(() => {
    if (current && !submitted && !activeWord) {
      setActiveWord(current.word);
      onSpeak(current.word);
    }
  }, [activeWord, current, onSpeak, submitted]);

  const reset = () => {
    setAnswer('');
    setSubmitted(false);
    setShowIpa(false);
    setShowMeaning(false);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!current || !answer.trim() || submitted) return;
    const correct =
      answer.trim().toLocaleLowerCase() === current.word.toLocaleLowerCase();
    const updated = vocabulary.map((entry) =>
      entry.word.toLocaleLowerCase() === current.word.toLocaleLowerCase()
        ? { ...entry, srs: reviewSrs(entry.srs, correct) }
        : entry,
    );
    setVocabulary(updated);
    setSubmitted(true);
    setReviewedCount((count) => count + 1);
    if (correct) setCorrectCount((count) => count + 1);
    await onSave(updated);
  };

  const next = () => {
    setActiveWord('');
    reset();
  };

  const markMastered = async () => {
    if (!current) return;
    const updated = vocabulary.map((entry) =>
      entry.word.toLocaleLowerCase() === current.word.toLocaleLowerCase()
        ? { ...entry, srs: { ...entry.srs, mastered: true } }
        : entry,
    );
    setVocabulary(updated);
    await onSave(updated);
    next();
  };

  return (
    <main className="practice-page word-practice-page">
      <header className="practice-header">
        <button className="back-link" onClick={onExit} type="button">
          <Icon name="close" />
          退出练习
        </button>
        <div className="scope-switch" aria-label="练习范围">
          {articleId ? (
            <button
              className={scope === 'article' ? 'active' : ''}
              onClick={() => {
                setScope('article');
                setActiveWord('');
                reset();
              }}
              type="button"
            >
              当前文章
            </button>
          ) : null}
          <button
            className={scope === 'global' ? 'active' : ''}
            onClick={() => {
              setScope('global');
              setActiveWord('');
              reset();
            }}
            type="button"
          >
            全局生词本
          </button>
        </div>
        <div className="practice-count">
          {reviewedCount} <span>已复习</span>
        </div>
      </header>

      <section className="word-stage">
        {current ? (
          <div className="word-practice-card">
            <span className="section-label">听音拼写</span>
            <button
              aria-label="重新朗读单词"
              className="listen-orbit"
              onClick={() => onSpeak(current.word)}
              type="button"
            >
              <Icon name="sound" />
              <i />
              <i />
            </button>
            <p className="listen-instruction">
              点击声音可以重播，然后写下你听到的单词
            </p>
            {showIpa ? <p className="word-hint">{current.ipa}</p> : null}
            {showMeaning ? (
              <p className="word-hint">{current.meaning}</p>
            ) : null}
            <form onSubmit={submit}>
              <input
                aria-label="默写单词"
                className="copybook-field"
                disabled={submitted}
                onChange={(event) => setAnswer(event.target.value)}
                placeholder="type the word"
                value={answer}
              />
              {!submitted ? (
                <button
                  className="button primary"
                  disabled={!answer.trim()}
                  type="submit"
                >
                  检查拼写
                </button>
              ) : null}
            </form>
            {submitted ? (
              <div
                className={`word-feedback ${
                  answer.trim().toLocaleLowerCase() ===
                  current.word.toLocaleLowerCase()
                    ? 'correct'
                    : 'incorrect'
                }`}
              >
                <Icon
                  name={
                    answer.trim().toLocaleLowerCase() ===
                    current.word.toLocaleLowerCase()
                      ? 'check'
                      : 'close'
                  }
                />
                <div>
                  <span>
                    {answer.trim().toLocaleLowerCase() ===
                    current.word.toLocaleLowerCase()
                      ? '拼写正确'
                      : '正确拼写是'}
                  </span>
                  <strong>{current.word}</strong>
                  <p>
                    {current.ipa} · {current.meaning}
                  </p>
                </div>
                <button className="button primary" onClick={next} type="button">
                  下一个
                  <Icon name="chevron-right" />
                </button>
              </div>
            ) : (
              <div className="hint-actions centered">
                <button onClick={() => setShowIpa(true)} type="button">
                  <Icon name="eye" />
                  查看音标
                </button>
                <button onClick={() => setShowMeaning(true)} type="button">
                  <Icon name="book" />
                  查看释义
                </button>
                <button onClick={next} type="button">
                  跳过
                  <Icon name="chevron-right" />
                </button>
              </div>
            )}
            <button
              className="mastered-button"
              onClick={markMastered}
              type="button"
            >
              <Icon name="check" />
              标记为已掌握
            </button>
          </div>
        ) : (
          <div className="empty-practice">
            <div className="summary-mark">
              <Icon name="check" />
            </div>
            <h1>这一组已经复习完了</h1>
            <p>没有待复习的单词。已掌握单词默认不会进入常规轮次。</p>
            <button className="button primary" onClick={onExit} type="button">
              返回
            </button>
          </div>
        )}
      </section>
      <footer className="word-session-footer">
        <span>本轮正确 {correctCount}</span>
        <span>待复习 {queue.length}</span>
        <span>SM-2 会优先安排容易出错的词</span>
      </footer>
    </main>
  );
}
