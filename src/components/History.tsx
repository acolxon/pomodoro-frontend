import type { Workspace } from '../hooks/useWorkspace';
import { HISTORY_LIMIT } from '../lib/types';
import { dateLabel, duration } from '../lib/utils';
import { Icon } from './Icon';
export function History({ workspace }: { workspace: Workspace }) {
  const {
    filter,
    setFilter,
    historyStats: stats,
    historyPage: page,
    historyLoading,
    historyError,
  } = workspace;
  return (
    <>
      <div className="history-stats">
        <div className="card history-stat">
          <span className="stat-icon green">
            <Icon name="clock" />
          </span>
          <span className="eyebrow">ВРЕМЯ В ФОКУСЕ</span>
          <strong>{duration(stats.totalFocusedSeconds)}</strong>
          <span className="muted">За выбранный период</span>
        </div>
        <div className="card history-stat">
          <span className="stat-icon peach">
            <Icon name="check" />
          </span>
          <span className="eyebrow">ЗАВЕРШЕНО</span>
          <strong>
            {stats.completedSessions}
            <small> сессий</small>
          </strong>
          <span className="muted">Каждый шаг имеет значение</span>
        </div>
        <div className="card history-stat">
          <span className="stat-icon sand">
            <Icon name="focus" />
          </span>
          <span className="eyebrow">СРЕДНИЙ ФОКУС</span>
          <strong>{duration(stats.averageFocusedSeconds)}</strong>
          <span className="muted">Отменённых сессий: {stats.cancelledSessions}</span>
        </div>
      </div>
      <section className="card history-card">
        <div className="card-heading">
          <h2>
            Твои сессии<span className="count-badge">{page.total}</span>
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
          <div className="segmented">
            {(['all', 'today', 'week', 'month'] as const).map((period, index) => (
              <button
                className={filter.period === period ? 'selected' : ''}
                onClick={() => setFilter({ ...filter, period, offset: 0 })}
                key={period}
              >
                {['Всё время', 'Сегодня', '7 дней', '30 дней'][index]}
              </button>
            ))}
          </div>
          <select
            aria-label="Фильтр по результату сессии"
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
        </div>
        {historyError ? (
          <div className="empty-state">
            <Icon name="info" size={28} />
            <h3>Не удалось загрузить историю</h3>
            <p>{historyError}</p>
            <button className="button secondary" onClick={workspace.refresh}>
              Попробовать ещё
            </button>
          </div>
        ) : historyLoading ? (
          <div className="table-loading" role="status">
            Загружаем сессии…
            <span className="loading-line" />
          </div>
        ) : page.items.length ? (
          <>
            <div className="history-table-wrap">
              <table className="history-table">
                <thead>
                  <tr>
                    <th>Задача</th>
                    <th>Когда</th>
                    <th>В фокусе</th>
                    <th>Результат</th>
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
                              Pomodoro · {Math.round(record.plannedDurationSeconds / 60)} минут
                            </span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="history-date">{dateLabel(record.startedAt)}</span>
                        <span className="history-time">
                          {new Date(record.startedAt).toLocaleTimeString('ru', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </td>
                      <td className="duration-cell">{duration(record.focusedSeconds)}</td>
                      <td>
                        <span className={`status-pill ${record.status}`}>
                          <Icon name={record.status === 'completed' ? 'check' : 'stop'} size={13} />
                          {record.status === 'completed' ? 'Завершена' : 'Отменена'}
                        </span>
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
            <p>
              Заверши фокус-сессию, и результат появится здесь. Можно также выбрать другой период.
            </p>
          </div>
        )}
      </section>
    </>
  );
}
