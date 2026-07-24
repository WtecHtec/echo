export type CefrLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

export interface Sentence {
  id: string;
  text: string;
  ipa: string;
  translation: string;
}

export interface Word {
  id: string;
  word: string;
  ipa: string;
  meaning: string;
  level?: CefrLevel;
  syllables?: string[];
}

export interface SrsState {
  repetitions: number;
  interval: number;
  easeFactor: number;
  dueAt: string;
  lastReviewedAt?: string;
  correctCount: number;
  incorrectCount: number;
  mastered: boolean;
}

export interface SentenceAttempt {
  sentenceId: string;
  answer: string;
  correct: boolean;
  usedHint: boolean;
  durationMs: number;
  attemptedAt: string;
}

export interface PracticeSession {
  id: string;
  kind: 'sentence' | 'word';
  startedAt: string;
  completedAt: string;
  correct: number;
  total: number;
  hints: number;
  durationMs: number;
}

export interface ArticleProgress {
  sentenceAttempts: Record<string, SentenceAttempt[]>;
  wordSrs: Record<string, SrsState>;
  sessions: PracticeSession[];
}

export interface ArticleMeta {
  id: string;
  title: string;
  slug: string;
  importedAt: string;
  sourceHash: string;
  sentenceCount: number;
  wordCount: number;
  progressPercent: number;
}

export interface ArticleData {
  meta: ArticleMeta;
  sentences: Sentence[];
  words: Word[];
  progress: ArticleProgress;
}

export interface ArticleSummary extends ArticleMeta {
  preview: string;
  studiedSentences: number;
}

export interface VocabularyEntry extends Word {
  articleIds: string[];
  srs: SrsState;
}

export interface LlmSettings {
  apiUrl: string;
  apiKey: string;
  model: string;
}

export interface AppSettings {
  llm: LlmSettings;
  speechRate: number;
  fontScale: number;
  voiceName: string;
  dataVersion: 1;
}

export interface ParseArticleInput {
  title: string;
  text: string;
}

export type ParseArticleStage =
  | 'preparing'
  | 'requesting'
  | 'repairing'
  | 'processing'
  | 'saving'
  | 'complete';

export interface ParseArticleProgress {
  stage: ParseArticleStage;
  message: string;
}

export interface ConnectionResult {
  ok: boolean;
  message: string;
  latencyMs?: number;
}

export interface DashboardData {
  articles: ArticleSummary[];
  dueWordCount: number;
  totalWordCount: number;
  dataPath: string;
}

export interface StudyActivityDay {
  date: string;
  sentenceCount: number;
  wordCount: number;
  sessionCount: number;
  durationMs: number;
  manualCheckIn: boolean;
  intensity: 0 | 1 | 2 | 3 | 4;
}

export interface StudyActivityRecord {
  id: string;
  date: string;
  occurredAt: string;
  kind: 'sentence' | 'word' | 'check-in';
  title: string;
  sentenceCount: number;
  wordCount: number;
  durationMs: number;
}

export interface StudyActivityOverview {
  year: number;
  days: StudyActivityDay[];
  currentStreak: number;
  longestStreak: number;
  activeDays: number;
  totalPractices: number;
  todayCheckedIn: boolean;
  records: StudyActivityRecord[];
}

export interface EchoApi {
  getDashboard(): Promise<DashboardData>;
  getStudyActivity(year: number): Promise<StudyActivityOverview>;
  checkInToday(): Promise<StudyActivityOverview>;
  getArticle(articleId: string): Promise<ArticleData>;
  parseArticle(input: ParseArticleInput): Promise<ArticleData>;
  onParseProgress(
    listener: (progress: ParseArticleProgress) => void,
  ): () => void;
  importTextFile(): Promise<{ title: string; text: string } | null>;
  importArticleFolder(): Promise<ArticleData | null>;
  copyOfflinePrompt(): Promise<void>;
  deleteArticle(articleId: string): Promise<void>;
  saveProgress(articleId: string, progress: ArticleProgress): Promise<void>;
  addWord(articleId: string, word: string): Promise<ArticleData>;
  getVocabulary(): Promise<VocabularyEntry[]>;
  saveVocabulary(entries: VocabularyEntry[]): Promise<void>;
  getSettings(): Promise<AppSettings>;
  saveSettings(settings: AppSettings): Promise<AppSettings>;
  testConnection(settings: LlmSettings): Promise<ConnectionResult>;
  showDataFolder(): Promise<void>;
}
