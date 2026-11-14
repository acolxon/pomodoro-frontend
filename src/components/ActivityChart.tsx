import type { Workspace } from '../hooks/useWorkspace';
import { duration } from '../lib/utils';
import { Icon } from './Icon';
export function ActivityChart({
  workspace,
  compact = false,
  onHistory,
}: {
  workspace: Workspace;
  compact?: boolean;
  onHistory?: () => void;
}) {
  const { week, demo, loadError } = workspace;
  const maximum = Math.max(1500, ...week.map((day) => day.seconds));
  const sum = week.reduce((total, day) => total + day.seconds, 0);
  return (
    <section
      className={`card activity-card ${compact ? 'compact' : ''}`}
      aria-label="Активность за неделю"
    >
      <div className="card-heading">
        <h2>
          <Icon name="sun" size={20} />
          Активность за неделю
        </h2>
        <strong className="activity-total">{week.length ? duration(sum) : '—'}</strong>
      </div>
      {!week.length ? (
        <div className="chart-placeholder" role="status">
          {loadError && !demo ? 'Статистика пока недоступна' : 'Загружаем активность…'}
        </div>
      ) : (
        <div
          className="activity-chart"
          role="img"
          aria-label={week
            .map(
              (day) =>
                `${new Date(day.date).toLocaleDateString('ru', { weekday: 'long' })}: ${duration(day.seconds)}`,
            )
            .join('. ')}
        >
          {week.map((day, index) => (
            <div className={`chart-column ${index === 6 ? 'today' : ''}`} key={day.date}>
              <div className="bar-track">
                <div
                  className="chart-bar"
                  style={{ height: `${Math.max(3, (day.seconds / maximum) * 100)}%` }}
                >
                  <span>{duration(day.seconds)}</span>
                </div>
              </div>
              <span className="chart-label">
                {new Date(day.date).toLocaleDateString('ru', { weekday: 'short' })}
              </span>
            </div>
          ))}
        </div>
      )}
      <div className="chart-foot">
        <span>
          {!week.length || sum
            ? 'Все комнаты · последние 7 дней'
            : 'Пока нет сессий · последние 7 дней'}
        </span>
        {onHistory && (
          <button className="text-button" onClick={onHistory}>
            История
            <Icon name="arrow" size={15} />
          </button>
        )}
      </div>
    </section>
  );
}
