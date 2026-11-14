import { useEffect, useRef, type ReactNode } from 'react';
import { Icon } from './Icon';
export function Modal({
  title,
  subtitle,
  onClose,
  children,
  busy = false,
  className = '',
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  busy?: boolean;
  className?: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useRef(`modal-${crypto.randomUUID()}`).current;
  useEffect(() => {
    const element = dialog.current;
    const previous = document.activeElement as HTMLElement | null;
    element?.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      element?.close();
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, []);
  return (
    <dialog
      ref={dialog}
      className={`modal ${className}`}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget && !busy) onClose();
      }}
    >
      <div className="modal-inner">
        <button
          className="icon-button modal-close"
          aria-label="Закрыть окно"
          disabled={busy}
          onClick={onClose}
        >
          <Icon name="close" />
        </button>
        <h2 id={titleId}>{title}</h2>
        {subtitle && <p className="modal-subtitle">{subtitle}</p>}
        {children}
      </div>
    </dialog>
  );
}
export function ConfirmModal({
  title,
  description,
  label,
  busy,
  onClose,
  onConfirm,
  error,
}: {
  title: string;
  description: string;
  label: string;
  busy: boolean;
  onClose: () => void;
  onConfirm: () => void;
  error?: string;
}) {
  return (
    <Modal title={title} onClose={onClose} busy={busy}>
      <p className="confirm-description">{description}</p>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div className="modal-actions">
        <button className="button secondary" disabled={busy} onClick={onClose}>
          Отмена
        </button>
        <button className="button danger" disabled={busy} onClick={onConfirm}>
          {busy ? 'Подождите…' : label}
        </button>
      </div>
    </Modal>
  );
}
