import { FormEvent, useEffect, useState } from 'react';
import { ParseArticleProgress, ParseArticleStage } from '../../shared/types';
import Icon from '../components/Icon';

interface Props {
  loading: boolean;
  error: string;
  progress: ParseArticleProgress | null;
  onCancel: () => void;
  onChooseFolder: () => Promise<boolean>;
  onChooseFile: () => Promise<{ title: string; text: string } | null>;
  onCopyPrompt: () => Promise<boolean>;
  onSubmit: (title: string, text: string) => Promise<void>;
  onOpenSettings: () => void;
}

export default function ImportView({
  loading,
  error,
  progress,
  onCancel,
  onChooseFolder,
  onChooseFile,
  onCopyPrompt,
  onSubmit,
  onOpenSettings,
}: Props) {
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [folderLoading, setFolderLoading] = useState(false);
  const [promptCopied, setPromptCopied] = useState(false);

  useEffect(() => {
    if (!loading) {
      setElapsedSeconds(0);
      return undefined;
    }
    const startedAt = Date.now();
    const timer = window.setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [loading]);

  const chooseFile = async () => {
    const imported = await onChooseFile();
    if (imported) {
      setTitle(imported.title);
      setText(imported.text);
    }
  };

  const chooseFolder = async () => {
    setFolderLoading(true);
    await onChooseFolder();
    setFolderLoading(false);
  };

  const copyPrompt = async () => {
    if (await onCopyPrompt()) setPromptCopied(true);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    await onSubmit(title, text);
  };

  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  const stageOrder: ParseArticleStage[] = [
    'preparing',
    'requesting',
    'processing',
    'saving',
  ];
  const normalizedStage =
    progress?.stage === 'repairing' ? 'processing' : progress?.stage;
  const activeStage = normalizedStage
    ? Math.max(0, stageOrder.indexOf(normalizedStage))
    : 0;
  const progressMessage =
    progress?.stage === 'requesting' && elapsedSeconds >= 12
      ? '模型仍在生成完整结果，长文章通常需要更久'
      : (progress?.message ?? '正在准备文章分析');
  const analysisSteps = [
    '检查文章与本地缓存',
    '等待模型生成分析',
    '校验并自动修复格式',
    '保存学习材料',
  ];

  return (
    <main className="page import-page">
      <button className="back-link" onClick={onCancel} type="button">
        <Icon name="chevron-left" />
        返回文章
      </button>
      <div className="import-layout">
        <section className="import-intro">
          <h1>把一篇文章，变成你的学习材料。</h1>
          <p>
            Echo 会调用你配置的大模型生成分句、整句音标、中文翻译和语境词义。
            解析完成后，其余学习过程都可离线进行。
          </p>
          <div className="privacy-note">
            <Icon name="key" />
            <div>
              <strong>你的数据仍属于你</strong>
              <span>文章仅发送至你配置的 API，解析结果保存在本地。</span>
            </div>
          </div>
          <div className="offline-import-card">
            <span className="section-label">无需配置 API</span>
            <h2>使用任意 Web 大模型</h2>
            <p>
              复制专用 Prompt，让浏览器里的大模型生成四个 JSON
              文件，再将整个文件夹导入 Echo。
            </p>
            <div>
              <button
                className="button secondary compact"
                onClick={copyPrompt}
                type="button"
              >
                <Icon name={promptCopied ? 'check' : 'spark'} />
                {promptCopied ? 'Prompt 已复制' : '复制生成 Prompt'}
              </button>
              <button
                className="button secondary compact"
                disabled={folderLoading}
                onClick={chooseFolder}
                type="button"
              >
                {folderLoading ? (
                  <span className="spinner dark" />
                ) : (
                  <Icon name="folder" />
                )}
                导入文章文件夹
              </button>
            </div>
            <small>
              文件夹需包含 meta.json、sentences.json、words.json 和
              progress.json。
            </small>
          </div>
        </section>
        <form className="import-form" onSubmit={submit}>
          <div className="form-topline">
            <h2>导入文章</h2>
            <button
              className="button secondary compact"
              onClick={chooseFile}
              type="button"
            >
              <Icon name="upload" />
              选择 TXT
            </button>
          </div>
          <label htmlFor="article-title">
            <span>文章标题</span>
            <input
              id="article-title"
              onChange={(event) => setTitle(event.target.value)}
              placeholder="例如：The Power of Deep Work"
              value={title}
            />
          </label>
          <label className="text-field" htmlFor="article-text">
            <span>英文原文</span>
            <textarea
              id="article-text"
              onChange={(event) => setText(event.target.value)}
              placeholder="在这里粘贴英文文章…"
              value={text}
            />
            <small className={wordCount > 3000 ? 'error-text' : ''}>
              {wordCount.toLocaleString()} / 3,000 词
            </small>
          </label>
          {loading ? (
            <section
              aria-live="polite"
              aria-label="文章分析进度"
              className="analysis-progress"
            >
              <div className="analysis-progress-head">
                <span className="analysis-pulse" />
                <div>
                  <strong>{progressMessage}</strong>
                  <span>
                    已用时 {elapsedSeconds} 秒
                    {elapsedSeconds >= 12 ? ' · 请保持窗口开启' : ''}
                  </span>
                </div>
              </div>
              <ol>
                {analysisSteps.map((step, index) => {
                  const isComplete =
                    progress?.stage === 'complete' || index < activeStage;
                  const isActive =
                    progress?.stage !== 'complete' && index === activeStage;
                  return (
                    <li
                      className={[
                        isComplete ? 'complete' : '',
                        isActive ? 'active' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      key={step}
                    >
                      <i>{isComplete ? '✓' : index + 1}</i>
                      <span>{step}</span>
                    </li>
                  );
                })}
              </ol>
              <p>这里展示的是处理阶段，不会显示或保存模型的内部推理内容。</p>
            </section>
          ) : null}
          {error ? (
            <div className="inline-error" role="alert">
              <Icon name="close" />
              <span>{error}</span>
              {error.includes('设置') ? (
                <button onClick={onOpenSettings} type="button">
                  前往设置
                </button>
              ) : null}
            </div>
          ) : null}
          <button
            className="button primary submit-import"
            disabled={loading || !text.trim() || wordCount > 3000}
            type="submit"
          >
            {loading ? (
              <>
                <span className="spinner" />
                分析中 · {elapsedSeconds} 秒
              </>
            ) : (
              <>
                <Icon name="spark" />
                生成学习材料
              </>
            )}
          </button>
        </form>
      </div>
    </main>
  );
}
