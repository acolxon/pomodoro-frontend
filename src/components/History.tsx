import type { Workspace } from '../hooks/useWorkspace';
import { HISTORY_LIMIT } from '../lib/types';
import { dateLabel, duration } from '../lib/utils';
import { Icon } from './Icon';
import { ActivityChart } from './ActivityChart';
export function History({ workspace }: { workspace: Workspace }) {
  const {
    filter,
    setFilter,
    historyStats: stats,
    historyPage: page,
    historyLoading,
    historyError,
    historyRooms,
    historyRoomsError,
  } = workspace;
  const unavailable = historyLoading || !!historyError;
  return (
    <>
      <div className="history-overview">
        <div className="history-stats" aria-busy={historyLoading}>
          <div className="card history-stat">
            <span className="stat-icon sand">
              <Icon name="history" />
            </span>
            <span className="eyebrow">ВСЕГО СЕССИЙ</span>
            <strong>{unavailable ? '—' : stats.totalSessions}</strong>
            <span className="muted">За выбранный период</span>
          </div>
          <div className="card history-stat">
            <span className="stat-icon green">
              <Icon name="clock" />
            </span>
            <span className="eyebrow">ВРЕМЯ В ФОКУСЕ</span>
            <strong>{unavailable ? '—' : duration(stats.totalFocusedSeconds)}</strong>
            <span className="muted">Включая время до отмены</span>
          </div>
          <div className="card history-stat">
            <span className="stat-icon peach">
              <Icon name="check" />
            </span>
            <span className="eyebrow">ЗАВЕРШЕНО</span>
            <strong>{unavailable ? '—' : stats.completedSessions}</strong>
            <span className="muted">Отменено: {unavailable ? '—' : stats.cancelledSessions}</span>
          </div>
        </div>
        <ActivityChart workspace={workspace} />
      </div>
      <section className="card history-card">
        <div className="card-heading">
          <h2>
            <Icon name="history" size={21} />
            Твои сессии<span className="count-badge">{historyLoading ? '…' : page.total}</span>
          </h2>
          <button
            className="icon-button"
            onClick={workspace.refresh}
            disabled={historyLoading}
            aria-label="Обновить историю"
          >
            <Icon name="refresh" />
          </button>
        </div>
        <div className="history-toolbar">
          <div className="segmented" aria-label="Период истории">
            {(['all', 'today', 'week', 'month', 'custom'] as const).map((period, i) => (
              <button
                aria-pressed={filter.period === period}
                className={filter.period === period ? 'selected' : ''}
                onClick={() => setFilter({ ...filter, period, offset: 0 })}
                key={period}
              >
                {['Всё время', 'Сегодня', '7 дней', '30 дней', 'Свои даты'][i]}
              </button>
            ))}
          </div>
          <div className="history-selects">
            <label>
              Результат
              <select
                value={filter.status}
                onChange={(event) =>
                  setFilter({
                    ...filter,
                    status: event.target.value as typeof filter.status,
                    offset: 0,
                  })
                }
              >
                <option value="">Все результаты</option>
                <option value="completed">Завершённые</option>
                <option value="cancelled">Отменённые</option>
              </select>
            </label>
            <label>
              Комната
              <select
                value={filter.roomId || ''}
                disabled={!!historyRoomsError}
                onChange={(event) =>
                  setFilter({ ...filter, roomId: event.target.value, offset: 0 })
                }
              >
                <option value="">Все комнаты</option>
                {historyRooms.map((room) => (
                  <option value={room.id} key={room.id}>
                    {room.name || `Комната ${room.id.slice(0, 8)}`}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {filter.period === 'custom' && (
            <div className="date-range">
              <label>
                С даты
                <input
                  type="date"
                  value={filter.from || ''}
                  max={filter.to || undefined}
                  onChange={(event) =>
                    setFilter({ ...filter, from: event.target.value, offset: 0 })
                  }
                />
              </label>
              <label>
                По дату включительно
                <input
                  type="date"
                  value={filter.to || ''}
                  min={filter.from || undefined}
                  onChange={(event) => setFilter({ ...filter, to: event.target.value, offset: 0 })}
                />
              </label>
            </div>
          )}
        </div>
        {historyRoomsError && (
          <p className="form-error" role="alert">
            {historyRoomsError}
            <button className="text-button" onClick={workspace.refresh}>
              Повторить
            </button>
          </p>
        )}
        {historyError ? (
          <div className="empty-state" role="alert">
            <Icon name="info" size={28} />
            <h3>История пока недоступна</h3>
            <p>{historyError}</p>
            <button className="button secondary" onClick={workspace.refresh}>
              Попробовать ещё
            </button>
          </div>
        ) : historyLoading ? (
          <div className="table-loading" role="status">
            <span className="loading-spinner" />
            Загружаем сессии…
          </div>
        ) : page.items.length ? (
          <>
            <div className="history-table-wrap">
              <table className="history-table">
                <thead>
                  <tr>
                    <th scope="col">Задача</th>
                    <th scope="col">Комната</th>
                    <th scope="col">Дата и время</th>
                    <th scope="col">В фокусе</th>
                    <th scope="col">Результат</th>
                    <th scope="col">Награда</th>
                  </tr>
                </thead>
                <tbody>
                  {page.items.map((record) => (
                    <tr key={record.id}>
                      <td>
                        <div className="history-task-name">
                          <span
                            className={`history-row-icon ${record.status === 'completed' ? 'green' : 'sand'}`}
                          >
                            <Icon
                              name={record.status === 'completed' ? 'leaf' : 'pause'}
                              size={17}
                            />
                          </span>
                          <div>
                            <strong>{record.taskTitle || 'Фокус без задачи'}</strong>
                            <span>
                              Pomodoro · план {Math.round(record.plannedDurationSeconds / 60)} мин
                            </span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="history-room-name">
                          {record.roomName ||
                            (record.roomId
                              ? `Комната ${record.roomId.slice(0, 8)}`
                              : 'Удалённая комната')}
                        </span>
                      </td>
                      <td>
                        <time
                          dateTime={record.startedAt}
                          title={new Date(record.startedAt).toLocaleString('ru')}
                        >
                          <span className="history-date">{dateLabel(record.startedAt)}</span>
                          <span className="history-time">
                            {new Date(record.startedAt).toLocaleTimeString('ru', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                            –
                            {new Date(record.endedAt).toLocaleTimeString('ru', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </time>
                      </td>
                      <td className="duration-cell">{duration(record.focusedSeconds)}</td>
                      <td>
                        <span className={`status-pill ${record.status}`}>
                          <Icon name={record.status === 'completed' ? 'check' : 'stop'} size={13} />
                          {record.status === 'completed' ? 'Завершена' : 'Отменена'}
                        </span>
                      </td>
                      <td className="history-reward">
                        {(record.xpEarned ?? 0) > 0 ? (
                          <>
                            <strong>+{record.xpEarned} XP</strong>
                            <span>+{record.coinsEarned} монет</span>
                            {record.teamBonus && <small>Командный бонус</small>}
                          </>
                        ) : (
                          <span
                            title={
                              workspace.demo
                                ? 'В локальном демо награды не начисляются'
                                : 'Для этой сессии нет начисленной награды'
                            }
                          >
                            —
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="pagination">
              <span>
                {filter.offset + 1}–{Math.min(filter.offset + HISTORY_LIMIT, page.total)} из{' '}
                {page.total} сессий
              </span>
              <div>
                <button
                  className="icon-button"
                  disabled={filter.offset === 0}
                  onClick={() =>
                    setFilter({ ...filter, offset: Math.max(0, filter.offset - HISTORY_LIMIT) })
                  }
                  aria-label="Предыдущая страница"
                >
                  <Icon name="arrowLeft" size={18} />
                </button>
                <button
                  className="icon-button"
                  disabled={filter.offset + HISTORY_LIMIT >= page.total}
                  onClick={() => setFilter({ ...filter, offset: filter.offset + HISTORY_LIMIT })}
                  aria-label="Следующая страница"
                >
                  <Icon name="arrow" size={18} />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="empty-state">
            <span className="empty-icon">
              <Icon name="history" size={28} />
            </span>
            <h3>Здесь начинается твоя история</h3>
            <p>Заверши фокус-сессию или выбери другой период и комнату.</p>
          </div>
        )}
      </section>
    </>
  );
}
