import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';
import {
  AppSettings,
  ArticleProgress,
  EchoApi,
  LlmSettings,
  ParseArticleInput,
  ParseArticleProgress,
  VocabularyEntry,
} from '../shared/types';

const echoApi: EchoApi = {
  getDashboard: () => ipcRenderer.invoke('echo:get-dashboard'),
  getStudyActivity: (year: number) =>
    ipcRenderer.invoke('echo:get-study-activity', year),
  checkInToday: () => ipcRenderer.invoke('echo:check-in-today'),
  getArticle: (articleId: string) =>
    ipcRenderer.invoke('echo:get-article', articleId),
  parseArticle: (input: ParseArticleInput) =>
    ipcRenderer.invoke('echo:parse-article', input),
  onParseProgress: (listener: (progress: ParseArticleProgress) => void) => {
    const handler = (
      _event: IpcRendererEvent,
      progress: ParseArticleProgress,
    ) => listener(progress);
    ipcRenderer.on('echo:parse-progress', handler);
    return () => ipcRenderer.removeListener('echo:parse-progress', handler);
  },
  importTextFile: () => ipcRenderer.invoke('echo:import-text-file'),
  importArticleFolder: () => ipcRenderer.invoke('echo:import-article-folder'),
  copyOfflinePrompt: () => ipcRenderer.invoke('echo:copy-offline-prompt'),
  deleteArticle: (articleId: string) =>
    ipcRenderer.invoke('echo:delete-article', articleId),
  saveProgress: (articleId: string, progress: ArticleProgress) =>
    ipcRenderer.invoke('echo:save-progress', articleId, progress),
  addWord: (articleId: string, word: string) =>
    ipcRenderer.invoke('echo:add-word', articleId, word),
  getVocabulary: () => ipcRenderer.invoke('echo:get-vocabulary'),
  saveVocabulary: (entries: VocabularyEntry[]) =>
    ipcRenderer.invoke('echo:save-vocabulary', entries),
  getSettings: () => ipcRenderer.invoke('echo:get-settings'),
  saveSettings: (settings: AppSettings) =>
    ipcRenderer.invoke('echo:save-settings', settings),
  testConnection: (settings: LlmSettings) =>
    ipcRenderer.invoke('echo:test-connection', settings),
  showDataFolder: () => ipcRenderer.invoke('echo:show-data-folder'),
};

contextBridge.exposeInMainWorld('echo', echoApi);

export type EchoHandler = typeof echoApi;
