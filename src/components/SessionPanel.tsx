import { useRef, useState } from 'react';
import type { Workspace } from '../hooks/useWorkspace';
import { Icon } from './Icon';
import { ConfirmModal } from './Modal';
import { SessionResultsModal } from './SessionResultsModal';
import { PixelAvatar } from './PixelAvatar';
import { roomInvitationUrl } from '../lib/utils';

const statusLabel = {
  waiting: 'Ожидает',
  ready: 'Готов',
  focusing: 'Занимается',
  left_early: 'Вышел досрочно',
  finished: 'Закончил',
  resting: 'Отдыхает',
  observer: 'Наблюдает',
};

export function SessionPanel({ workspace, onRoom }: { workspace: Workspace; onRoom: () => void }) {
  const { room, members, user, timer, demo } = workspace;
  const [confirm, setConfirm] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const mobileToggle = useRef<HTMLButtonElement>(null);
  const [copyFallback, setCopyFallback] = useState<{
    label: string;
    value: string;
    roomId: string;
  } | null>(null);
  const myMember = members.find((member) => member.userId === user?.id);
  const active = workspace.tasks.find((task) => task.status === 'in_progress');
  const idle = timer?.status === 'idle';
  const runId = timer?.phase === 'break' ? timer.pomodoroSessionId : workspace.lastFinishedRun;
  const pending = workspace.pending.includes('participation');
  const closeMobileOnEscape = (event: React.KeyboardEvent) => {
    if (event.key !== 'Escape' || !mobileOpen) return;
    event.preventDefault();
    event.stopPropagation();
    setMobileOpen(false);
    mobileToggle.current?.focus();
  };
  const mobileButton = (
    <button
      ref={mobileToggle}
      className="mobile-room-toggle"
      type="button"
      aria-expanded={mobileOpen}
      aria-controls="room-sidebar-content"
      onClick={() => setMobileOpen((value) => !value)}
    >
      <Icon name={mobileOpen ? 'close' : 'menu'} size={18} />
      <span>{mobileOpen ? 'Закрыть' : 'Комната'}</span>
      {!mobileOpen && room && (
        <span className="mobile-room-count">
          {members.length}/{room.maxMembers}
        </span>
      )}
      {!mobileOpen && idle && room && (
        <span className={myMember?.ready ? 'mobile-ready ready' : 'mobile-ready'}>
          {myMember?.ready ? 'Готов' : 'Не готов'}
        </span>
      )}
    </button>
  );
  const copy = async (kind: 'code' | 'link') => {
    if (!room || demo) return;
    const value =
      kind === 'code' ? room.inviteCode : roomInvitationUrl(window.location.href, room.inviteCode);
    try {
      await navigator.clipboard.writeText(value);
      setCopyFallback(null);
      workspace.notify(
        kind === 'code' ? 'Код приглашения скопирован.' : 'Ссылка приглашения скопирована.',
      );
    } catch {
      setCopyFallback({
        label: kind === 'code' ? 'Код приглашения' : 'Ссылка приглашения',
        value,
        roomId: room.id,
      });
      workspace.notify('Выделите и скопируйте приглашение вручную.', 'error');
    }
  };
  if (!room)
    return (
      <section
        className={`card session-panel room-sidebar ${mobileOpen ? 'mobile-open' : 'mobile-closed'}`}
        aria-label="Комната"
        onKeyDown={closeMobileOnEscape}
      >
        {mobileButton}
        <div id="room-sidebar-content" className="room-sidebar-content">
          <span className="eyebrow">ТВОЁ ПРОСТРАНСТВО</span>
          <h2>Добро пожаловать!</h2>
          <p className="session-hint">
            Создайте комнату или присоединитесь к друзьям, чтобы начать фокус.
          </p>
          <button className="button secondary full" onClick={onRoom}>
            <Icon name="users" size={16} />
            Открыть комнаты
          </button>
        </div>
      </section>
    );
  return (
    <>
      <section
        className={`card session-panel room-sidebar ${mobileOpen ? 'mobile-open' : 'mobile-closed'}`}
        aria-label="Комната и участники"
        onKeyDown={closeMobileOnEscape}
      >
        {mobileButton}
        <div id="room-sidebar-content" className="room-sidebar-content">
          <div className="room-sidebar-heading">
            <span className="eyebrow">
              <span
                className={`tiny-dot ${workspace.connection === 'connected' || demo ? 'online' : ''}`}
              />
              {demo
                ? 'ДЕМО-КОМНАТА'
                : workspace.connection === 'connected'
                  ? 'ВЫ В КОМНАТЕ'
                  : 'НЕТ СОЕДИНЕНИЯ'}
            </span>
            <button
              className="icon-button"
              aria-label="Управление комнатой"
              title="Управление комнатой"
              onClick={onRoom}
            >
              <Icon name="users" size={17} />
            </button>
          </div>
          <h2 className="room-sidebar-name">{room.name}</h2>
          <div className="room-summary">
            <span>
              {members.length} / {room.maxMembers} участников
            </span>
            {idle && <span>{members.filter((member) => member.ready).length} готовы</span>}
          </div>
          {!demo ? (
            <div className="room-share">
              <button
                className="room-code"
                onClick={() => void copy('code')}
                aria-label={`Скопировать код комнаты ${room.inviteCode}`}
                title="Скопировать код комнаты"
              >
                <span>{room.inviteCode}</span>
                <Icon name="copy" size={15} />
              </button>
              <button className="button secondary room-link" onClick={() => void copy('link')}>
                <Icon name="copy" size={15} />
                Скопировать ссылку
              </button>
            </div>
          ) : (
            <p className="session-hint room-demo-note">
              Чтобы пригласить друзей, войдите в аккаунт.
            </p>
          )}
          {copyFallback?.roomId === room.id && (
            <label className="invite-link-fallback">
              {copyFallback.label}
              <input
                readOnly
                value={copyFallback.value}
                onFocus={(event) => event.target.select()}
              />
            </label>
          )}
          {idle && (
            <p className="session-hint">
              Выберите задачу и отметьте готовность. Владелец сможет начать фокус, когда готовы все.
            </p>
          )}
          <button
            className="room-expand"
            aria-expanded={expanded}
            aria-controls="session-members-list"
            onClick={() => setExpanded((value) => !value)}
          >
            <span>
              <Icon name="users" size={16} /> Состояния участников
            </span>
            <Icon
              className={expanded ? 'room-chevron expanded' : 'room-chevron'}
              name="chevron"
              size={16}
            />
          </button>
          <div
            id="session-members-list"
            className="session-members"
            hidden={!expanded}
            tabIndex={expanded ? 0 : undefined}
            aria-label="Список участников"
          >
            {members.map((member, index) => (
              <div className="session-member" key={member.userId}>
                <PixelAvatar name={member.username} index={index} />
                <div>
                  <strong>
                    {member.username}
                    {member.userId === user?.id ? ' · вы' : ''}
                  </strong>
                  <span>
                    {statusLabel[member.sessionStatus || (member.ready ? 'ready' : 'waiting')]}
                  </span>
                  {member.taskTitle && <small>{member.taskTitle}</small>}
                </div>
              </div>
            ))}
          </div>
          <div className="session-actions">
            {idle && (
              <button
                className="button secondary"
                disabled={
                  pending ||
                  (!myMember?.ready && !active) ||
                  (!demo && workspace.connection !== 'connected')
                }
                onClick={() => void workspace.setReady(!myMember?.ready)}
              >
                <Icon name={myMember?.ready ? 'pause' : 'check'} size={16} />
                {myMember?.ready ? 'Отменить готовность' : 'Я готов'}
              </button>
            )}
            {idle && !active && <span className="session-hint">Сначала выберите задачу.</span>}
            {timer?.phase === 'focus' && myMember?.sessionStatus === 'focusing' && (
              <button
                className="button secondary"
                disabled={pending}
                onClick={() => setConfirm(true)}
              >
                Выйти из фокуса
              </button>
            )}
            {runId && myMember?.sessionStatus !== 'observer' && (
              <button className="button secondary" onClick={() => setShowResults(true)}>
                Итоги сессии
              </button>
            )}
          </div>
          {workspace.actionErrors.participation && (
            <p className="form-error" role="alert">
              {workspace.actionErrors.participation}
            </p>
          )}
        </div>
      </section>
      {confirm && (
        <ConfirmModal
          title="Выйти из фокуса?"
          description="Вы останетесь в комнате. Остальные продолжат сессию, а ваше участие будет записано как досрочно завершённое без награды."
          label="Выйти из фокуса"
          busy={pending}
          error={workspace.actionErrors.participation}
          onClose={() => setConfirm(false)}
          onConfirm={async () => {
            if (await workspace.leaveFocus()) setConfirm(false);
          }}
        />
      )}
      {showResults && runId && (
        <SessionResultsModal
          workspace={workspace}
          runId={runId}
          onClose={() => setShowResults(false)}
        />
      )}
    </>
  );
}
