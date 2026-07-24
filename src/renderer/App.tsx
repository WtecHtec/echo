import { useCallback, useEffect, useState } from 'react';
import {
  AppSettings,
  ArticleData,
  ArticleProgress,
  ConnectionResult,
  DashboardData,
  LlmSettings,
  ParseArticleProgress,
  VocabularyEntry,
} from '../shared/types';
import Icon from './components/Icon';
import useSpeech from './hooks/useSpeech';
import useWordAudio from './hooks/useWordAudio';
import ImportView from './views/ImportView';
import LibraryView from './views/LibraryView';
import SentencePracticeView from './views/SentencePracticeView';
import SettingsView from './views/SettingsView';
import StudyView from './views/StudyView';
import WordPracticeView from './views/WordPracticeView';
import './App.css';

type View =
  | 'library'
  | 'import'
  | 'study'
  | 'sentence-practice'
  | 'word-practice'
  | 'settings';

const fallbackSettings: AppSettings = {
  llm: { apiUrl: '', apiKey: '', model: '' },
  speechRate: 1,
  fontScale: 1,
  voiceName: 'en-GB',
  dataVersion: 1,
};

const fallbackDashboard: DashboardData = {
  articles: [],
  dueWordCount: 0,
  totalWordCount: 0,
  dataPath: '',
};

interface SidebarProps {
  active: View;
  dueWordCount: number;
  onNavigate: (view: 'library' | 'word-practice' | 'settings') => void;
}

function Sidebar({ active, dueWordCount, onNavigate }: SidebarProps) {
  return (
    <aside className="sidebar">
      <button
        aria-label="返回文章"
        className="brand"
        onClick={() => onNavigate('library')}
        type="button"
      >
        <span className="brand-mark">E</span>
        <strong>Echo</strong>
      </button>
      <nav>
        <button
          className={active === 'library' ? 'active' : ''}
          onClick={() => onNavigate('library')}
          type="button"
        >
          <Icon name="articles" />
          <span>文章</span>
        </button>
        <button
          className={active === 'study' ? 'active' : ''}
          onClick={() => onNavigate('library')}
          type="button"
        >
          <Icon name="book" />
          <span>精读</span>
        </button>
        <button
          className={active === 'word-practice' ? 'active' : ''}
          onClick={() => onNavigate('word-practice')}
          type="button"
        >
          <Icon name="brain" />
          <span>复习</span>
          {dueWordCount ? <i>{dueWordCount}</i> : null}
        </button>
      </nav>
      <button
        className={`sidebar-settings ${active === 'settings' ? 'active' : ''}`}
        onClick={() => onNavigate('settings')}
        type="button"
      >
        <Icon name="settings" />
        <span>设置</span>
      </button>
    </aside>
  );
}

export default function App() {
  const [view, setView] = useState<View>('library');
  const [dashboard, setDashboard] = useState<DashboardData>(fallbackDashboard);
  const [settings, setSettings] = useState<AppSettings>(fallbackSettings);
  const [article, setArticle] = useState<ArticleData | null>(null);
  const [vocabulary, setVocabulary] = useState<VocabularyEntry[]>([]);
  const [wordArticleId, setWordArticleId] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [parseProgress, setParseProgress] =
    useState<ParseArticleProgress | null>(null);
  const [error, setError] = useState('');
  const { speak, stop, speakingText } = useSpeech(
    settings.speechRate,
    settings.voiceName,
  );
  const { speakWord, speakingWord, stopWord } = useWordAudio();

  const stopAudio = useCallback(() => {
    stop();
    stopWord();
  }, [stop, stopWord]);
  const speakSentence = useCallback(
    (text: string) => {
      stopWord();
      speak(text);
    },
    [speak, stopWord],
  );
  const playWord = useCallback(
    (word: string) => {
      stop();
      speakWord(word);
    },
    [speakWord, stop],
  );

  const refreshDashboard = useCallback(async () => {
    const nextDashboard = await window.echo.getDashboard();
    setDashboard(nextDashboard);
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const [nextDashboard, nextSettings] = await Promise.all([
          window.echo.getDashboard(),
          window.echo.getSettings(),
        ]);
        setDashboard(nextDashboard);
        setSettings(nextSettings);
      } catch (loadError) {
        setError(
          loadError instanceof Error ? loadError.message : '应用初始化失败',
        );
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const openArticle = async (articleId: string) => {
    setLoading(true);
    setError('');
    try {
      setArticle(await window.echo.getArticle(articleId));
      setView('study');
    } catch (openError) {
      setError(openError instanceof Error ? openError.message : '无法打开文章');
    } finally {
      setLoading(false);
    }
  };

  const openWordPractice = async (articleId?: string) => {
    setLoading(true);
    try {
      if (articleId && article?.meta.id !== articleId) {
        setArticle(await window.echo.getArticle(articleId));
      }
      setVocabulary(await window.echo.getVocabulary());
      setWordArticleId(articleId);
      setView('word-practice');
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : '无法加载词库');
    } finally {
      setLoading(false);
    }
  };

  const navigate = (nextView: 'library' | 'word-practice' | 'settings') => {
    stopAudio();
    if (nextView === 'word-practice') {
      openWordPractice();
    } else {
      setView(nextView);
    }
  };

  const parseArticle = async (title: string, text: string) => {
    setImporting(true);
    setParseProgress({
      stage: 'preparing',
      message: '正在准备文章分析',
    });
    setError('');
    const unsubscribe = window.echo.onParseProgress(setParseProgress);
    try {
      const parsed = await window.echo.parseArticle({ title, text });
      setArticle(parsed);
      await refreshDashboard();
      setView('study');
    } catch (parseError) {
      setError(
        parseError instanceof Error
          ? parseError.message
          : '文章解析失败，请重试',
      );
    } finally {
      unsubscribe();
      setImporting(false);
    }
  };

  const importArticleFolder = async () => {
    setError('');
    try {
      const imported = await window.echo.importArticleFolder();
      if (!imported) return false;
      setArticle(imported);
      await refreshDashboard();
      setView('study');
      return true;
    } catch (importError) {
      setError(
        importError instanceof Error
          ? importError.message
          : '文章文件夹导入失败',
      );
      return false;
    }
  };

  const copyOfflinePrompt = async () => {
    setError('');
    try {
      await window.echo.copyOfflinePrompt();
      return true;
    } catch (copyError) {
      setError(
        copyError instanceof Error ? copyError.message : 'Prompt 复制失败',
      );
      return false;
    }
  };

  const deleteArticle = async (articleId: string) => {
    const target = dashboard.articles.find((item) => item.id === articleId);
    // Native confirmation is intentional for a destructive local-file action.
    // eslint-disable-next-line no-alert
    const confirmed = window.confirm(
      `确定删除《${target?.title ?? '这篇文章'}》吗？其文章文件与学习记录将一并移除。`,
    );
    if (!confirmed) {
      return;
    }
    try {
      await window.echo.deleteArticle(articleId);
      if (article?.meta.id === articleId) setArticle(null);
      await refreshDashboard();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : '删除失败');
    }
  };

  const saveProgress = async (progress: ArticleProgress) => {
    if (!article) return;
    await window.echo.saveProgress(article.meta.id, progress);
    setArticle((current) => (current ? { ...current, progress } : current));
    await refreshDashboard();
  };

  const saveVocabulary = async (entries: VocabularyEntry[]) => {
    setVocabulary(entries);
    await window.echo.saveVocabulary(entries);
    await refreshDashboard();
  };

  const addContextWord = async (word: string) => {
    if (!article) throw new Error('请先打开一篇文章');
    setError('');
    try {
      const updatedArticle = await window.echo.addWord(article.meta.id, word);
      setArticle(updatedArticle);
      await refreshDashboard();
      return updatedArticle;
    } catch (addError) {
      const message =
        addError instanceof Error
          ? addError.message
          : '加入单词失败，请稍后重试';
      setError(message);
      throw new Error(message);
    }
  };

  const saveSettings = async (nextSettings: AppSettings) => {
    const saved = await window.echo.saveSettings(nextSettings);
    setSettings(saved);
  };

  const updateSpeechRate = async (rate: number) => {
    const nextSettings = { ...settings, speechRate: rate };
    setSettings(nextSettings);
    await window.echo.saveSettings(nextSettings);
  };

  const loadingScreen = (
    <div className="loading-screen">
      <span className="brand-mark large">E</span>
      <div className="loading-line">
        <i />
      </div>
      <p>正在整理你的学习空间…</p>
    </div>
  );

  if (loading) return loadingScreen;

  if (error && !dashboard.dataPath) {
    return (
      <div className="fatal-error">
        <span className="brand-mark large">E</span>
        <h1>Echo 暂时无法启动</h1>
        <p>{error}</p>
        <button
          className="button primary"
          onClick={() => window.location.reload()}
          type="button"
        >
          重新载入
        </button>
      </div>
    );
  }

  const isPractice = view === 'sentence-practice' || view === 'word-practice';

  let content;
  if (view === 'library') {
    content = (
      <LibraryView
        dashboard={dashboard}
        onDelete={deleteArticle}
        onImport={() => {
          setError('');
          setView('import');
        }}
        onOpen={openArticle}
        onPracticeWords={() => openWordPractice()}
      />
    );
  } else if (view === 'import') {
    content = (
      <ImportView
        error={error}
        loading={importing}
        progress={parseProgress}
        onCancel={() => setView('library')}
        onChooseFolder={importArticleFolder}
        onChooseFile={() => window.echo.importTextFile()}
        onCopyPrompt={copyOfflinePrompt}
        onOpenSettings={() => setView('settings')}
        onSubmit={parseArticle}
      />
    );
  } else if (view === 'settings') {
    content = (
      <SettingsView
        dataPath={dashboard.dataPath}
        onBack={() => setView(article ? 'study' : 'library')}
        onSave={saveSettings}
        onShowDataFolder={() => window.echo.showDataFolder()}
        onTest={(llm: LlmSettings): Promise<ConnectionResult> =>
          window.echo.testConnection(llm)
        }
        settings={settings}
      />
    );
  } else if (view === 'study' && article) {
    content = (
      <StudyView
        article={article}
        fontScale={settings.fontScale}
        onAddWord={addContextWord}
        onBack={() => {
          stopAudio();
          setView('library');
        }}
        onPracticeSentences={() => {
          stopAudio();
          setView('sentence-practice');
        }}
        onPracticeWords={() => openWordPractice(article.meta.id)}
        onRateChange={updateSpeechRate}
        onSpeak={speakSentence}
        onSpeakWord={playWord}
        onStop={stop}
        speakingText={speakingText}
        speakingWord={speakingWord}
        speechRate={settings.speechRate}
      />
    );
  } else if (view === 'sentence-practice' && article) {
    content = (
      <SentencePracticeView
        article={article}
        onExit={() => {
          stopAudio();
          setView('study');
        }}
        onSave={saveProgress}
        onSpeak={speakSentence}
      />
    );
  } else if (view === 'word-practice') {
    content = (
      <WordPracticeView
        articleId={wordArticleId}
        entries={vocabulary}
        onExit={() => {
          stopAudio();
          setView(article ? 'study' : 'library');
        }}
        onSave={saveVocabulary}
        onSpeak={playWord}
      />
    );
  } else {
    content = null;
  }

  return (
    <div className={`app ${isPractice ? 'practice-mode' : ''}`}>
      {isPractice ? null : (
        <Sidebar
          active={view}
          dueWordCount={dashboard.dueWordCount}
          onNavigate={navigate}
        />
      )}
      <div className="app-content">{content}</div>
      {error && view !== 'import' ? (
        <div className="toast error" role="alert">
          <Icon name="close" />
          <span>{error}</span>
          <button onClick={() => setError('')} type="button">
            <Icon name="close" />
          </button>
        </div>
      ) : null}
    </div>
  );
}
