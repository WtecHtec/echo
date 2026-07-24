const SINGLE_ENGLISH_WORD = /^[a-z]+(?:['’-][a-z]+)*$/i;

export const normalizeSelectedWord = (value: string) =>
  value
    .normalize('NFKC')
    .trim()
    .replace(/^[^a-z]+|[^a-z]+$/gi, '')
    .toLocaleLowerCase();

export const isSingleEnglishWord = (value: string) =>
  SINGLE_ENGLISH_WORD.test(normalizeSelectedWord(value));
