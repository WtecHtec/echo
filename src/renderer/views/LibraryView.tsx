import { DashboardData } from '../../shared/types';
import Icon from '../components/Icon';

interface Props {
  dashboard: DashboardData;
  onOpen: (articleId: string) => void;
  onImport: () => void;
  onDelete: (articleId: string) => void;
  onPracticeWords: () => void;
}

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('zh-CN', {
    month: 'short',
    day: 'numeric',
  }).format(new Date(value));

export default function LibraryView({
  dashboard,
  onOpen,
  onImport,
  onDelete,
  onPracticeWords,
}: Props) {
  const latest = dashboard.articles[0];
  return (
    <main className="page library-page">
      <header className="page-header library-heading">
        <div>
          <h1>你的文章</h1>
          <p>从一篇你真正感兴趣的文章开始，读懂、听清，再亲手写出来。</p>
        </div>
        <button className="button primary" onClick={onImport} type="button">
          <Icon name="plus" />
          导入文章
        </button>
      </header>

      <section className="continue-band">
        <div className="continue-copy">
          <span className="section-label">继续学习</span>
          <h2>{latest?.title ?? '导入你的第一篇文章'}</h2>
          <p>
            {latest?.preview ??
              '粘贴英语文本或选择本地 TXT 文件，Echo 会把它整理成可精读、可默写的学习材料。'}
          </p>
          {latest ? (
            <button
              className="button light"
              onClick={() => onOpen(latest.id)}
              type="button"
            >
              打开文章
              <Icon name="chevron-right" />
            </button>
          ) : (
            <button className="button light" onClick={onImport} type="button">
              立即导入
              <Icon name="chevron-right" />
            </button>
          )}
        </div>
        <div className="continue-progress" aria-label="学习概览">
          <div className="progress-orbit">
            <strong>{latest?.progressPercent ?? 0}%</strong>
            <span>文章进度</span>
          </div>
          <div className="continue-stat">
            <strong>{dashboard.dueWordCount}</strong>
            <span>个单词待复习</span>
            <button onClick={onPracticeWords} type="button">
              开始复习
            </button>
          </div>
        </div>
      </section>

      <section className="article-section">
        <div className="section-heading">
          <h2>全部文章</h2>
          <span>{dashboard.articles.length} 篇</span>
        </div>
        <div className="article-list">
          {dashboard.articles.map((article) => (
            <article className="article-row" key={article.id}>
              <button
                className="article-main"
                onClick={() => onOpen(article.id)}
                type="button"
              >
                <span className="article-monogram">
                  {article.title.slice(0, 1).toLocaleUpperCase()}
                </span>
                <span className="article-text">
                  <strong>{article.title}</strong>
                  <span>{article.preview}</span>
                </span>
              </button>
              <div className="article-meta">
                <span>{article.sentenceCount} 句</span>
                <span>{article.wordCount} 词</span>
                <span>{formatDate(article.importedAt)}</span>
                <div className="mini-progress">
                  <i style={{ width: `${article.progressPercent}%` }} />
                </div>
                <strong>{article.progressPercent}%</strong>
                <button
                  aria-label={`删除 ${article.title}`}
                  className="icon-button quiet danger-hover"
                  onClick={() => onDelete(article.id)}
                  type="button"
                >
                  <Icon name="trash" />
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
