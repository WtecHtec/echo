/* eslint global-require: off, no-console: off, promise/always-return: off */

/**
 * This module executes inside of electron's main process. You can start
 * electron renderer process from here and communicate with the other processes
 * through IPC.
 *
 * When running `npm run build` or `npm run build:main`, this file is compiled to
 * `./src/main.js` using webpack. This gives us some performance wins.
 */
import path from 'path';
import { promises as fs } from 'fs';
import {
  app,
  BrowserWindow,
  clipboard,
  shell,
  ipcMain,
  dialog,
} from 'electron';
import MenuBuilder from './menu';
import { resolveHtmlPath } from './util';
import EchoStorage from './storage';
import { testLlmConnection } from './llm';
import lookupWord from './word-lookup';
import { normalizeSelectedWord } from '../shared/words';
import {
  AppSettings,
  ArticleProgress,
  LlmSettings,
  ParseArticleInput,
  ParseArticleProgress,
  VocabularyEntry,
} from '../shared/types';

let mainWindow: BrowserWindow | null = null;
let storage: EchoStorage | null = null;

const getAssetPath = (...paths: string[]) =>
  app.isPackaged
    ? path.join(process.resourcesPath, 'assets', ...paths)
    : path.join(__dirname, '../../assets', ...paths);

if (!app.isPackaged && process.env.ECHO_QA_PORT) {
  app.commandLine.appendSwitch(
    'remote-debugging-port',
    process.env.ECHO_QA_PORT,
  );
}

if (process.env.NODE_ENV === 'production') {
  const sourceMapSupport = require('source-map-support');
  sourceMapSupport.install();
}

const isDebug =
  process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true';

if (isDebug) {
  require('electron-debug').default();
}

const installExtensions = async () => {
  const installer = require('electron-devtools-installer');
  const forceDownload = !!process.env.UPGRADE_EXTENSIONS;
  const extensions = ['REACT_DEVELOPER_TOOLS'];

  return installer
    .default(
      extensions.map((name) => installer[name]),
      forceDownload,
    )
    .catch(console.log);
};

const createWindow = async () => {
  if (isDebug) {
    await installExtensions();
  }

  mainWindow = new BrowserWindow({
    show: false,
    title: 'Echo',
    width: 1360,
    height: 900,
    minWidth: 980,
    minHeight: 680,
    backgroundColor: '#f5f1e8',
    icon: getAssetPath('icon.png'),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: app.isPackaged
        ? path.join(__dirname, 'preload.js')
        : path.join(__dirname, '../../.erb/dll/preload.js'),
    },
  });

  mainWindow.loadURL(resolveHtmlPath('index.html'));

  mainWindow.on('ready-to-show', () => {
    if (!mainWindow) {
      throw new Error('"mainWindow" is not defined');
    }
    if (process.env.START_MINIMIZED) {
      mainWindow.minimize();
    } else {
      mainWindow.show();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  const menuBuilder = new MenuBuilder(mainWindow);
  menuBuilder.buildMenu();

  // Open urls in the user's browser
  mainWindow.webContents.setWindowOpenHandler((edata) => {
    shell.openExternal(edata.url);
    return { action: 'deny' };
  });
};

/**
 * Add event listeners...
 */

const getStorage = () => {
  if (!storage) throw new Error('Echo 数据服务尚未初始化');
  return storage;
};

const registerIpcHandlers = () => {
  ipcMain.handle('echo:get-dashboard', () => getStorage().getDashboard());
  ipcMain.handle('echo:get-article', (_event, articleId: string) =>
    getStorage().getArticle(articleId),
  );
  ipcMain.handle('echo:parse-article', (event, input: ParseArticleInput) => {
    const reportProgress = (progress: ParseArticleProgress) => {
      if (!event.sender.isDestroyed()) {
        event.sender.send('echo:parse-progress', progress);
      }
    };
    return getStorage().parseArticle(input, reportProgress);
  });
  ipcMain.handle('echo:delete-article', (_event, articleId: string) =>
    getStorage().deleteArticle(articleId),
  );
  ipcMain.handle(
    'echo:save-progress',
    (_event, articleId: string, progress: ArticleProgress) =>
      getStorage().saveProgress(articleId, progress),
  );
  ipcMain.handle(
    'echo:add-word',
    async (_event, articleId: string, selectedWord: string) => {
      const normalizedWord = normalizeSelectedWord(selectedWord);
      const article = await getStorage().getArticle(articleId);
      if (
        article.words.some(
          (word) => word.word.toLocaleLowerCase() === normalizedWord,
        )
      ) {
        return article;
      }
      return getStorage().addWord(articleId, await lookupWord(normalizedWord));
    },
  );
  ipcMain.handle('echo:get-vocabulary', () => getStorage().getVocabulary());
  ipcMain.handle('echo:save-vocabulary', (_event, entries: VocabularyEntry[]) =>
    getStorage().saveVocabulary(entries),
  );
  ipcMain.handle('echo:get-settings', () => getStorage().getSettings());
  ipcMain.handle('echo:save-settings', (_event, settings: AppSettings) =>
    getStorage().saveSettings(settings),
  );
  ipcMain.handle('echo:test-connection', (_event, settings: LlmSettings) =>
    testLlmConnection(settings),
  );
  ipcMain.handle('echo:show-data-folder', async () => {
    const error = await shell.openPath(getStorage().getDataPath());
    if (error) throw new Error(error);
  });
  ipcMain.handle('echo:import-text-file', async () => {
    const result = await dialog.showOpenDialog({
      title: '导入英语文章',
      properties: ['openFile'],
      filters: [{ name: '文本文件', extensions: ['txt'] }],
    });
    if (result.canceled || !result.filePaths[0]) return null;
    const filePath = result.filePaths[0];
    const text = await fs.readFile(filePath, 'utf8');
    return { title: path.basename(filePath, path.extname(filePath)), text };
  });
  ipcMain.handle('echo:import-article-folder', async () => {
    const result = await dialog.showOpenDialog({
      title: '导入 Echo 文章文件夹',
      properties: ['openDirectory'],
    });
    if (result.canceled || !result.filePaths[0]) return null;
    return getStorage().importArticleFolder(result.filePaths[0]);
  });
  ipcMain.handle('echo:copy-offline-prompt', async () => {
    const prompt = await fs.readFile(
      getAssetPath('prompts', 'echo-web-llm-article-prompt.md'),
      'utf8',
    );
    clipboard.writeText(prompt);
  });
};

app.on('window-all-closed', () => {
  // Respect the OSX convention of having the application in memory even
  // after all windows have been closed
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app
  .whenReady()
  .then(async () => {
    storage = new EchoStorage(path.join(app.getPath('documents'), 'EchoData'));
    await storage.initialize();
    registerIpcHandlers();
    await createWindow();
    app.on('activate', () => {
      // On macOS it's common to re-create a window in the app when the
      // dock icon is clicked and there are no other windows open.
      if (mainWindow === null) createWindow();
    });
  })
  .catch(console.log);
