import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Icon } from './Icon';
export function useModalTransition(close: () => void) {
  const [closing, setClosing] = useState(false);
  const timeout = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timeout.current), []);
  const onClose = useCallback(() => {
    if (timeout.current !== undefined) return;
    setClosing(true);
    timeout.current = window.setTimeout(
      close,
      window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 150,
    );
  }, [close]);
  return { closing, onClose };
}
export function Modal({
  title,
  subtitle,
  onClose,
  children,
  busy = false,
  className = '',
  closing = false,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  busy?: boolean;
  className?: string;
  closing?: boolean;
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
      className={`modal ${className} ${closing ? 'closing' : ''}`}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        if (!busy && !closing) onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget && !busy && !closing) onClose();
      }}
    >
      <div className="modal-inner">
        <button
          className="icon-button modal-close"
          aria-label="Закрыть окно"
          disabled={busy || closing}
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
  onClose: close,
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
  const { closing, onClose } = useModalTransition(close);
  return (
    <Modal title={title} onClose={onClose} busy={busy} closing={closing}>
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
