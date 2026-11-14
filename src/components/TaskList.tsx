import { useLayoutEffect, useMemo, useState } from 'react';
import type { Workspace } from '../hooks/useWorkspace';
import type { Task } from '../lib/types';
import { Icon } from './Icon';
import { dateLabel } from '../lib/utils';
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
  const [filter, setFilter] = useState<'open' | 'all' | 'completed'>('all');
  const [search, setSearch] = useState('');
  const { tasks, pending, timer } = workspace;
  const active = tasks.find((task) => task.status === 'in_progress');
  const open = tasks.filter((task) => task.status !== 'completed');
  const completed = tasks.filter((task) => task.status === 'completed');
  const visible = useMemo(() => {
    const filtered = tasks
      .filter(
        (task) =>
          (compact
            ? task.status !== 'completed'
            : filter === 'all' ||
              (filter === 'completed'
                ? task.status === 'completed'
                : task.status !== 'completed')) &&
          task.title.toLocaleLowerCase().includes(search.toLocaleLowerCase()),
      )
      .sort(
        (a, b) =>
          Number(b.status === 'in_progress') - Number(a.status === 'in_progress') ||
          b.createdAt.localeCompare(a.createdAt),
      );
    return compact ? filtered.slice(0, 4) : filtered;
  }, [tasks, compact, filter, search]);
  const [rows, setRows] = useState(() => visible.map((task) => ({ task, exiting: false })));
  useLayoutEffect(() => {
    // Keep only genuinely deleted records briefly for their exit animation.
    // Filtering and status changes always show the current server result immediately.
    setRows((previous) => [
      ...visible.map((task) => ({ task, exiting: false })),
      ...previous
        .filter((row) => !tasks.some((task) => task.id === row.task.id))
        .map((row) => ({ ...row, exiting: true })),
    ]);
    const timeout = window.setTimeout(
      () => setRows(visible.map((task) => ({ task, exiting: false }))),
      180,
    );
    return () => window.clearTimeout(timeout);
  }, [visible, tasks]);
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
            <span className="count-badge">{compact ? open.length : tasks.length}</span>
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
              className={filter === 'all' ? 'selected' : ''}
              aria-pressed={filter === 'all'}
              onClick={() => setFilter('all')}
            >
              Все
            </button>
            <button
              className={filter === 'open' ? 'selected' : ''}
              onClick={() => setFilter('open')}
              aria-pressed={filter === 'open'}
            >
              Активные <span>{open.length}</span>
            </button>
            <button
              className={filter === 'completed' ? 'selected' : ''}
              onClick={() => setFilter('completed')}
              aria-pressed={filter === 'completed'}
            >
              Выполненные <span>{completed.length}</span>
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
      {workspace.loading && !workspace.demo ? (
        <div className="table-loading" role="status">
          Загружаем задачи…
        </div>
      ) : workspace.loadError && !workspace.demo && !tasks.length ? (
        <div className="empty-state">
          <p>{workspace.loadError}</p>
          <button className="button secondary" onClick={workspace.refresh}>
            Повторить
          </button>
        </div>
      ) : (
        <div className="task-list">
          {rows.map(({ task, exiting }) => (
            <div
              className={`task-row ${task.status === 'in_progress' ? 'active' : ''} ${task.status === 'completed' ? 'done' : ''} ${exiting ? 'task-exiting' : ''}`}
              inert={exiting}
              aria-hidden={exiting || undefined}
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
                    <span className="tiny-dot" />
                    {timer?.phase === 'focus' && timer.status !== 'idle'
                      ? 'Текущая задача'
                      : 'Выбрана для фокуса'}
                  </span>
                )}
                {!compact && (
                  <div className="task-meta">
                    <span className={`task-status ${task.status}`}>
                      {task.status === 'completed'
                        ? 'Выполнена'
                        : task.status === 'in_progress'
                          ? 'Активная'
                          : 'К выполнению'}
                    </span>
                    <time dateTime={task.createdAt}>
                      Создана {dateLabel(task.createdAt).toLocaleLowerCase()}
                    </time>
                  </div>
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
      )}
      {!visible.length &&
        !workspace.loading &&
        !(workspace.loadError && !workspace.demo && !tasks.length) && (
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
            <Icon name="play" size={12} /> задачу для работы.
          </span>
        </div>
      )}
    </section>
  );
}
