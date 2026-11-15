import { useEffect, useState } from 'react';
import type { Workspace } from '../hooks/useWorkspace';
import type { SessionResults } from '../lib/types';
import { duration, errorText } from '../lib/utils';
import { Modal } from './Modal';

export function SessionResultsModal({
  workspace,
  runId,
  onClose,
}: {
  workspace: Workspace;
  runId: string;
  onClose: () => void;
}) {
  const [results, setResults] = useState<SessionResults | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setResults(null);
    workspace
      .getSessionResults(runId)
      .then((value) => {
        if (!cancelled) setResults(value);
      })
      .catch((reason) => {
        if (!cancelled) setError(errorText(reason));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [runId, attempt, workspace.user?.id]);
  return (
    <Modal title="Итоги фокуса" subtitle="Результаты участников этой сессии" onClose={onClose}>
      {loading ? (
        <p role="status">Загружаем итоги…</p>
      ) : error ? (
        <div role="alert">
          <p className="form-error">{error}</p>
          <button className="button secondary" onClick={() => setAttempt((value) => value + 1)}>
            Повторить
          </button>
        </div>
      ) : (
        results && (
          <div className="session-results">
            <p>
              {results.status === 'completed' ? 'Фокус завершён' : 'Фокус отменён'} ·{' '}
              {new Date(results.endedAt).toLocaleString('ru')}
            </p>
            {results.participants.map((participant) => (
              <div className="session-result" key={participant.userId}>
                <strong>
                  {participant.username}
                  {participant.userId === workspace.user?.id ? ' · вы' : ''}
                </strong>
                <span>
                  {participant.status === 'completed'
                    ? 'Завершил'
                    : participant.finishReason === 'left_focus'
                      ? 'Вышел из фокуса'
                      : participant.finishReason === 'left_room'
                        ? 'Вышел из комнаты'
                        : 'Сессия отменена'}{' '}
                  · {duration(participant.focusedSeconds)}
                </span>
                <span>{participant.taskTitle || 'Без задачи'}</span>
                <span>
                  {participant.xpEarned > 0
                    ? `+${participant.xpEarned} XP · +${participant.coinsEarned} монет`
                    : workspace.demo
                      ? 'Демо без награды'
                      : 'Без награды'}
                </span>
              </div>
            ))}
          </div>
        )
      )}
    </Modal>
  );
}
