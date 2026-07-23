import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import EchoStorage from '../main/storage';

const writeJson = (filePath: string, value: unknown) =>
  fs.writeFile(filePath, JSON.stringify(value), 'utf8');

describe('article folder import', () => {
  let temporaryRoot: string;
  let packagePath: string;
  let storage: EchoStorage;

  beforeEach(async () => {
    temporaryRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'echo-import-'));
    packagePath = path.join(temporaryRoot, 'portable-article');
    await fs.mkdir(packagePath);
    storage = new EchoStorage(path.join(temporaryRoot, 'EchoData'));
    await storage.initialize();
    await Promise.all([
      writeJson(path.join(packagePath, 'meta.json'), {
        formatVersion: 1,
        title: 'A Portable Lesson',
        sentenceCount: 1,
        wordCount: 2,
      }),
      writeJson(path.join(packagePath, 'sentences.json'), [
        {
          id: 'external-sentence',
          text: 'Practice builds confidence.',
          ipa: '/ˈpræktɪs bɪldz ˈkɒnfɪdəns/',
          translation: '练习可以建立信心。',
        },
      ]),
      writeJson(path.join(packagePath, 'words.json'), [
        {
          id: 'external-word',
          word: 'Confidence',
          ipa: '/ˈkɒnfɪdəns/',
          meaning: '信心',
          level: 'B1',
        },
        {
          id: 'duplicate-word',
          word: 'confidence',
          ipa: '/ˈkɒnfɪdəns/',
          meaning: '自信',
          level: 'invalid',
        },
      ]),
      writeJson(path.join(packagePath, 'progress.json'), {
        sentenceAttempts: {},
        wordSrs: {},
        sessions: [],
      }),
    ]);
  });

  afterEach(async () => {
    await fs.rm(temporaryRoot, { recursive: true, force: true });
  });

  it('validates and normalizes a portable article package', async () => {
    const article = await storage.importArticleFolder(packagePath);

    expect(article.meta.title).toBe('A Portable Lesson');
    expect(article.meta.id).not.toBe('external-sentence');
    expect(article.meta.sentenceCount).toBe(1);
    expect(article.meta.wordCount).toBe(1);
    expect(article.sentences[0].id).toBe('s-1');
    expect(article.words).toEqual([
      expect.objectContaining({
        id: 'w-1',
        word: 'confidence',
        level: 'B1',
      }),
    ]);
    expect(article.progress).toEqual({
      sentenceAttempts: {},
      wordSrs: {},
      sessions: [],
    });
  });

  it('returns the existing article when the same package is imported twice', async () => {
    const first = await storage.importArticleFolder(packagePath);
    const second = await storage.importArticleFolder(packagePath);

    expect(second.meta.id).toBe(first.meta.id);
  });

  it('reports a missing required file by name', async () => {
    await fs.rm(path.join(packagePath, 'words.json'));

    await expect(storage.importArticleFolder(packagePath)).rejects.toThrow(
      '缺少 words.json',
    );
  });
});
