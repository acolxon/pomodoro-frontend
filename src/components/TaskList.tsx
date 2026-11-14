import { useState } from 'react';
import type { Workspace } from '../hooks/useWorkspace';
import type { Task } from '../lib/types';
import { Icon } from './Icon';
export function TaskList({
  workspace,
  compact = false,
  onAdd,
  onEdit,
  onDelete,
}: {
  workspace: Workspace;
  compact?: boolean;
  onAdd: () => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
}) {
  const [filter, setFilter] = useState<'open' | 'all' | 'completed'>('open');
  const [search, setSearch] = useState('');
  const { tasks, pending, timer } = workspace;
  const active = tasks.find((task) => task.status === 'in_progress');
  const open = tasks.filter((task) => task.status !== 'completed');
  const completed = tasks.filter((task) => task.status === 'completed');
  const filtered = (
    compact
      ? open
      : tasks.filter(
          (task) =>
            filter === 'all' ||
            (filter === 'completed' ? task.status === 'completed' : task.status !== 'completed'),
        )
  ).filter((task) => task.title.toLocaleLowerCase().includes(search.toLocaleLowerCase()));
  const sorted = [...filtered].sort(
    (a, b) =>
      Number(b.status === 'in_progress') - Number(a.status === 'in_progress') ||
      b.createdAt.localeCompare(a.createdAt),
  );
  const visible = compact ? sorted.slice(0, 4) : sorted;
  const changing = pending.includes('task-status');
  return (
    <section
      className={`card tasks-card ${compact ? 'compact' : 'task-page-card'}`}
      aria-label="Личные задачи"
    >
      <div className="card-heading">
        <div>
          <div className="eyebrow">ОДНА ЗАДАЧА ЗА РАЗ</div>
          <h2>
            {compact ? 'Твой список' : 'Все твои задачи'}
            <span className="count-badge">{open.length}</span>
          </h2>
        </div>
        <button className="icon-button soft" onClick={onAdd} aria-label="Добавить задачу">
          <Icon name="plus" />
        </button>
      </div>
      {!compact && (
        <div className="task-toolbar">
          <div className="segmented">
            <button
              className={filter === 'open' ? 'selected' : ''}
              onClick={() => setFilter('open')}
            >
              В работе <span>{open.length}</span>
            </button>
            <button
              className={filter === 'completed' ? 'selected' : ''}
              onClick={() => setFilter('completed')}
            >
              Готово <span>{completed.length}</span>
            </button>
            <button className={filter === 'all' ? 'selected' : ''} onClick={() => setFilter('all')}>
              Все
            </button>
          </div>
          <input
            className="search-input"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Найти задачу…"
            aria-label="Поиск по названию задачи"
          />
        </div>
      )}
      <div className="task-list">
        {visible.map((task) => (
          <div
            className={`task-row ${task.status === 'in_progress' ? 'active' : ''} ${task.status === 'completed' ? 'done' : ''}`}
            key={task.id}
          >
            <button
              className={`task-checkbox ${task.status === 'completed' ? 'checked' : ''}`}
              disabled={changing}
              aria-label={
                task.status === 'completed'
                  ? `Вернуть задачу «${task.title}» в список`
                  : `Завершить задачу «${task.title}»`
              }
              onClick={() =>
                void workspace.setTaskStatus(
                  task.id,
                  task.status === 'completed' ? 'todo' : 'completed',
                )
              }
            >
              {task.status === 'completed' && <Icon name="check" size={14} />}
            </button>
            <div className="task-text">
              <button className="task-title" onClick={() => onEdit(task)}>
                {task.title}
              </button>
              {task.status === 'in_progress' && (
                <span className="active-label">
                  <span className="tiny-dot" />В фокусе
                  {timer?.phase === 'focus' && timer.status !== 'idle'
                    ? ' · для следующей сессии'
                    : ''}
                </span>
              )}
              {!compact && task.description && (
                <p className="task-description">{task.description}</p>
              )}
            </div>
            <div className="task-actions">
              {task.status !== 'completed' && (
                <button
                  className={`icon-button task-focus ${task.status === 'in_progress' ? 'is-active' : ''}`}
                  disabled={changing || (!!active && active.id !== task.id)}
                  title={
                    task.status === 'in_progress'
                      ? 'Отложить активную задачу'
                      : active
                        ? 'Сначала отложите активную задачу'
                        : 'Выбрать для фокуса'
                  }
                  aria-label={
                    task.status === 'in_progress'
                      ? `Отложить задачу «${task.title}»`
                      : `Выбрать задачу «${task.title}» для фокуса`
                  }
                  onClick={() =>
                    void workspace.setTaskStatus(
                      task.id,
                      task.status === 'in_progress' ? 'todo' : 'in_progress',
                    )
                  }
                >
                  <Icon name={task.status === 'in_progress' ? 'pause' : 'play'} size={16} />
                </button>
              )}
              {!compact && (
                <>
                  <button
                    className="icon-button"
                    onClick={() => onEdit(task)}
                    aria-label={`Изменить задачу «${task.title}»`}
                  >
                    <Icon name="edit" size={16} />
                  </button>
                  <button
                    className="icon-button delete-button"
                    onClick={() => onDelete(task)}
                    aria-label={`Удалить задачу «${task.title}»`}
                  >
                    <Icon name="trash" size={16} />
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
      {!visible.length && (
        <div className="empty-state small">
          <span className="empty-icon">
            <Icon name={filter === 'completed' ? 'check' : 'leaf'} size={26} />
          </span>
          <h3>
            {search
              ? 'Задача не нашлась'
              : filter === 'completed'
                ? 'Всё ещё впереди'
                : 'Свободное место для идей'}
          </h3>
          <p>
            {search
              ? 'Попробуй другое название.'
              : filter === 'completed'
                ? 'Завершённые задачи появятся здесь.'
                : 'Добавь одну задачу, с которой хочется начать.'}
          </p>
        </div>
      )}
      <button className="add-task-button" onClick={onAdd}>
        <Icon name="plus" size={17} />
        Добавить задачу
      </button>
      {compact && (
        <div className="task-card-foot">
          <Icon name="target" size={15} />
          <span>
            {open.length > 4 ? `Ещё ${open.length - 4} в разделе «Задачи». ` : ''}Выбери{' '}
            <Icon name="play" size={12} /> задачу для следующего фокуса.
          </span>
        </div>
      )}
    </section>
  );
}
