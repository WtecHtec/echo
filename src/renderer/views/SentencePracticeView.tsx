import { FormEvent, useMemo, useRef, useState } from 'react';
import {
  ArticleData,
  ArticleProgress,
  PracticeSession,
  SentenceAttempt,
} from '../../shared/types';
import { compareSentence, isSentenceCorrect } from '../../shared/learning';
import Icon from '../components/Icon';

interface Props {
  article: ArticleData;
  onExit: () => void;
  onSave: (progress: ArticleProgress) => Promise<void>;
  onSpeak: (text: string) => void;
}

const makeSession = (
  startedAt: number,
  attempts: Record<string, SentenceAttempt>,
): PracticeSession => {
  const values = Object.values(attempts);
  return {
    id: `sentence-${Date.now()}`,
    kind: 'sentence',
    startedAt: new Date(startedAt).toISOString(),
    completedAt: new Date().toISOString(),
    correct: values.filter((item) => item.correct).length,
    total: values.length,
    hints: values.filter((item) => item.usedHint).length,
    durationMs: Date.now() - startedAt,
  };
};

export default function SentencePracticeView({
  article,
  onExit,
  onSave,
  onSpeak,
}: Props) {
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [showTranslation, setShowTranslation] = useState(false);
  const [showIpa, setShowIpa] = useState(true);
  const [usedHint, setUsedHint] = useState(false);
  const [attempts, setAttempts] = useState<Record<string, SentenceAttempt>>({});
  const [summary, setSummary] = useState<PracticeSession | null>(null);
  const startedAt = useRef(Date.now());
  const sentenceStartedAt = useRef(Date.now());
  const sentence = article.sentences[index];
  const diff = useMemo(
    () => (submitted ? compareSentence(sentence.text, answer) : []),
    [answer, sentence.text, submitted],
  );
  const keyedDiff = useMemo(() => {
    const counts = new Map<string, number>();
    return diff.map((token) => {
      const signature = `${token.status}-${token.value}-${token.expected ?? ''}`;
      const occurrence = (counts.get(signature) ?? 0) + 1;
      counts.set(signature, occurrence);
      return { ...token, key: `${signature}-${occurrence}` };
    });
  }, [diff]);

  const resetSentence = (nextIndex: number) => {
    setIndex(nextIndex);
    setAnswer('');
    setSubmitted(false);
    setShowTranslation(false);
    setShowIpa(true);
    setUsedHint(false);
    sentenceStartedAt.current = Date.now();
  };

  const completeSession = async (
    currentAttempts: Record<string, SentenceAttempt>,
  ) => {
    const session = makeSession(startedAt.current, currentAttempts);
    await onSave({
      ...article.progress,
      sessions: [...article.progress.sessions, session],
    });
    setSummary(session);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!answer.trim() || submitted) return;
    const attempt: SentenceAttempt = {
      sentenceId: sentence.id,
      answer: answer.trim(),
      correct: isSentenceCorrect(sentence.text, answer),
      usedHint,
      durationMs: Date.now() - sentenceStartedAt.current,
      attemptedAt: new Date().toISOString(),
    };
    const nextAttempts = { ...attempts, [sentence.id]: attempt };
    setAttempts(nextAttempts);
    setSubmitted(true);
    await onSave({
      ...article.progress,
      sentenceAttempts: {
        ...article.progress.sentenceAttempts,
        [sentence.id]: [
          ...(article.progress.sentenceAttempts[sentence.id] ?? []),
          attempt,
        ],
      },
    });
  };

  const next = async () => {
    if (index < article.sentences.length - 1) {
      resetSentence(index + 1);
      return;
    }
    await completeSession(attempts);
  };

  const goTo = (nextIndex: number) => {
    if (nextIndex >= 0 && nextIndex < article.sentences.length) {
      resetSentence(nextIndex);
    }
  };

  const revealHint = (kind: 'translation' | 'audio') => {
    setUsedHint(true);
    if (kind === 'translation') setShowTranslation(true);
    else onSpeak(sentence.text);
  };

  if (summary) {
    const accuracy = summary.total
      ? Math.round((summary.correct / summary.total) * 100)
      : 0;
    return (
      <main className="practice-page summary-page">
        <section className="summary-panel">
          <div className="summary-mark">
            <Icon name="check" />
          </div>
          <span className="section-label">本次练习完成</span>
          <h1>{accuracy}%</h1>
          <p>你已经完成《{article.meta.title}》的本轮整句默写。</p>
          <div className="summary-stats">
            <div>
              <strong>
                {summary.correct}/{summary.total}
              </strong>
              <span>正确句子</span>
            </div>
            <div>
              <strong>{summary.hints}</strong>
              <span>使用提示</span>
            </div>
            <div>
              <strong>
                {Math.max(1, Math.round(summary.durationMs / 60000))} 分
              </strong>
              <span>练习耗时</span>
            </div>
          </div>
          <button className="button primary" onClick={onExit} type="button">
            返回文章
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="practice-page">
      <header className="practice-header">
        <button className="back-link" onClick={onExit} type="button">
          <Icon name="close" />
          退出练习
        </button>
        <div className="practice-title">
          <strong>文章默写</strong>
          <span>{article.meta.title}</span>
        </div>
        <div className="practice-count">
          {index + 1} <span>/ {article.sentences.length}</span>
        </div>
      </header>
      <div className="practice-progress">
        <i
          style={{
            width: `${((index + (submitted ? 1 : 0)) / article.sentences.length) * 100}%`,
          }}
        />
      </div>
      <section className="dictation-stage">
        <div className="dictation-card">
          <span className="sentence-number large">
            {String(index + 1).padStart(2, '0')}
          </span>
          <p className={`dictation-ipa ${showIpa ? '' : 'is-hidden'}`}>
            {showIpa ? sentence.ipa : '音标已隐藏'}
          </p>
          {showTranslation ? (
            <p className="dictation-translation">{sentence.translation}</p>
          ) : null}
          <form onSubmit={submit}>
            <textarea
              aria-label="默写英文句子"
              className="copybook-field"
              disabled={submitted}
              onChange={(event) => setAnswer(event.target.value)}
              placeholder="听清楚，然后写下完整的英文句子…"
              value={answer}
            />
            {!submitted ? (
              <button
                className="button primary submit-answer"
                disabled={!answer.trim()}
                type="submit"
              >
                检查答案
              </button>
            ) : null}
          </form>

          {submitted ? (
            <div className="answer-result">
              <div
                className={`result-heading ${
                  isSentenceCorrect(sentence.text, answer)
                    ? 'correct'
                    : 'incorrect'
                }`}
              >
                <Icon
                  name={
                    isSentenceCorrect(sentence.text, answer) ? 'check' : 'close'
                  }
                />
                <strong>
                  {isSentenceCorrect(sentence.text, answer)
                    ? '完全正确'
                    : '再看一下这些差异'}
                </strong>
              </div>
              <div className="diff-line">
                {keyedDiff.map((token) => (
                  <span
                    className={`diff-token ${token.status}`}
                    key={token.key}
                    title={
                      token.expected ? `应为：${token.expected}` : undefined
                    }
                  >
                    {token.status === 'missing'
                      ? `[${token.value}]`
                      : token.value}
                    {token.status === 'changed' ? (
                      <small>{token.expected}</small>
                    ) : null}
                  </span>
                ))}
              </div>
              <p className="correct-sentence">{sentence.text}</p>
              <button className="button primary" onClick={next} type="button">
                {index === article.sentences.length - 1 ? '查看总结' : '下一句'}
                <Icon name="chevron-right" />
              </button>
            </div>
          ) : (
            <div className="hint-actions">
              <button
                onClick={() => {
                  setShowIpa((visible) => !visible);
                  setUsedHint(true);
                }}
                type="button"
              >
                <Icon name="eye" />
                {showIpa ? '隐藏音标' : '查看音标'}
              </button>
              <button onClick={() => revealHint('translation')} type="button">
                <Icon name="book" />
                查看翻译
              </button>
              <button onClick={() => revealHint('audio')} type="button">
                <Icon name="sound" />
                朗读句子
              </button>
            </div>
          )}
        </div>
      </section>
      <footer className="practice-footer">
        <button
          disabled={index === 0}
          onClick={() => goTo(index - 1)}
          type="button"
        >
          <Icon name="chevron-left" />
          上一句
        </button>
        <span>{Object.keys(attempts).length} 句已作答</span>
        <button
          disabled={index === article.sentences.length - 1}
          onClick={() => goTo(index + 1)}
          type="button"
        >
          下一句
          <Icon name="chevron-right" />
        </button>
      </footer>
    </main>
  );
}
