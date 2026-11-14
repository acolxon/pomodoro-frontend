import { useEffect, useState } from 'react';
import type { Workspace } from '../hooks/useWorkspace';
import { clock, remaining } from '../lib/utils';
import { Icon } from './Icon';
import { ConfirmModal } from './Modal';
export function Timer({ workspace, onRoom }: { workspace: Workspace; onRoom: () => void }) {
  const [now, setNow] = useState(Date.now());
  const [cancel, setCancel] = useState(false);
  const { timer, room, user, demo, connection, pending } = workspace;
  const connected = demo || connection === 'connected';
  const owner = room?.ownerId === user?.id;
  const busy = pending.includes('timer');
  const running = timer?.status === 'running';
  const paused = timer?.status === 'paused';
  const isBreak = timer?.phase === 'break';
  const seconds = remaining(timer, workspace.clockOffset, now);
  const fraction = timer && timer.status !== 'idle' ? seconds / timer.durationSeconds : 1;
  const active = workspace.tasks.find((task) => task.status === 'in_progress');
  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 200);
    return () => window.clearInterval(interval);
  }, []);
  useEffect(() => {
    document.title =
      running || paused
        ? `${clock(seconds)} · ${isBreak ? 'Перерыв' : 'Фокус'} — Tomato`
        : 'Tomato — время для важного';
    return () => {
      document.title = 'Tomato — время для важного';
    };
  }, [running, paused, seconds, isBreak]);
  return (
    <section
      className={`card timer-card ${isBreak ? 'break-time' : ''}`}
      aria-label="Общий Pomodoro-таймер"
    >
      <div className="timer-top">
        <span className="timer-phase">
          <Icon name={isBreak ? 'coffee' : 'leaf'} size={16} />
          {isBreak ? 'Время выдохнуть' : 'Режим глубокого фокуса'}
        </span>
        <span className={`live-badge ${paused ? 'paused' : running ? 'running' : ''}`}>
          <span className="tiny-dot" />
          {paused ? 'На паузе' : running ? 'Сессия идёт' : 'Без спешки'}
        </span>
      </div>
      <div className="phase-pills" aria-label="Режим таймера">
        <span className={!isBreak ? 'selected' : ''}>
          <Icon name="focus" size={15} />
          Фокус <small>25 мин</small>
        </span>
        <span className={isBreak ? 'selected' : ''}>
          <Icon name="coffee" size={15} />
          Перерыв <small>5 мин</small>
        </span>
      </div>
      <div className="timer-dial">
        <svg className="timer-ring" viewBox="0 0 320 320" aria-hidden="true">
          <circle className="ring-track" cx="160" cy="160" r="145" />
          <circle
            className="ring-progress"
            cx="160"
            cy="160"
            r="145"
            pathLength="100"
            strokeDasharray="100"
            strokeDashoffset={100 - Math.min(1, fraction) * 100}
          />
        </svg>
        <div className="timer-face">
          <span className="timer-eyebrow">
            {isBreak ? 'СМЕНИ ОБСТАНОВКУ' : paused ? 'МОЖНО ПЕРЕВЕСТИ ДУХ' : 'ВРЕМЯ ДЛЯ ВАЖНОГО'}
          </span>
          <span className="timer-digits" aria-label={`Осталось ${clock(seconds)}`} role="timer">
            {clock(seconds)}
          </span>
          <span className="timer-caption">
            {isBreak
              ? 'Потянись. Вдохни. Отдохни.'
              : running
                ? 'Сейчас только ты и одна задача.'
                : paused
                  ? 'Продолжишь, когда будешь готов.'
                  : 'Одна задача. Один маленький шаг.'}
          </span>
          <span className="timer-decoration">
            <Icon name={isBreak ? 'coffee' : 'leaf'} size={22} />
          </span>
        </div>
      </div>
      <div className="timer-controls">
        {!room ? (
          <button className="button primary timer-start" onClick={onRoom}>
            <Icon name="users" size={18} />
            Создать комнату
          </button>
        ) : (
          <>
            <button
              className="button primary timer-start"
              disabled={busy || !owner || !connected || !timer}
              onClick={() =>
                void workspace.command(running ? 'pause' : paused ? 'resume' : 'start')
              }
            >
              <Icon name={running ? 'pause' : 'play'} size={18} />
              {busy ? 'Подождите…' : running ? 'Пауза' : paused ? 'Продолжить' : 'Начать фокус'}
            </button>
            {timer?.status !== 'idle' && (
              <button
                className="button secondary timer-stop"
                aria-label="Отменить текущую сессию"
                title="Отменить сессию"
                disabled={!owner || !connected || busy}
                onClick={() => setCancel(true)}
              >
                <Icon name="stop" size={18} />
              </button>
            )}
          </>
        )}
      </div>
      <p className="timer-undertext">
        {!room ? (
          'Комната нужна даже для работы в одиночку.'
        ) : !connected ? (
          <button className="text-button" onClick={workspace.reconnect}>
            Нет связи с комнатой. Переподключиться
          </button>
        ) : !owner ? (
          'Таймером управляет владелец комнаты.'
        ) : timer?.status === 'idle' ? (
          <>
            После фокуса — 5 минут отдыха <span>↗</span>
          </>
        ) : isBreak ? (
          'Твой результат уже сохранён в истории.'
        ) : (
          'Паузы не учитываются во времени фокуса.'
        )}
      </p>
      <div className="current-task">
        <span className="current-task-icon">
          <Icon name="target" size={17} />
        </span>
        <div>
          <span>
            {timer?.phase === 'focus' && timer.status !== 'idle'
              ? 'ВЫБОР ДЛЯ СЛЕДУЮЩЕЙ СЕССИИ'
              : 'ЗАДАЧА ДЛЯ ФОКУСА'}
          </span>
          <p>{active?.title || 'Можно начать и без задачи'}</p>
        </div>
      </div>
      {cancel && (
        <ConfirmModal
          title={isBreak ? 'Закончить перерыв?' : 'Завершить фокус раньше?'}
          description={
            isBreak
              ? 'Результат фокуса останется в истории. Таймер вернётся к началу.'
              : 'Проведённое время сохранится в истории как отменённая сессия. К задаче можно вернуться позже.'
          }
          label={isBreak ? 'Закончить перерыв' : 'Завершить сессию'}
          busy={busy}
          error={workspace.actionErrors.timer}
          onClose={() => setCancel(false)}
          onConfirm={async () => {
            if (await workspace.command('cancel')) setCancel(false);
          }}
        />
      )}
    </section>
  );
}
