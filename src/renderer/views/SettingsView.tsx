import { FormEvent, useEffect, useState } from 'react';
import { AppSettings, ConnectionResult, LlmSettings } from '../../shared/types';
import Icon from '../components/Icon';

interface Props {
  settings: AppSettings;
  dataPath: string;
  onBack: () => void;
  onSave: (settings: AppSettings) => Promise<void>;
  onTest: (settings: LlmSettings) => Promise<ConnectionResult>;
  onShowDataFolder: () => Promise<void>;
}

export default function SettingsView({
  settings,
  dataPath,
  onBack,
  onSave,
  onTest,
  onShowDataFolder,
}: Props) {
  const [draft, setDraft] = useState(settings);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<ConnectionResult | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => setDraft(settings), [settings]);

  const setLlm = (key: keyof LlmSettings, value: string) => {
    setDraft((current) => ({
      ...current,
      llm: { ...current.llm, [key]: value },
    }));
    setResult(null);
    setSaved(false);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      await onSave(draft);
      setSaved(true);
    } finally {
      setSaving(false);
    }
  };

  const test = async () => {
    setTesting(true);
    setResult(null);
    try {
      setResult(await onTest(draft.llm));
    } finally {
      setTesting(false);
    }
  };

  return (
    <main className="page settings-page">
      <header className="page-header">
        <div>
          <button className="back-link" onClick={onBack} type="button">
            <Icon name="chevron-left" />
            返回
          </button>
          <h1>设置</h1>
          <p>连接你自己的模型服务，并调整全局学习体验。</p>
        </div>
      </header>
      <form className="settings-form" onSubmit={submit}>
        <section className="settings-section">
          <div className="settings-section-copy">
            <Icon name="connection" />
            <div>
              <h2>大模型连接</h2>
              <p>
                支持 OpenAI 兼容接口与 Anthropic Messages
                API。保存后立即用于新的文章解析。
              </p>
            </div>
          </div>
          <div className="settings-fields">
            <label htmlFor="api-url">
              <span>API URL</span>
              <input
                id="api-url"
                onChange={(event) => setLlm('apiUrl', event.target.value)}
                placeholder="https://api.openai.com/v1"
                value={draft.llm.apiUrl}
              />
              <small>可填写服务根地址或完整的请求端点</small>
            </label>
            <div className="field-grid">
              <label htmlFor="api-key">
                <span>API Key</span>
                <input
                  autoComplete="off"
                  id="api-key"
                  onChange={(event) => setLlm('apiKey', event.target.value)}
                  placeholder="••••••••••••••••"
                  type="password"
                  value={draft.llm.apiKey}
                />
              </label>
              <label htmlFor="model-name">
                <span>Model</span>
                <input
                  id="model-name"
                  onChange={(event) => setLlm('model', event.target.value)}
                  placeholder="gpt-4o-mini"
                  value={draft.llm.model}
                />
              </label>
            </div>
            <div className="connection-actions">
              <button
                className="button secondary"
                disabled={testing}
                onClick={test}
                type="button"
              >
                {testing ? (
                  <span className="spinner dark" />
                ) : (
                  <Icon name="connection" />
                )}
                {testing ? '正在测试…' : '测试连接'}
              </button>
              {result ? (
                <div
                  className={`connection-result ${result.ok ? 'success' : 'error'}`}
                >
                  <Icon name={result.ok ? 'check' : 'close'} />
                  <span>
                    {result.message}
                    {result.latencyMs ? ` · ${result.latencyMs}ms` : ''}
                  </span>
                </div>
              ) : null}
            </div>
          </div>
        </section>

        <section className="settings-section">
          <div className="settings-section-copy">
            <Icon name="sound" />
            <div>
              <h2>朗读与显示</h2>
              <p>系统语音在本地运行，离线时也可以继续朗读。</p>
            </div>
          </div>
          <div className="settings-fields">
            <label className="range-field" htmlFor="default-speech-rate">
              <span>
                默认语速 <strong>{draft.speechRate}×</strong>
              </span>
              <input
                id="default-speech-rate"
                max="1.5"
                min="0.5"
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    speechRate: Number(event.target.value),
                  }))
                }
                step="0.25"
                type="range"
                value={draft.speechRate}
              />
              <small>0.5× 慢速 — 1.5× 快速</small>
            </label>
            <label className="range-field" htmlFor="reader-font-scale">
              <span>
                阅读字号 <strong>{Math.round(draft.fontScale * 100)}%</strong>
              </span>
              <input
                id="reader-font-scale"
                max="1.3"
                min="0.85"
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    fontScale: Number(event.target.value),
                  }))
                }
                step="0.05"
                type="range"
                value={draft.fontScale}
              />
              <small>同时调整原文、音标与翻译的字号</small>
            </label>
          </div>
        </section>

        <section className="settings-section">
          <div className="settings-section-copy">
            <Icon name="folder" />
            <div>
              <h2>本地数据</h2>
              <p>文章、学习记录和设置均以 JSON 文件保存在这里。</p>
            </div>
          </div>
          <div className="data-location">
            <code>{dataPath}</code>
            <button
              className="button secondary"
              onClick={onShowDataFolder}
              type="button"
            >
              <Icon name="folder" />
              在文件管理器中打开
            </button>
          </div>
        </section>

        <footer className="settings-footer">
          {saved ? (
            <span className="saved-message">
              <Icon name="check" />
              已保存并立即生效
            </span>
          ) : (
            <span />
          )}
          <button className="button primary" disabled={saving} type="submit">
            {saving ? '保存中…' : '保存设置'}
          </button>
        </footer>
      </form>
    </main>
  );
}
