import {
  CSSProperties,
  MouseEvent as ReactMouseEvent,
  useCallback,
  useDeferredValue,
  useEffect,
  useRef,
  useState,
} from 'react';
import { ArticleData } from '../../shared/types';
import { isSingleEnglishWord, normalizeSelectedWord } from '../../shared/words';
import Icon from '../components/Icon';

interface SelectionPopup {
  word: string;
  left: number;
  top: number;
}

interface Props {
  article: ArticleData;
  fontScale: number;
  speechRate: number;
  speakingText: string;
  speakingWord: string;
  onAddWord: (word: string) => Promise<ArticleData>;
  onBack: () => void;
  onPracticeSentences: () => void;
  onPracticeWords: () => void;
  onSpeak: (text: string) => void;
  onSpeakWord: (word: string) => void;
  onStop: () => void;
  onRateChange: (rate: number) => void;
}

export default function StudyView({
  article,
  fontScale,
  speechRate,
  speakingText,
  speakingWord,
  onAddWord,
  onBack,
  onPracticeSentences,
  onPracticeWords,
  onSpeak,
  onSpeakWord,
  onStop,
  onRateChange,
}: Props) {
  const [wordQuery, setWordQuery] = useState('');
  const [selectionPopup, setSelectionPopup] = useState<SelectionPopup | null>(
    null,
  );
  const [addingWord, setAddingWord] = useState('');
  const selectionTimerRef = useRef<number | null>(null);
  const popupRef = useRef<HTMLDivElement | null>(null);
  const deferredWordQuery = useDeferredValue(wordQuery);
  const normalizedWordQuery = deferredWordQuery.trim().toLocaleLowerCase();
  const filteredWords = normalizedWordQuery
    ? article.words.filter((word) =>
        [
          word.word,
          word.ipa,
          word.meaning,
          word.level ?? '',
          word.syllables?.join(' ') ?? '',
        ].some((value) =>
          value.toLocaleLowerCase().includes(normalizedWordQuery),
        ),
      )
    : article.words;

  const playSentence = (text: string) => {
    if (speakingText === text) onStop();
    else onSpeak(text);
  };

  const closeSelectionPopup = useCallback(() => {
    setSelectionPopup(null);
    window.getSelection()?.removeAllRanges();
  }, []);

  const scheduleSelectionPopup = useCallback(
    (event: ReactMouseEvent<HTMLElement>) => {
      if (selectionTimerRef.current !== null) {
        window.clearTimeout(selectionTimerRef.current);
      }
      const sentenceElement = (event.target as Element).closest(
        '.sentence-english',
      );

      selectionTimerRef.current = window.setTimeout(() => {
        selectionTimerRef.current = null;
        const selection = window.getSelection();
        if (
          !sentenceElement ||
          !selection ||
          selection.isCollapsed ||
          selection.rangeCount === 0
        ) {
          setSelectionPopup(null);
          return;
        }

        const range = selection.getRangeAt(0);
        if (!sentenceElement.contains(range.commonAncestorContainer)) {
          setSelectionPopup(null);
          return;
        }

        const selectedText = selection.toString();
        if (!isSingleEnglishWord(selectedText)) {
          setSelectionPopup(null);
          return;
        }

        const rect = range.getBoundingClientRect();
        if (!rect.width || !rect.height) {
          setSelectionPopup(null);
          return;
        }

        setSelectionPopup({
          word: normalizeSelectedWord(selectedText),
          left: Math.min(
            window.innerWidth - 120,
            Math.max(120, rect.left + rect.width / 2),
          ),
          top: Math.max(72, rect.top - 10),
        });
      }, 180);
    },
    [],
  );

  useEffect(() => {
    const handleOutsidePointer = (event: PointerEvent) => {
      if (
        popupRef.current &&
        event.target instanceof Node &&
        popupRef.current.contains(event.target)
      ) {
        return;
      }
      setSelectionPopup(null);
    };
    const hidePopup = () => setSelectionPopup(null);

    document.addEventListener('pointerdown', handleOutsidePointer, true);
    window.addEventListener('resize', hidePopup);
    window.addEventListener('scroll', hidePopup, true);
    return () => {
      if (selectionTimerRef.current !== null) {
        window.clearTimeout(selectionTimerRef.current);
      }
      document.removeEventListener('pointerdown', handleOutsidePointer, true);
      window.removeEventListener('resize', hidePopup);
      window.removeEventListener('scroll', hidePopup, true);
    };
  }, []);

  const selectedWordIsSaved = selectionPopup
    ? article.words.some(
        (word) =>
          word.word.toLocaleLowerCase() ===
          selectionPopup.word.toLocaleLowerCase(),
      )
    : false;
  let addButtonLabel = '加入单词';
  if (selectedWordIsSaved) addButtonLabel = '已在词库';
  else if (addingWord) addButtonLabel = '正在加入';

  const addSelectedWord = async () => {
    if (!selectionPopup || addingWord) return;
    setAddingWord(selectionPopup.word);
    try {
      await onAddWord(selectionPopup.word);
      closeSelectionPopup();
    } finally {
      setAddingWord('');
    }
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
            <p>选择句中单词可朗读或加入词库；整句朗读请点击播放按钮。</p>
          </div>
          {/* Text selection is pointer-native; keyboard users can use the searchable vocabulary rail. */}
          {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
          <div className="sentence-list" onMouseUp={scheduleSelectionPopup}>
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
                  <p className="sentence-english">{sentence.text}</p>
                  <p className="sentence-ipa">{sentence.ipa}</p>
                  <p className="sentence-translation">{sentence.translation}</p>
                </div>
                <button
                  aria-label={
                    speakingText === sentence.text ? '停止朗读' : '朗读该句'
                  }
                  className="play-button"
                  onClick={() => playSentence(sentence.text)}
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
          <div className="rail-sticky">
            <div className="rail-heading">
              <div>
                <span className="section-label">语境词汇</span>
                <h2>
                  {normalizedWordQuery
                    ? `${filteredWords.length} / ${article.words.length}`
                    : article.words.length}{' '}
                  个重点词
                </h2>
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
            <label
              className="vocabulary-search"
              htmlFor="vocabulary-search-input"
            >
              <span className="sr-only">检索语境词汇</span>
              <Icon name="search" />
              <input
                aria-label="检索语境词汇"
                id="vocabulary-search-input"
                onChange={(event) => setWordQuery(event.target.value)}
                placeholder="检索单词、释义或音标"
                type="search"
                value={wordQuery}
              />
              {wordQuery ? (
                <button
                  aria-label="清除词汇检索"
                  className="vocabulary-search-clear"
                  onClick={() => setWordQuery('')}
                  type="button"
                >
                  <Icon name="close" />
                </button>
              ) : null}
            </label>
          </div>
          <div className="word-list">
            {filteredWords.length ? (
              filteredWords.map((word) => (
                <article className="word-row" key={word.id}>
                  <button
                    aria-label={
                      speakingWord === word.word
                        ? `停止朗读 ${word.word}`
                        : `朗读 ${word.word}`
                    }
                    className={`word-play ${
                      speakingWord === word.word ? 'is-speaking' : ''
                    }`}
                    onClick={() => onSpeakWord(word.word)}
                    type="button"
                  >
                    <Icon
                      name={speakingWord === word.word ? 'pause' : 'play'}
                    />
                  </button>
                  <div>
                    <div className="word-title">
                      <strong>{word.word}</strong>
                      {word.level ? <span>{word.level}</span> : null}
                    </div>
                    <p>
                      {word.ipa || word.syllables?.join(' · ') || word.word}
                    </p>
                    <span>{word.meaning}</span>
                  </div>
                </article>
              ))
            ) : (
              <div className="vocabulary-empty" role="status">
                <Icon name="search" />
                <strong>没有找到相关词汇</strong>
                <span>换一个单词、音标或中文释义试试</span>
                <button onClick={() => setWordQuery('')} type="button">
                  清除检索
                </button>
              </div>
            )}
          </div>
        </aside>
      </div>
      {selectionPopup ? (
        <div
          aria-label={`${selectionPopup.word} 操作`}
          className="selection-word-popup"
          ref={popupRef}
          role="toolbar"
          style={
            {
              '--selection-left': `${selectionPopup.left}px`,
              '--selection-top': `${selectionPopup.top}px`,
            } as CSSProperties
          }
        >
          <strong>{selectionPopup.word}</strong>
          <span aria-hidden="true" />
          <button
            onClick={() => onSpeakWord(selectionPopup.word)}
            type="button"
          >
            <Icon
              name={speakingWord === selectionPopup.word ? 'pause' : 'sound'}
            />
            {speakingWord === selectionPopup.word ? '停止' : '朗读'}
          </button>
          <button
            disabled={selectedWordIsSaved || Boolean(addingWord)}
            onClick={addSelectedWord}
            type="button"
          >
            <Icon name={selectedWordIsSaved ? 'check' : 'plus'} />
            {addButtonLabel}
          </button>
        </div>
      ) : null}
    </main>
  );
}
