import { CSSProperties } from 'react';
import { ArticleData } from '../../shared/types';
import Icon from '../components/Icon';

interface Props {
  article: ArticleData;
  fontScale: number;
  speechRate: number;
  speakingText: string;
  onBack: () => void;
  onPracticeSentences: () => void;
  onPracticeWords: () => void;
  onSpeak: (text: string) => void;
  onStop: () => void;
  onRateChange: (rate: number) => void;
}

export default function StudyView({
  article,
  fontScale,
  speechRate,
  speakingText,
  onBack,
  onPracticeSentences,
  onPracticeWords,
  onSpeak,
  onStop,
  onRateChange,
}: Props) {
  const play = (text: string) => {
    if (speakingText === text) onStop();
    else onSpeak(text);
  };

  return (
    <main
      className="study-page"
      style={{ '--reader-scale': fontScale } as CSSProperties}
    >
      <header className="study-header">
        <div className="study-title">
          <button
            aria-label="返回文章列表"
            className="icon-button"
            onClick={onBack}
            type="button"
          >
            <Icon name="chevron-left" />
          </button>
          <div>
            <h1>{article.meta.title}</h1>
            <span>
              {article.meta.sentenceCount} 句 · {article.meta.wordCount}{' '}
              个重点词
            </span>
          </div>
        </div>
        <div className="study-actions">
          <label className="rate-control" htmlFor="speech-rate">
            <Icon name="sound" />
            <span>语速</span>
            <select
              aria-label="朗读语速"
              id="speech-rate"
              onChange={(event) => onRateChange(Number(event.target.value))}
              value={speechRate}
            >
              {[0.5, 0.75, 1, 1.25, 1.5].map((rate) => (
                <option key={rate} value={rate}>
                  {rate}×
                </option>
              ))}
            </select>
          </label>
          <button
            className="button secondary"
            onClick={onPracticeWords}
            type="button"
          >
            单词默写
          </button>
          <button
            className="button primary"
            onClick={onPracticeSentences}
            type="button"
          >
            文章默写
          </button>
        </div>
      </header>

      <div className="study-layout">
        <section className="reading-canvas">
          <div className="reading-intro">
            <span className="section-label">精读全文</span>
            <p>点击任意一句朗读。先听声音，再观察语言如何组织意思。</p>
          </div>
          <div className="sentence-list">
            {article.sentences.map((sentence, index) => (
              <article
                className={`sentence-block ${
                  speakingText === sentence.text ? 'is-speaking' : ''
                }`}
                key={sentence.id}
              >
                <span className="sentence-number">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <div className="sentence-content">
                  <button
                    className="sentence-english"
                    onClick={() => play(sentence.text)}
                    type="button"
                  >
                    {sentence.text}
                  </button>
                  <p className="sentence-ipa">{sentence.ipa}</p>
                  <p className="sentence-translation">{sentence.translation}</p>
                </div>
                <button
                  aria-label={
                    speakingText === sentence.text ? '停止朗读' : '朗读该句'
                  }
                  className="play-button"
                  onClick={() => play(sentence.text)}
                  type="button"
                >
                  <Icon
                    name={speakingText === sentence.text ? 'pause' : 'play'}
                  />
                </button>
              </article>
            ))}
          </div>
        </section>

        <aside className="vocabulary-rail">
          <div className="rail-heading">
            <div>
              <span className="section-label">语境词汇</span>
              <h2>{article.words.length} 个重点词</h2>
            </div>
            <button
              aria-label="开始单词默写"
              className="icon-button"
              onClick={onPracticeWords}
              type="button"
            >
              <Icon name="chevron-right" />
            </button>
          </div>
          <div className="word-list">
            {article.words.map((word) => (
              <article className="word-row" key={word.id}>
                <button
                  className={`word-play ${
                    speakingText === word.word ? 'is-speaking' : ''
                  }`}
                  onClick={() => play(word.word)}
                  type="button"
                >
                  <Icon name={speakingText === word.word ? 'pause' : 'play'} />
                </button>
                <div>
                  <div className="word-title">
                    <strong>{word.word}</strong>
                    {word.level ? <span>{word.level}</span> : null}
                  </div>
                  <p>{word.ipa}</p>
                  <span>{word.meaning}</span>
                </div>
              </article>
            ))}
          </div>
        </aside>
      </div>
    </main>
  );
}
