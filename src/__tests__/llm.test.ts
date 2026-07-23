import { parseJsonResponse } from '../main/llm';

const sentence = `{"text":"Hello world.","ipa":"/həˈləʊ wɜːld/","translation":"你好，世界。"}`;
const word = `{"word":"hello","ipa":"/həˈləʊ/","meaning":"你好","level":"A1"}`;

describe('LLM JSON response parsing', () => {
  it('parses a strict JSON response inside a Markdown fence', () => {
    const parsed = parseJsonResponse(
      `\`\`\`json\n{"sentences":[${sentence}],"words":[${word}]}\n\`\`\``,
    );

    expect(parsed.sentences).toHaveLength(1);
    expect(parsed.words[0].word).toBe('hello');
  });

  it('repairs a missing comma between array elements', () => {
    const parsed = parseJsonResponse(
      `{"sentences":[${sentence}\n${sentence}],"words":[${word}]}`,
    );

    expect(parsed.sentences).toHaveLength(2);
  });

  it('repairs trailing commas without changing text content', () => {
    const parsed = parseJsonResponse(
      `{"sentences":[${sentence},],"words":[${word},],}`,
    );

    expect(parsed.sentences[0].translation).toBe('你好，世界。');
    expect(parsed.words).toHaveLength(1);
  });

  it('rejects responses without the required arrays', () => {
    expect(() => parseJsonResponse('{"message":"done"}')).toThrow(
      'sentences 或 words',
    );
  });
});
