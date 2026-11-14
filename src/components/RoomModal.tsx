import { useEffect, useState, type FormEvent } from 'react';
import type { Workspace } from '../hooks/useWorkspace';
import { roomInvitationUrl } from '../lib/utils';
import { PixelAvatar } from './PixelAvatar';
import { Icon } from './Icon';
import { ConfirmModal, Modal, useModalTransition } from './Modal';
export function RoomModal({
  workspace,
  onClose: close,
  onAuth,
  initialInviteCode,
}: {
  workspace: Workspace;
  onClose: () => void;
  onAuth: () => void;
  initialInviteCode?: string;
}) {
  const { closing, onClose } = useModalTransition(close);
  const [tab, setTab] = useState<'create' | 'join'>(initialInviteCode ? 'join' : 'create');
  const [name, setName] = useState('');
  const [capacity, setCapacity] = useState(6);
  const [code, setCode] = useState(initialInviteCode || '');
  const [confirm, setConfirm] = useState(false);
  const [transfer, setTransfer] = useState<string | null>(null);
  const { room, members, user, demo, pending } = workspace;
  const busy =
    pending.includes('room') || (!demo && (workspace.loading || workspace.membershipLoading));
  const showRoom = room && !(demo && initialInviteCode);
  const invitationUrl =
    room && !demo ? roomInvitationUrl(window.location.href, room.inviteCode) : '';
  const [linkFallback, setLinkFallback] = useState(false);
  useEffect(() => workspace.clearActionError('room'), [tab, workspace.clearActionError]);
  async function submit(event: FormEvent) {
    event.preventDefault();
    const success =
      tab === 'create'
        ? await workspace.createRoom(name.trim(), capacity)
        : await workspace.joinRoom(code.trim().toUpperCase());
    if (success) onClose();
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(room!.inviteCode);
      workspace.notify('Код приглашения скопирован.');
    } catch {
      workspace.notify('Выделите и скопируйте код вручную.', 'error');
    }
  }
  async function copyLink() {
    try {
      await navigator.clipboard.writeText(invitationUrl);
      workspace.notify('Ссылка приглашения скопирована.');
    } catch {
      setLinkFallback(true);
      workspace.notify('Выделите и скопируйте ссылку вручную.', 'error');
    }
  }
  if (confirm)
    return (
      <ConfirmModal
        title="Выйти из комнаты?"
        description="Твоё участие в текущем Focus будет сохранено. Если ты владелец, права перейдут следующему участнику. Пустая комната закроется."
        label="Выйти из комнаты"
        busy={busy}
        error={workspace.actionErrors.room}
        onClose={() => setConfirm(false)}
        onConfirm={async () => {
          if (await workspace.leaveRoom()) {
            if (initialInviteCode) setConfirm(false);
            else onClose();
          }
        }}
      />
    );
  if (transfer)
    return (
      <ConfirmModal
        title="Передать управление?"
        description="Новый владелец сможет управлять таймером. Ты останешься участником комнаты."
        label="Передать права"
        busy={busy}
        error={workspace.actionErrors.room}
        onClose={() => setTransfer(null)}
        onConfirm={async () => {
          if (await workspace.transferOwner(transfer)) setTransfer(null);
        }}
      />
    );
  return (
    <Modal
      title={showRoom ? room.name : 'Вместе легче начать.'}
      subtitle={
        showRoom
          ? demo
            ? 'Локальная демо-комната. Приглашения работают после входа.'
            : `${members.length} из ${room.maxMembers} участников · ${room.ownerId === user?.id ? 'ты владелец' : 'ты участник'}`
          : 'Создай своё пространство или присоединись по приглашению.'
      }
      onClose={onClose}
      closing={closing}
      busy={busy}
    >
      {showRoom ? (
        <>
          {initialInviteCode && !demo && (
            <div className="inline-note">
              <Icon name="info" />
              <p>
                {room.inviteCode === initialInviteCode
                  ? 'Вы уже в комнате из приглашения.'
                  : `Вы уже состоите в комнате. Чтобы принять приглашение ${initialInviteCode}, сначала выйдите из текущей комнаты.`}
              </p>
            </div>
          )}
          {demo ? (
            <div className="inline-note">
              <Icon name="info" />
              <p>
                В демо таймер и задачи работают в этом браузере. Чтобы пригласить друзей,{' '}
                <button className="text-button" onClick={onAuth}>
                  войди в аккаунт
                </button>
                .
              </p>
            </div>
          ) : (
            <div className="room-invitation">
              <div className="invite-box">
                <div>
                  <span className="eyebrow">КОД ПРИГЛАШЕНИЯ</span>
                  <input
                    readOnly
                    value={room.inviteCode}
                    aria-label="Код приглашения в комнату"
                    onFocus={(event) => event.target.select()}
                  />
                </div>
                <button
                  className="icon-button"
                  aria-label="Скопировать код приглашения"
                  onClick={copy}
                >
                  <Icon name="copy" />
                </button>
              </div>
              <button className="button secondary full" onClick={copyLink}>
                <Icon name="copy" size={16} />
                Пригласить по ссылке
              </button>
              {linkFallback && (
                <label className="invite-link-fallback">
                  Ссылка приглашения
                  <input
                    readOnly
                    value={invitationUrl}
                    onFocus={(event) => event.target.select()}
                  />
                </label>
              )}
            </div>
          )}
          <div className="member-list">
            {members.map((member, index) => (
              <div className="member-row" key={member.userId}>
                <PixelAvatar name={member.username} index={index} />
                <div className="member-name">
                  <strong>
                    {member.username}
                    {member.userId === user?.id && <span className="muted"> · ты</span>}
                  </strong>
                  <span>{member.role === 'owner' ? 'Владелец комнаты' : 'Участник'}</span>
                </div>
                {member.role === 'owner' ? (
                  <Icon name="crown" size={18} className="crown" />
                ) : room.ownerId === user?.id && !demo ? (
                  <button
                    className="text-button"
                    disabled={busy}
                    onClick={() => setTransfer(member.userId)}
                  >
                    Передать права
                  </button>
                ) : null}
              </div>
            ))}
          </div>
          <div className="room-note">
            <Icon name="info" size={16} />
            <p>Таймером управляет владелец. У каждого участника своя задача и личная история.</p>
          </div>
          <button
            className="button secondary full leave-button"
            disabled={busy}
            onClick={() => setConfirm(true)}
          >
            <Icon name="logout" size={17} />
            Выйти из комнаты
          </button>
        </>
      ) : (
        <>
          {initialInviteCode && (
            <div className="inline-note">
              <Icon name="users" />
              <p>
                Приглашение в комнату по коду <strong>{initialInviteCode}</strong>.{' '}
                {demo
                  ? 'Войдите или зарегистрируйтесь, затем подтвердите присоединение.'
                  : 'Подтвердите присоединение к комнате.'}
              </p>
            </div>
          )}
          <div className="segmented">
            <button className={tab === 'create' ? 'selected' : ''} onClick={() => setTab('create')}>
              Создать комнату
            </button>
            <button className={tab === 'join' ? 'selected' : ''} onClick={() => setTab('join')}>
              У меня есть код
            </button>
          </div>
          <form className="form-stack" onSubmit={submit}>
            {tab === 'create' ? (
              <>
                <label>
                  Название
                  <input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Например, Тихая комната"
                    required
                    maxLength={50}
                    autoFocus
                    disabled={busy}
                  />
                </label>
                <label>
                  Количество участников
                  <select
                    value={capacity}
                    onChange={(event) => setCapacity(Number(event.target.value))}
                    disabled={busy}
                  >
                    {[2, 3, 4, 6, 10, 20, 50].map((value) => (
                      <option key={value} value={value}>
                        {value} человек
                      </option>
                    ))}
                  </select>
                </label>
              </>
            ) : (
              <label>
                Код приглашения
                <input
                  value={code}
                  onChange={(event) => setCode(event.target.value.toUpperCase())}
                  placeholder="K7M2QX9P"
                  minLength={8}
                  maxLength={8}
                  pattern="[A-HJ-NP-Z2-9]{8}"
                  required
                  disabled={busy}
                  autoFocus
                  className="code-input"
                />
                <span className="field-hint">8 символов из приглашения владельца.</span>
              </label>
            )}
            {workspace.actionErrors.room && (
              <p className="form-error" role="alert">
                {workspace.actionErrors.room}
              </p>
            )}
            {demo && tab === 'join' ? (
              <button type="button" className="button primary full" onClick={onAuth}>
                Войти и присоединиться
                <Icon name="arrow" size={18} />
              </button>
            ) : (
              <button
                className="button primary full"
                disabled={busy || (tab === 'create' && !name.trim())}
              >
                {busy ? 'Подключаемся…' : tab === 'create' ? 'Создать комнату' : 'Присоединиться'}
                <Icon name="arrow" size={18} />
              </button>
            )}
          </form>
        </>
      )}
    </Modal>
  );
}
