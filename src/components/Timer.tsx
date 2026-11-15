import { useEffect, useState } from 'react';
import type { Workspace } from '../hooks/useWorkspace';
import { clock, remaining } from '../lib/utils';
import { Icon, TomatoMark } from './Icon';
import { ConfirmModal } from './Modal';
const digits: Record<string, string[]> = {
  '0': ['11111', '10001', '10011', '10101', '11001', '10001', '11111'],
  '1': ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
  '2': ['11111', '00001', '00001', '11111', '10000', '10000', '11111'],
  '3': ['11111', '00001', '00001', '01111', '00001', '00001', '11111'],
  '4': ['10001', '10001', '10001', '11111', '00001', '00001', '00001'],
  '5': ['11111', '10000', '10000', '11111', '00001', '00001', '11111'],
  '6': ['11111', '10000', '10000', '11111', '10001', '10001', '11111'],
  '7': ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
  '8': ['11111', '10001', '10001', '11111', '10001', '10001', '11111'],
  '9': ['11111', '10001', '10001', '11111', '00001', '00001', '11111'],
  ':': ['00000', '00100', '00100', '00000', '00100', '00100', '00000'],
};

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
  const everyoneReady =
    workspace.members.length > 0 && workspace.members.every((member) => member.ready);
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
      className={`timer-card ${isBreak ? 'break-time' : ''}`}
      aria-label="Общий Pomodoro-таймер"
    >
      <div className="wooden-timer">
        <div className="wood-nail nail-one" />
        <div className="wood-nail nail-two" />
        <div className="wood-nail nail-three" />
        <div className="wood-nail nail-four" />
        <div className="timer-crest">
          <TomatoMark size={42} />
        </div>
        <svg className="timer-ring" viewBox="0 0 280 280" aria-hidden="true">
          <circle className="ring-track" cx="140" cy="140" r="127" />
          <circle
            className="ring-progress"
            cx="140"
            cy="140"
            r="127"
            pathLength="100"
            strokeDasharray="100"
            strokeDashoffset={100 - Math.min(1, fraction) * 100}
          />
        </svg>
        <div className="timer-face">
          <span className={`live-badge ${paused ? 'paused' : running ? 'running' : ''}`}>
            <span className="tiny-dot" />
            {paused ? 'НА ПАУЗЕ' : running ? 'СЕССИЯ ИДЁТ' : 'ТВОЁ ВРЕМЯ'}
          </span>
          <span className="timer-digits" aria-label={`Осталось ${clock(seconds)}`} role="timer">
            <svg viewBox="0 0 29 7" aria-hidden="true" shapeRendering="crispEdges">
              {[...clock(seconds)].flatMap((character, i) =>
                digits[character].flatMap((row, y) =>
                  [...row].map((pixel, x) =>
                    pixel === '1' ? (
                      <rect key={`${i}-${x}-${y}`} x={i * 6 + x} y={y} width="1" height="1" />
                    ) : null,
                  ),
                ),
              )}
            </svg>
          </span>
          <span className="timer-phase">
            <Icon name={isBreak ? 'coffee' : 'focus'} size={18} />
            {isBreak ? 'Перерыв' : 'Фокус'}
          </span>
          <span className="timer-caption">
            {isBreak
              ? 'Выдохни. Ты хорошо поработал.'
              : paused
                ? demo
                  ? 'Вернись, когда будешь готов.'
                  : 'Пауза ограничена по времени.'
                : 'Одна задача. Один маленький шаг.'}
          </span>
        </div>
      </div>
      <div className="timer-controls">
        {!room ? (
          <button className="button primary timer-start" onClick={onRoom}>
            <Icon name="users" size={19} />
            Создать комнату
          </button>
        ) : (
          <>
            <button
              className="button primary timer-start"
              disabled={
                busy ||
                !owner ||
                !connected ||
                !timer ||
                (timer.status === 'idle' && !everyoneReady)
              }
              onClick={() =>
                void workspace.command(running ? 'pause' : paused ? 'resume' : 'start')
              }
            >
              <Icon name={running ? 'pause' : 'play'} size={19} />
              {busy ? 'Подождите…' : running ? 'Пауза' : paused ? 'Продолжить' : 'Начать фокус'}
            </button>
            {timer && timer.status !== 'idle' && (
              <button
                className="button secondary timer-stop"
                aria-label="Отменить текущую сессию"
                title="Отменить сессию"
                disabled={!owner || !connected || busy}
                onClick={() => setCancel(true)}
              >
                <Icon name="stop" size={19} />
              </button>
            )}
          </>
        )}
      </div>
      <p className="timer-undertext">
        {!room ? (
          'Создай свою первую комнату'
        ) : !connected ? (
          <button className="text-button" onClick={workspace.reconnect}>
            Нет связи · подключиться снова
          </button>
        ) : !owner ? (
          'Таймером управляет владелец'
        ) : timer?.status === 'idle' && !everyoneReady ? (
          'Дождитесь готовности всех участников.'
        ) : paused && !demo ? (
          'Долгая пауза отменяется автоматически.'
        ) : isBreak ? (
          'Результат сохранён. Время отдохнуть.'
        ) : (
          '25 минут фокуса → 5 минут отдыха'
        )}
      </p>
      <div className="current-task">
        <Icon name="target" size={16} />
        <span>{active ? `Текущая задача: ${active.title}` : 'Задача не выбрана'}</span>
      </div>
      {timer?.phase === 'focus' && timer.status !== 'idle' && (
        <p className="timer-undertext">
          {workspace.sessionTaskError ? (
            <>
              Не удалось загрузить задачу сессии.{' '}
              <button className="text-button" onClick={workspace.refresh}>
                Повторить
              </button>
            </>
          ) : workspace.members.find((member) => member.userId === user?.id)?.sessionStatus ===
            'left_early' ? (
            'Вы вышли из фокуса и остались в комнате.'
          ) : !workspace.sessionTask ? (
            'Загружаем данные сессии…'
          ) : !workspace.sessionTask.participant ? (
            'Вы присоединились после начала фокуса.'
          ) : workspace.sessionTask.taskTitle ? (
            `В истории сессии сохранится задача на старте: ${workspace.sessionTask.taskTitle}.`
          ) : (
            'Сессия началась без задачи — так она сохранится в истории.'
          )}
        </p>
      )}
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
