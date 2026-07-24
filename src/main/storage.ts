import { createHash, randomUUID } from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';
import {
  AppSettings,
  ArticleData,
  ArticleMeta,
  ArticleProgress,
  ArticleSummary,
  CefrLevel,
  DashboardData,
  ParseArticleInput,
  ParseArticleProgress,
  Sentence,
  StudyActivityDay,
  StudyActivityOverview,
  StudyActivityRecord,
  VocabularyEntry,
  Word,
} from '../shared/types';
import {
  activityIntensity,
  calculateStreaks,
  toDateKey,
} from '../shared/activity';
import { createSrsState } from '../shared/learning';
import { parseArticleWithLlm } from './llm';

interface ManualCheckIn {
  date: string;
  checkedAt: string;
}

interface ActivityAccumulator {
  date: string;
  sentenceCount: number;
  wordCount: number;
  sessionCount: number;
  durationMs: number;
  manualCheckIn: boolean;
}

const defaultSettings: AppSettings = {
  llm: {
    apiUrl: 'https://api.openai.com/v1',
    apiKey: '',
    model: 'gpt-4o-mini',
  },
  speechRate: 1,
  fontScale: 1,
  voiceName: '',
  dataVersion: 1,
};

const emptyProgress = (): ArticleProgress => ({
  sentenceAttempts: {},
  wordSrs: {},
  sessions: [],
});

const seedWords: Word[] = [
  {
    id: 'w-1',
    word: 'attention',
    ipa: '/əˈtenʃən/',
    meaning: '注意力；专注',
    level: 'A2',
  },
  {
    id: 'w-2',
    word: 'fragmented',
    ipa: '/ˈfræɡmentɪd/',
    meaning: '被分散的，碎片化的',
    level: 'C1',
  },
  {
    id: 'w-3',
    word: 'cognitive',
    ipa: '/ˈkɒɡnətɪv/',
    meaning: '认知的',
    level: 'C1',
  },
  {
    id: 'w-4',
    word: 'residue',
    ipa: '/ˈrezɪdjuː/',
    meaning: '残留；此处指注意力残留',
    level: 'C2',
  },
  {
    id: 'w-5',
    word: 'deliberate',
    ipa: '/dɪˈlɪbərət/',
    meaning: '刻意的，审慎的',
    level: 'B2',
  },
  {
    id: 'w-6',
    word: 'capacity',
    ipa: '/kəˈpæsəti/',
    meaning: '能力；容量',
    level: 'B2',
  },
];

const seedArticle = (): ArticleData => {
  const text =
    'Deep work is the ability to focus without distraction on a demanding task.';
  const importedAt = new Date().toISOString();
  return {
    meta: {
      id: 'welcome',
      title: 'The Power of Deep Work',
      slug: 'the-power-of-deep-work',
      importedAt,
      sourceHash: createHash('sha256')
        .update('echo-welcome-article')
        .digest('hex'),
      sentenceCount: 4,
      wordCount: seedWords.length,
      progressPercent: 0,
    },
    sentences: [
      {
        id: 's-1',
        text,
        ipa: '/diːp wɜːk ɪz ði əˈbɪləti tə ˈfəʊkəs wɪˈðaʊt dɪˈstrækʃən ɒn ə dɪˈmɑːndɪŋ tɑːsk/',
        translation: '深度工作，是在不受干扰的情况下专注于高要求任务的能力。',
      },
      {
        id: 's-2',
        text: 'When our attention is constantly fragmented, a residue of the previous task remains in our mind.',
        ipa: '/wen aʊə əˈtenʃən ɪz ˈkɒnstəntli ˈfræɡmentɪd ə ˈrezɪdjuː əv ðə ˈpriːviəs tɑːsk rɪˈmeɪnz ɪn aʊə maɪnd/',
        translation: '当注意力不断被切碎时，上一个任务的残留仍会留在脑海中。',
      },
      {
        id: 's-3',
        text: 'This attention residue quietly reduces our cognitive capacity.',
        ipa: '/ðɪs əˈtenʃən ˈrezɪdjuː ˈkwaɪətli rɪˈdjuːsɪz aʊə ˈkɒɡnətɪv kəˈpæsəti/',
        translation: '这种注意力残留会悄然降低我们的认知能力。',
      },
      {
        id: 's-4',
        text: 'Protecting time for deliberate focus is therefore a skill worth practicing.',
        ipa: '/prəˈtektɪŋ taɪm fə dɪˈlɪbərət ˈfəʊkəs ɪz ˈðeəfɔːr ə skɪl wɜːθ ˈpræktɪsɪŋ/',
        translation: '因此，为刻意专注保护时间，是一项值得练习的技能。',
      },
    ],
    words: seedWords,
    progress: emptyProgress(),
  };
};

const slugify = (value: string) =>
  value
    .normalize('NFKD')
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 56) || 'untitled';

const calculateProgress = (
  progress: ArticleProgress,
  sentenceCount: number,
) => {
  if (!sentenceCount) return 0;
  const completed = Object.values(progress.sentenceAttempts).filter(
    (attempts) => attempts.length > 0,
  ).length;
  return Math.round((completed / sentenceCount) * 100);
};

export default class EchoStorage {
  private readonly rootPath: string;

  private readonly articlesPath: string;

  private readonly vocabularyPath: string;

  private readonly settingsPath: string;

  private readonly checkInsPath: string;

  constructor(rootPath: string) {
    this.rootPath = rootPath;
    this.articlesPath = path.join(rootPath, 'articles');
    this.vocabularyPath = path.join(rootPath, 'vocabulary', 'index.json');
    this.settingsPath = path.join(rootPath, 'settings.json');
    this.checkInsPath = path.join(rootPath, 'check-ins.json');
  }

  async initialize() {
    await Promise.all([
      fs.mkdir(this.articlesPath, { recursive: true }),
      fs.mkdir(path.dirname(this.vocabularyPath), { recursive: true }),
    ]);
    await this.ensureJson(this.settingsPath, defaultSettings);
    await this.ensureJson(this.vocabularyPath, []);
    await this.ensureJson(this.checkInsPath, []);
    const directories = await fs.readdir(this.articlesPath);
    if (directories.length === 0) {
      await this.writeArticle(seedArticle());
      await this.mergeVocabulary(seedArticle());
    }
  }

  getDataPath() {
    return this.rootPath;
  }

  async getStudyActivity(year: number): Promise<StudyActivityOverview> {
    const safeYear =
      Number.isInteger(year) && year >= 2000 && year <= 2100
        ? year
        : new Date().getFullYear();
    const [summaries, vocabulary, manualCheckIns] = await Promise.all([
      this.listArticles(),
      this.getVocabulary(),
      this.readJson<ManualCheckIn[]>(this.checkInsPath),
    ]);
    const articles = await Promise.all(
      summaries.map((summary) => this.getArticle(summary.id)),
    );
    const days = new Map<string, ActivityAccumulator>();
    const records: StudyActivityRecord[] = [];

    const getDay = (date: string) => {
      const existing = days.get(date);
      if (existing) return existing;
      const created: ActivityAccumulator = {
        date,
        sentenceCount: 0,
        wordCount: 0,
        sessionCount: 0,
        durationMs: 0,
        manualCheckIn: false,
      };
      days.set(date, created);
      return created;
    };

    articles.forEach((article) => {
      Object.values(article.progress.sentenceAttempts).forEach((attempts) => {
        attempts.forEach((attempt) => {
          const day = getDay(toDateKey(attempt.attemptedAt));
          day.sentenceCount += 1;
        });
      });
      article.progress.sessions.forEach((session) => {
        const occurredAt = session.completedAt || session.startedAt;
        const date = toDateKey(occurredAt);
        const day = getDay(date);
        day.sessionCount += 1;
        day.durationMs += Math.max(0, session.durationMs);
        records.push({
          id: `${article.meta.id}-${session.id}`,
          date,
          occurredAt,
          kind: session.kind,
          title: article.meta.title,
          sentenceCount: session.kind === 'sentence' ? session.total : 0,
          wordCount: session.kind === 'word' ? session.total : 0,
          durationMs: Math.max(0, session.durationMs),
        });
      });
    });

    const wordRecords = new Map<string, StudyActivityRecord>();
    vocabulary.forEach((entry) => {
      if (!entry.srs.lastReviewedAt) return;
      const date = toDateKey(entry.srs.lastReviewedAt);
      getDay(date).wordCount += 1;
      const current = wordRecords.get(date);
      if (current) {
        current.wordCount += 1;
        if (entry.srs.lastReviewedAt > current.occurredAt) {
          current.occurredAt = entry.srs.lastReviewedAt;
        }
      } else {
        wordRecords.set(date, {
          id: `words-${date}`,
          date,
          occurredAt: entry.srs.lastReviewedAt,
          kind: 'word',
          title: '全局生词本',
          sentenceCount: 0,
          wordCount: 1,
          durationMs: 0,
        });
      }
    });
    wordRecords.forEach((record) => records.push(record));

    manualCheckIns.forEach((checkIn) => {
      const day = getDay(checkIn.date);
      day.manualCheckIn = true;
      records.push({
        id: `check-in-${checkIn.date}`,
        date: checkIn.date,
        occurredAt: checkIn.checkedAt,
        kind: 'check-in',
        title: '完成今日打卡',
        sentenceCount: 0,
        wordCount: 0,
        durationMs: 0,
      });
    });

    const allDays: StudyActivityDay[] = Array.from(days.values())
      .map((day) => {
        const inferredSessions =
          (day.sentenceCount > 0 ? 1 : 0) + (day.wordCount > 0 ? 1 : 0);
        const sessionCount = Math.max(day.sessionCount, inferredSessions);
        return {
          ...day,
          sessionCount,
          intensity: activityIntensity(
            day.sentenceCount,
            day.wordCount,
            sessionCount,
            day.manualCheckIn,
          ),
        };
      })
      .sort((a, b) => a.date.localeCompare(b.date));
    const { currentStreak, longestStreak } = calculateStreaks(allDays);
    const yearPrefix = `${safeYear}-`;
    const yearDays = allDays.filter((day) => day.date.startsWith(yearPrefix));
    const yearRecords = records
      .filter((record) => record.date.startsWith(yearPrefix))
      .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
      .slice(0, 8);
    const today = toDateKey(new Date());

    return {
      year: safeYear,
      days: yearDays,
      currentStreak,
      longestStreak,
      activeDays: yearDays.length,
      totalPractices: allDays.reduce(
        (total, day) => total + day.sessionCount,
        0,
      ),
      todayCheckedIn:
        (allDays.find((day) => day.date === today)?.intensity ?? 0) > 0,
      records: yearRecords,
    };
  }

  async checkInToday(): Promise<StudyActivityOverview> {
    const now = new Date();
    const date = toDateKey(now);
    const checkIns = await this.readJson<ManualCheckIn[]>(this.checkInsPath);
    if (!checkIns.some((checkIn) => checkIn.date === date)) {
      await this.atomicWriteJson(this.checkInsPath, [
        ...checkIns,
        { date, checkedAt: now.toISOString() },
      ]);
    }
    return this.getStudyActivity(now.getFullYear());
  }

  async getDashboard(): Promise<DashboardData> {
    const articles = await this.listArticles();
    const vocabulary = await this.getVocabulary();
    const now = Date.now();
    return {
      articles,
      dueWordCount: vocabulary.filter(
        (item) =>
          !item.srs.mastered && new Date(item.srs.dueAt).getTime() <= now,
      ).length,
      totalWordCount: vocabulary.length,
      dataPath: this.rootPath,
    };
  }

  async listArticles(): Promise<ArticleSummary[]> {
    const directories = await fs.readdir(this.articlesPath, {
      withFileTypes: true,
    });
    const summaries = await Promise.all(
      directories
        .filter((entry) => entry.isDirectory())
        .map(async (entry): Promise<ArticleSummary | null> => {
          try {
            const directory = path.join(this.articlesPath, entry.name);
            const [meta, sentences, progress] = await Promise.all([
              this.readJson<ArticleMeta>(path.join(directory, 'meta.json')),
              this.readJson<ArticleData['sentences']>(
                path.join(directory, 'sentences.json'),
              ),
              this.readJson<ArticleProgress>(
                path.join(directory, 'progress.json'),
              ),
            ]);
            return {
              ...meta,
              preview: sentences[0]?.text ?? '',
              studiedSentences: Object.values(progress.sentenceAttempts).filter(
                (attempts) => attempts.length > 0,
              ).length,
            };
          } catch {
            return null;
          }
        }),
    );
    return summaries
      .filter((item): item is ArticleSummary => item !== null)
      .sort(
        (a, b) =>
          new Date(b.importedAt).getTime() - new Date(a.importedAt).getTime(),
      );
  }

  async getArticle(articleId: string): Promise<ArticleData> {
    const directory = await this.findArticleDirectory(articleId);
    const [meta, sentences, words, progress] = await Promise.all([
      this.readJson<ArticleMeta>(path.join(directory, 'meta.json')),
      this.readJson<ArticleData['sentences']>(
        path.join(directory, 'sentences.json'),
      ),
      this.readJson<ArticleData['words']>(path.join(directory, 'words.json')),
      this.readJson<ArticleProgress>(path.join(directory, 'progress.json')),
    ]);
    return { meta, sentences, words, progress };
  }

  async importArticleFolder(directoryPath: string): Promise<ArticleData> {
    const directory = path.resolve(directoryPath);
    const stats = await fs.stat(directory).catch(() => null);
    if (!stats?.isDirectory()) throw new Error('请选择有效的文章文件夹');

    const readPackageFile = async <T>(fileName: string): Promise<T> => {
      try {
        return await this.readJson<T>(path.join(directory, fileName));
      } catch (error) {
        if ((error as { code?: string }).code === 'ENOENT') {
          throw new Error(`文章文件夹缺少 ${fileName}`);
        }
        if (error instanceof SyntaxError) {
          throw new Error(`${fileName} 不是有效的 JSON 文件`);
        }
        throw error;
      }
    };

    const [rawMeta, rawSentences, rawWords, rawProgress] = await Promise.all([
      readPackageFile<unknown>('meta.json'),
      readPackageFile<unknown>('sentences.json'),
      readPackageFile<unknown>('words.json'),
      readPackageFile<unknown>('progress.json'),
    ]);
    if (!rawMeta || typeof rawMeta !== 'object' || Array.isArray(rawMeta)) {
      throw new Error('meta.json 必须是 JSON 对象');
    }
    const { title } = rawMeta as { title?: unknown };
    if (typeof title !== 'string' || !title.trim()) {
      throw new Error('meta.json 缺少有效的 title');
    }
    if (!Array.isArray(rawSentences) || rawSentences.length === 0) {
      throw new Error('sentences.json 必须包含至少一个句子');
    }
    if (!Array.isArray(rawWords)) {
      throw new Error('words.json 必须是 JSON 数组');
    }
    if (
      !rawProgress ||
      typeof rawProgress !== 'object' ||
      Array.isArray(rawProgress) ||
      !(rawProgress as { sentenceAttempts?: unknown }).sentenceAttempts ||
      typeof (rawProgress as { sentenceAttempts?: unknown })
        .sentenceAttempts !== 'object' ||
      !(rawProgress as { wordSrs?: unknown }).wordSrs ||
      typeof (rawProgress as { wordSrs?: unknown }).wordSrs !== 'object' ||
      !Array.isArray((rawProgress as { sessions?: unknown }).sessions)
    ) {
      throw new Error('progress.json 缺少初始学习进度结构');
    }

    const sentences = rawSentences.map((item, index) => {
      const value = item as Partial<Sentence>;
      if (
        !value ||
        typeof value.text !== 'string' ||
        !value.text.trim() ||
        typeof value.ipa !== 'string' ||
        typeof value.translation !== 'string'
      ) {
        throw new Error(
          `sentences.json 第 ${index + 1} 项缺少 text、ipa 或 translation`,
        );
      }
      return {
        id: `s-${index + 1}`,
        text: value.text.trim(),
        ipa: value.ipa.trim(),
        translation: value.translation.trim(),
      };
    });

    const allowedLevels = new Set<CefrLevel>([
      'A1',
      'A2',
      'B1',
      'B2',
      'C1',
      'C2',
    ]);
    const seenWords = new Set<string>();
    const words = rawWords.flatMap((item, index) => {
      const value = item as Partial<Word>;
      if (
        !value ||
        typeof value.word !== 'string' ||
        !value.word.trim() ||
        typeof value.ipa !== 'string' ||
        typeof value.meaning !== 'string'
      ) {
        throw new Error(
          `words.json 第 ${index + 1} 项缺少 word、ipa 或 meaning`,
        );
      }
      const normalizedWord = value.word.trim().toLocaleLowerCase();
      if (seenWords.has(normalizedWord)) return [];
      seenWords.add(normalizedWord);
      return [
        {
          id: `w-${seenWords.size}`,
          word: normalizedWord,
          ipa: value.ipa.trim(),
          meaning: value.meaning.trim(),
          level:
            value.level && allowedLevels.has(value.level)
              ? value.level
              : undefined,
        },
      ];
    });

    const normalizedText = sentences
      .map((sentence) => sentence.text)
      .join('\n');
    const sourceHash = createHash('sha256')
      .update(normalizedText)
      .digest('hex');
    const existing = (await this.listArticles()).find(
      (article) => article.sourceHash === sourceHash,
    );
    if (existing) return this.getArticle(existing.id);

    const id = randomUUID().slice(0, 8);
    const article: ArticleData = {
      meta: {
        id,
        title: title.trim(),
        slug: slugify(title),
        importedAt: new Date().toISOString(),
        sourceHash,
        sentenceCount: sentences.length,
        wordCount: words.length,
        progressPercent: 0,
      },
      sentences,
      words,
      progress: emptyProgress(),
    };
    await this.writeArticle(article);
    await this.mergeVocabulary(article);
    return article;
  }

  async parseArticle(
    input: ParseArticleInput,
    reportProgress: (progress: ParseArticleProgress) => void = () => {},
  ): Promise<ArticleData> {
    reportProgress({ stage: 'preparing', message: '正在检查文章与本地缓存' });
    const title = input.title.trim() || '未命名文章';
    const text = input.text.trim();
    if (!text) throw new Error('文章内容不能为空');
    if (text.split(/\s+/).length > 3000) {
      throw new Error('单篇文章请控制在 3000 词以内');
    }
    const sourceHash = createHash('sha256').update(text).digest('hex');
    const articles = await this.listArticles();
    const cached = articles.find(
      (article) => article.sourceHash === sourceHash,
    );
    if (cached) {
      reportProgress({ stage: 'complete', message: '已从本地缓存读取结果' });
      return this.getArticle(cached.id);
    }

    const settings = await this.getSettings();
    if (!settings.llm.apiUrl || !settings.llm.apiKey || !settings.llm.model) {
      throw new Error('请先在设置中完成大模型 API 配置');
    }

    const parsed = await parseArticleWithLlm(
      settings.llm,
      title,
      text,
      reportProgress,
    );
    reportProgress({ stage: 'saving', message: '正在保存学习材料到本地' });
    const id = randomUUID().slice(0, 8);
    const article: ArticleData = {
      meta: {
        id,
        title,
        slug: slugify(title),
        importedAt: new Date().toISOString(),
        sourceHash,
        sentenceCount: parsed.sentences.length,
        wordCount: parsed.words.length,
        progressPercent: 0,
      },
      ...parsed,
      progress: emptyProgress(),
    };
    await this.writeArticle(article);
    await this.mergeVocabulary(article);
    reportProgress({ stage: 'complete', message: '学习材料已生成' });
    return article;
  }

  async deleteArticle(articleId: string) {
    const directory = await this.findArticleDirectory(articleId);
    const vocabulary = await this.getVocabulary();
    const updated = vocabulary
      .map((entry) => ({
        ...entry,
        articleIds: entry.articleIds.filter((id) => id !== articleId),
      }))
      .filter((entry) => entry.articleIds.length > 0);
    await this.atomicWriteJson(this.vocabularyPath, updated);
    await fs.rm(directory, { recursive: true });
  }

  async saveProgress(articleId: string, progress: ArticleProgress) {
    const directory = await this.findArticleDirectory(articleId);
    const metaPath = path.join(directory, 'meta.json');
    const meta = await this.readJson<ArticleMeta>(metaPath);
    const updatedMeta = {
      ...meta,
      progressPercent: calculateProgress(progress, meta.sentenceCount),
    };
    await Promise.all([
      this.atomicWriteJson(path.join(directory, 'progress.json'), progress),
      this.atomicWriteJson(metaPath, updatedMeta),
    ]);
  }

  async addWord(
    articleId: string,
    candidate: Omit<Word, 'id'>,
  ): Promise<ArticleData> {
    const article = await this.getArticle(articleId);
    const normalizedWord = candidate.word.trim().toLocaleLowerCase();
    const existing = article.words.find(
      (word) => word.word.toLocaleLowerCase() === normalizedWord,
    );
    if (existing) return article;

    const word: Word = {
      ...candidate,
      id: `w-${randomUUID()}`,
      word: normalizedWord,
    };
    const words = [...article.words, word];
    const meta = { ...article.meta, wordCount: words.length };
    const updatedArticle = { ...article, meta, words };
    const directory = await this.findArticleDirectory(articleId);

    await Promise.all([
      this.atomicWriteJson(path.join(directory, 'words.json'), words),
      this.atomicWriteJson(path.join(directory, 'meta.json'), meta),
    ]);
    await this.mergeVocabulary(updatedArticle);
    return updatedArticle;
  }

  async getVocabulary(): Promise<VocabularyEntry[]> {
    return this.readJson<VocabularyEntry[]>(this.vocabularyPath);
  }

  async saveVocabulary(entries: VocabularyEntry[]) {
    await this.atomicWriteJson(this.vocabularyPath, entries);
  }

  async getSettings(): Promise<AppSettings> {
    const settings = await this.readJson<Partial<AppSettings>>(
      this.settingsPath,
    );
    return {
      ...defaultSettings,
      ...settings,
      llm: { ...defaultSettings.llm, ...settings.llm },
    };
  }

  async saveSettings(settings: AppSettings): Promise<AppSettings> {
    const safeSettings: AppSettings = {
      ...settings,
      speechRate: Math.min(1.5, Math.max(0.5, settings.speechRate)),
      fontScale: Math.min(1.3, Math.max(0.85, settings.fontScale)),
      dataVersion: 1,
    };
    await this.atomicWriteJson(this.settingsPath, safeSettings);
    return safeSettings;
  }

  private async mergeVocabulary(article: ArticleData) {
    const vocabulary = await this.getVocabulary();
    const byWord = new Map(
      vocabulary.map((entry) => [entry.word.toLocaleLowerCase(), entry]),
    );
    article.words.forEach((word) => {
      const key = word.word.toLocaleLowerCase();
      const current = byWord.get(key);
      if (current) {
        if (!current.articleIds.includes(article.meta.id)) {
          current.articleIds.push(article.meta.id);
        }
      } else {
        byWord.set(key, {
          ...word,
          articleIds: [article.meta.id],
          srs: createSrsState(),
        });
      }
    });
    await this.atomicWriteJson(
      this.vocabularyPath,
      Array.from(byWord.values()),
    );
  }

  private async writeArticle(article: ArticleData) {
    const directory = path.join(
      this.articlesPath,
      `${article.meta.id}-${article.meta.slug}`,
    );
    await fs.mkdir(directory, { recursive: true });
    await Promise.all([
      this.atomicWriteJson(path.join(directory, 'meta.json'), article.meta),
      this.atomicWriteJson(
        path.join(directory, 'sentences.json'),
        article.sentences,
      ),
      this.atomicWriteJson(path.join(directory, 'words.json'), article.words),
      this.atomicWriteJson(
        path.join(directory, 'progress.json'),
        article.progress,
      ),
    ]);
  }

  private async findArticleDirectory(articleId: string) {
    if (!/^[a-zA-Z0-9-]+$/.test(articleId)) {
      throw new Error('无效的文章 ID');
    }
    const directories = await fs.readdir(this.articlesPath, {
      withFileTypes: true,
    });
    const match = directories.find(
      (entry) =>
        entry.isDirectory() &&
        (entry.name === articleId || entry.name.startsWith(`${articleId}-`)),
    );
    if (!match) throw new Error('文章不存在或已被删除');
    return path.join(this.articlesPath, match.name);
  }

  private async ensureJson<T>(filePath: string, fallback: T) {
    try {
      await fs.access(filePath);
    } catch {
      await this.atomicWriteJson(filePath, fallback);
    }
  }

  // File helpers intentionally remain instance methods so storage behavior can
  // be overridden in future portable-data implementations.
  // eslint-disable-next-line class-methods-use-this
  private async readJson<T>(filePath: string): Promise<T> {
    const content = await fs.readFile(filePath, 'utf8');
    return JSON.parse(content) as T;
  }

  // eslint-disable-next-line class-methods-use-this
  private async atomicWriteJson(filePath: string, value: unknown) {
    const temporaryPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
    const backupPath = `${filePath}.${process.pid}.bak`;
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, {
      encoding: 'utf8',
      mode: 0o600,
    });
    let hadOriginal = false;
    try {
      await fs.rename(filePath, backupPath);
      hadOriginal = true;
    } catch (error) {
      if ((error as { code?: string }).code !== 'ENOENT') throw error;
    }
    try {
      await fs.rename(temporaryPath, filePath);
      if (hadOriginal) await fs.unlink(backupPath);
    } catch (error) {
      await fs.rm(temporaryPath, { force: true });
      if (hadOriginal) await fs.rename(backupPath, filePath);
      throw error;
    }
  }
}
