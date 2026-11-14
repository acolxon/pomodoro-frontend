import type { HistoryFilter, HistoryRecord, HistoryStats, Pomodoro } from './types';
export function initials(name: string) {
  return name.slice(0, 2).toUpperCase();
}
export function clock(seconds: number) {
  const value = Math.max(0, Math.ceil(seconds));
  return `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`;
}
export function duration(seconds: number) {
  if (seconds < 60) return `${Math.floor(seconds)} сек`;
  const minutes = Math.floor(seconds / 60);
  return minutes >= 60
    ? `${Math.floor(minutes / 60)} ч ${minutes % 60 ? `${minutes % 60} мин` : ''}`.trim()
    : `${minutes} мин`;
}
export function remaining(state: Pomodoro | null, offset: number, now = Date.now()) {
  if (!state || state.status === 'idle') return 1500;
  if (state.status === 'paused') return state.remainingSeconds ?? 0;
  return state.endsAt ? Math.max(0, (new Date(state.endsAt).getTime() - (now + offset)) / 1000) : 0;
}
export function filterFrom(period: HistoryFilter['period']): string | undefined {
  if (period === 'all' || period === 'custom') return undefined;
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  if (period === 'week') date.setDate(date.getDate() - 6);
  if (period === 'month') date.setDate(date.getDate() - 29);
  return date.toISOString();
}
export function historyParams(filter: HistoryFilter) {
  const params = new URLSearchParams();
  const from =
    filter.period === 'custom' && filter.from
      ? new Date(`${filter.from}T00:00:00`).toISOString()
      : filterFrom(filter.period);
  if (from) params.set('from', from);
  if (filter.period === 'custom' && filter.to) {
    const end = new Date(`${filter.to}T00:00:00`);
    end.setDate(end.getDate() + 1);
    params.set('to', end.toISOString());
  }
  if (filter.status) params.set('status', filter.status);
  if (filter.roomId) params.set('roomId', filter.roomId);
  return params;
}
export function historyFilterError(filter: HistoryFilter): string | null {
  if (filter.period !== 'custom') return null;
  for (const value of [filter.from, filter.to]) {
    if (!value) continue;
    const date = new Date(`${value}T00:00:00`);
    const [year, month, day] = value.split('-').map(Number);
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
      !Number.isFinite(date.getTime()) ||
      date.getFullYear() !== year ||
      date.getMonth() + 1 !== month ||
      date.getDate() !== day
    )
      return 'Укажите корректные даты.';
  }
  if (filter.from && filter.to && filter.from > filter.to)
    return 'Начало периода должно быть не позже окончания.';
  return null;
}
export function summarize(records: HistoryRecord[]): HistoryStats {
  const totalFocusedSeconds = records.reduce((sum, record) => sum + record.focusedSeconds, 0);
  return {
    totalSessions: records.length,
    completedSessions: records.filter((record) => record.status === 'completed').length,
    cancelledSessions: records.filter((record) => record.status === 'cancelled').length,
    totalFocusedSeconds,
    totalFocusedMinutes: Math.floor(totalFocusedSeconds / 60),
    averageFocusedSeconds: records.length ? Math.round(totalFocusedSeconds / records.length) : 0,
  };
}
export const emptyStats: HistoryStats = summarize([]);
export function dateLabel(value: string) {
  const date = new Date(value);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return 'Сегодня';
  if (date.toDateString() === yesterday.toDateString()) return 'Вчера';
  return date.toLocaleDateString('ru', {
    day: 'numeric',
    month: 'long',
    year: date.getFullYear() === today.getFullYear() ? undefined : 'numeric',
  });
}
export function errorText(error: unknown) {
  return error instanceof Error ? error.message : 'Что-то пошло не так. Попробуйте ещё раз.';
}
