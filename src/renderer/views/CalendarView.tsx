import { CSSProperties, useEffect, useMemo, useState } from 'react';
import {
  buildYearCalendar,
  getMonthWeekPositions,
  toDateKey,
} from '../../shared/activity';
import {
  StudyActivityDay,
  StudyActivityOverview,
  StudyActivityRecord,
} from '../../shared/types';
import Icon from '../components/Icon';

interface Props {
  activity: StudyActivityOverview | null;
  loading: boolean;
  onCheckIn: () => Promise<void>;
  onYearChange: (year: number) => void | Promise<void>;
}

const monthNames = Array.from({ length: 12 }, (_, index) => `${index + 1}月`);

const emptyDay = (date: string): StudyActivityDay => ({
  date,
  sentenceCount: 0,
  wordCount: 0,
  sessionCount: 0,
  durationMs: 0,
  manualCheckIn: false,
  intensity: 0,
});

const formatDay = (dateKey: string) => {
  const [, month, day] = dateKey.split('-').map(Number);
  return `${month}月${day}日`;
};

const formatMinutes = (durationMs: number) =>
  durationMs > 0 ? Math.max(1, Math.round(durationMs / 60_000)) : 0;

const recordSummary = (record: StudyActivityRecord) => {
  if (record.kind === 'word') return `复习 ${record.wordCount} 词`;
  if (record.kind === 'sentence') return `精读 ${record.sentenceCount} 句`;
  return '手动打卡';
};

const recordIconName = (kind: StudyActivityRecord['kind']) => {
  if (kind === 'sentence') return 'book';
  if (kind === 'word') return 'brain';
  return 'check';
};

const checkInButtonLabel = (todayCheckedIn: boolean, checkingIn: boolean) => {
  if (todayCheckedIn) return '今日已打卡';
  if (checkingIn) return '正在打卡';
  return '完成今日打卡';
};

export default function CalendarView({
  activity,
  loading,
  onCheckIn,
  onYearChange,
}: Props) {
  const today = useMemo(() => toDateKey(new Date()), []);
  const currentYear = new Date().getFullYear();
  const [selectedDate, setSelectedDate] = useState(today);
  const [checkingIn, setCheckingIn] = useState(false);

  const calendarDays = useMemo(
    () => buildYearCalendar(activity?.year ?? currentYear),
    [activity?.year, currentYear],
  );
  const monthPositions = useMemo(
    () => getMonthWeekPositions(activity?.year ?? currentYear, calendarDays),
    [activity?.year, calendarDays, currentYear],
  );
  const dayMap = useMemo(
    () => new Map(activity?.days.map((day) => [day.date, day]) ?? []),
    [activity?.days],
  );
  const weekCount =
    (calendarDays[calendarDays.length - 1]?.weekIndex ?? 52) + 1;
  const selectedDay = dayMap.get(selectedDate) ?? emptyDay(selectedDate);
  const selectedIsToday = selectedDate === today;
  const selectedHasActivity = selectedDay.intensity > 0;
  const checkInLabel = checkInButtonLabel(
    activity?.todayCheckedIn ?? false,
    checkingIn,
  );

  useEffect(() => {
    if (!activity) return;
    if (activity.year === currentYear) {
      setSelectedDate(today);
      return;
    }
    setSelectedDate(
      activity.days[activity.days.length - 1]?.date ?? `${activity.year}-01-01`,
    );
  }, [activity, currentYear, today]);

  const checkIn = async () => {
    setCheckingIn(true);
    try {
      await onCheckIn();
      setSelectedDate(today);
    } finally {
      setCheckingIn(false);
    }
  };

  if (!activity && loading) {
    return (
      <main className="page calendar-page">
        <header className="page-header calendar-header">
          <div>
            <h1>学习足迹</h1>
            <p>每一次精读、默写和复习，都会在这里留下颜色。</p>
          </div>
        </header>
        <div className="calendar-loading" aria-label="正在加载学习足迹">
          <i />
          <i />
          <i />
        </div>
      </main>
    );
  }

  if (!activity) return null;

  const gridStyle = {
    '--calendar-weeks': weekCount,
  } as CSSProperties;

  return (
    <main className="page calendar-page">
      <header className="page-header calendar-header">
        <div>
          <h1>学习足迹</h1>
          <p>每一次精读、默写和复习，都会在这里留下颜色。</p>
        </div>
        <div className="year-switcher" aria-label="选择年份">
          <button
            aria-label="上一年"
            onClick={() => onYearChange(activity.year - 1)}
            type="button"
          >
            <Icon name="chevron-left" />
          </button>
          <strong>{activity.year} 年</strong>
          <button
            aria-label="下一年"
            disabled={activity.year >= currentYear}
            onClick={() => onYearChange(activity.year + 1)}
            type="button"
          >
            <Icon name="chevron-right" />
          </button>
        </div>
      </header>

      <section className="calendar-stats" aria-label="学习统计">
        <article>
          <span>
            <Icon name="flame" />
          </span>
          <div>
            <p>连续学习</p>
            <strong>
              {activity.currentStreak}
              <small>天</small>
            </strong>
          </div>
        </article>
        <article>
          <span>
            <Icon name="trend" />
          </span>
          <div>
            <p>最长连续</p>
            <strong>
              {activity.longestStreak}
              <small>天</small>
            </strong>
          </div>
        </article>
        <article>
          <span>
            <Icon name="calendar" />
          </span>
          <div>
            <p>今年打卡</p>
            <strong>
              {activity.activeDays}
              <small>天</small>
            </strong>
          </div>
        </article>
        <article>
          <span>
            <Icon name="pencil" />
          </span>
          <div>
            <p>累计练习</p>
            <strong>
              {activity.totalPractices}
              <small>次</small>
            </strong>
          </div>
        </article>
      </section>

      <section className="calendar-board">
        <div className="heatmap-region">
          <div className="heatmap-scroll">
            <div className="heatmap-layout">
              <div className="heatmap-months" style={gridStyle}>
                {monthPositions.map(({ month, weekIndex }) => (
                  <span key={month} style={{ gridColumnStart: weekIndex + 1 }}>
                    {monthNames[month]}
                  </span>
                ))}
              </div>
              <div className="heatmap-body">
                <div className="heatmap-weekdays" aria-hidden="true">
                  <span>一</span>
                  <span>三</span>
                  <span>五</span>
                </div>
                <div className="heatmap-grid" role="grid" style={gridStyle}>
                  {calendarDays.map((calendarDay) => {
                    const day =
                      dayMap.get(calendarDay.date) ??
                      emptyDay(calendarDay.date);
                    const description = `${formatDay(calendarDay.date)}，${
                      day.sessionCount
                    } 次学习，精读 ${day.sentenceCount} 句，复习 ${
                      day.wordCount
                    } 词`;
                    return (
                      <button
                        aria-label={description}
                        className={[
                          'heatmap-cell',
                          `level-${day.intensity}`,
                          calendarDay.inYear ? '' : 'outside-year',
                          calendarDay.date === today ? 'today' : '',
                          calendarDay.date === selectedDate ? 'selected' : '',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                        disabled={!calendarDay.inYear}
                        key={calendarDay.date}
                        onClick={() => setSelectedDate(calendarDay.date)}
                        role="gridcell"
                        title={description}
                        type="button"
                      />
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
          <div className="heatmap-legend" aria-label="学习强度图例">
            <span>少</span>
            {[0, 1, 2, 3, 4].map((level) => (
              <i className={`level-${level}`} key={level} />
            ))}
            <span>多</span>
          </div>
        </div>

        <aside className="calendar-day-detail" aria-live="polite">
          <p className={selectedIsToday ? 'is-today' : ''}>
            {formatDay(selectedDate)}
            {selectedIsToday ? ' · 今天' : ''}
          </p>
          <h2>
            {selectedHasActivity
              ? `完成 ${selectedDay.sessionCount} 次学习`
              : '还没有学习记录'}
          </h2>
          <dl>
            <div>
              <dt>
                <Icon name="book" />
                精读
              </dt>
              <dd>{selectedDay.sentenceCount} 句</dd>
            </div>
            <div>
              <dt>
                <Icon name="brain" />
                复习
              </dt>
              <dd>{selectedDay.wordCount} 词</dd>
            </div>
            <div>
              <dt>
                <Icon name="clock" />
                专注
              </dt>
              <dd>{formatMinutes(selectedDay.durationMs)} 分钟</dd>
            </div>
          </dl>
          {selectedIsToday ? (
            <button
              className="button primary calendar-check-in"
              disabled={activity.todayCheckedIn || checkingIn}
              onClick={checkIn}
              type="button"
            >
              <Icon name="check" />
              {checkInLabel}
            </button>
          ) : (
            <p className="past-day-note">选择其他日期，查看当日学习情况</p>
          )}
        </aside>
      </section>

      <section className="recent-activity">
        <div className="section-heading">
          <h2>最近记录</h2>
          <span>{activity.records.length} 条</span>
        </div>
        {activity.records.length ? (
          <div className="activity-list">
            {activity.records.map((record) => (
              <button
                className="activity-row"
                key={record.id}
                onClick={() => setSelectedDate(record.date)}
                type="button"
              >
                <time dateTime={record.date}>{formatDay(record.date)}</time>
                <span className="activity-kind">
                  <Icon name={recordIconName(record.kind)} />
                </span>
                <strong>{record.title}</strong>
                <span>{recordSummary(record)}</span>
                <span>专注 {formatMinutes(record.durationMs)} 分钟</span>
                <Icon name="chevron-right" />
              </button>
            ))}
          </div>
        ) : (
          <div className="activity-empty">
            <Icon name="calendar" />
            <p>这一年还没有记录，今天开始也不晚。</p>
          </div>
        )}
      </section>
    </main>
  );
}
