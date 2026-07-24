/* eslint global-require: off */
import { Word } from '../shared/types';
import { isSingleEnglishWord, normalizeSelectedWord } from '../shared/words';

const { hyphenateSync } = require('hyphen/en') as {
  hyphenateSync: (
    text: string,
    options?: { hyphenChar?: string; minWordLength?: number },
  ) => string;
};

const LOOKUP_TIMEOUT_MS = 10000;
const SYLLABLE_SEPARATOR = '·';

const lookupWord = async (value: string): Promise<Omit<Word, 'id'>> => {
  const word = normalizeSelectedWord(value);
  if (!isSingleEnglishWord(word)) {
    throw new Error('请选择一个完整的英文单词');
  }

  const hyphenated = hyphenateSync(word, {
    hyphenChar: SYLLABLE_SEPARATOR,
    minWordLength: 4,
  });
  const syllables = hyphenated
    .split(SYLLABLE_SEPARATOR)
    .map((part) => part.trim())
    .filter(Boolean);

  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  try {
    const { default: translate } = await import('translate');
    const meaning = await Promise.race([
      translate(word, { from: 'en', to: 'zh' }),
      new Promise<never>((_resolve, reject) => {
        timeoutId = setTimeout(
          () => reject(new Error('翻译服务响应超时，请稍后重试')),
          LOOKUP_TIMEOUT_MS,
        );
      }),
    ]);

    if (!meaning.trim()) {
      throw new Error('暂时没有查询到这个单词的释义');
    }

    return {
      word,
      ipa: '',
      meaning: meaning.trim(),
      syllables: syllables.length ? syllables : [word],
    };
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.includes('超时') || error.message.includes('没有查询到'))
    ) {
      throw error;
    }
    throw new Error('词义查询失败，请检查网络后重试');
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
};

export default lookupWord;
