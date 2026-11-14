import { useEffect, useState, type FormEvent } from 'react';
import type { Workspace } from '../hooks/useWorkspace';
import { Icon, TomatoMark } from './Icon';
import { Modal } from './Modal';
export function AuthModal({ workspace, onClose }: { workspace: Workspace; onClose: () => void }) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [visible, setVisible] = useState(false);
  const busy = workspace.pending.includes('auth');
  useEffect(() => workspace.clearActionError('auth'), [mode, workspace.clearActionError]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const values: Record<string, string> =
      mode === 'login'
        ? { login: String(form.get('login')).trim(), password: String(form.get('password')) }
        : {
            username: String(form.get('username')).trim(),
            email: String(form.get('email')).trim(),
            password: String(form.get('password')),
          };
    if (await workspace.authenticate(mode, values)) onClose();
  }
  return (
    <Modal
      title={mode === 'login' ? 'Рады видеть тебя.' : 'Начнём с малого.'}
      subtitle={
        mode === 'login'
          ? 'Твои задачи и пространство для фокуса уже ждут.'
          : 'Создай аккаунт и собери своё пространство для работы.'
      }
      onClose={onClose}
      busy={busy}
      className="auth-modal"
    >
      <div className="auth-brand">
        <TomatoMark size={44} />
      </div>
      <div className="segmented auth-tabs">
        <button
          disabled={busy}
          onClick={() => setMode('login')}
          className={mode === 'login' ? 'selected' : ''}
        >
          Войти
        </button>
        <button
          disabled={busy}
          onClick={() => setMode('register')}
          className={mode === 'register' ? 'selected' : ''}
        >
          Регистрация
        </button>
      </div>
      <form key={mode} onSubmit={submit} className="form-stack">
        {mode === 'register' ? (
          <>
            <label>
              Имя пользователя
              <input
                name="username"
                autoComplete="username"
                placeholder="Например, alex_01"
                minLength={3}
                maxLength={20}
                pattern="[A-Za-z0-9_]{3,20}"
                title="3–20 латинских букв, цифр или символов подчёркивания"
                required
                autoFocus
                disabled={busy}
              />
              <span className="field-hint">
                Латинские буквы, цифры и подчёркивание, 3–20 символов.
              </span>
            </label>
            <label>
              Email
              <input
                name="email"
                type="email"
                autoComplete="email"
                maxLength={255}
                placeholder="you@example.com"
                required
                disabled={busy}
              />
            </label>
          </>
        ) : (
          <label>
            Email или имя пользователя
            <input
              name="login"
              autoComplete="username"
              placeholder="you@example.com"
              minLength={3}
              maxLength={255}
              required
              autoFocus
              disabled={busy}
            />
          </label>
        )}
        <label>
          Пароль
          <div className="password-field">
            <input
              name="password"
              type={visible ? 'text' : 'password'}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              placeholder={mode === 'register' ? 'Не менее 8 символов' : 'Твой пароль'}
              minLength={mode === 'register' ? 8 : 1}
              maxLength={128}
              required
              disabled={busy}
            />
            <button
              type="button"
              onClick={() => setVisible(!visible)}
              aria-label={visible ? 'Скрыть пароль' : 'Показать пароль'}
            >
              {visible ? 'Скрыть' : 'Показать'}
            </button>
          </div>
        </label>
        {workspace.actionErrors.auth && (
          <p className="form-error" role="alert">
            {workspace.actionErrors.auth}
          </p>
        )}
        <button className="button primary full" disabled={busy}>
          {busy ? 'Подключаемся…' : mode === 'login' ? 'Войти в пространство' : 'Создать аккаунт'}
          <Icon name="arrow" size={18} />
        </button>
      </form>
      <p className="auth-footnote">
        <Icon name="lock" size={14} />
        Задачи и история доступны только тебе.
      </p>
    </Modal>
  );
}
