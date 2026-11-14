import { useEffect, useState, type FormEvent } from 'react';
import type { Workspace } from '../hooks/useWorkspace';
import type { Task } from '../lib/types';
import { Icon } from './Icon';
import { Modal, useModalTransition } from './Modal';
export function TaskEditor({
  task,
  workspace,
  onClose: close,
}: {
  task: Task | null;
  workspace: Workspace;
  onClose: () => void;
}) {
  const { closing, onClose } = useModalTransition(close);
  const [title, setTitle] = useState(task?.title ?? '');
  const [description, setDescription] = useState(task?.description ?? '');
  const busy = workspace.pending.includes('task-save');
  useEffect(() => workspace.clearActionError('task-save'), [workspace.clearActionError]);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!title.trim()) return;
    if (
      await workspace.saveTask(
        { title: title.trim(), description: description.trim() || null },
        task?.id,
      )
    )
      onClose();
  }
  return (
    <Modal
      title={task ? 'Немного ясности.' : 'Что хочется сделать?'}
      subtitle="Небольшая конкретная задача — хорошее начало."
      onClose={onClose}
      closing={closing}
      busy={busy}
    >
      <form onSubmit={submit} className="form-stack">
        <label>
          Название задачи
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
            maxLength={120}
            placeholder="Например, прочитать одну главу"
            autoFocus
            disabled={busy}
          />
          <span className="field-hint field-counter">{title.length}/120</span>
        </label>
        <label>
          Описание <span className="muted">необязательно</span>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            maxLength={5000}
            rows={4}
            placeholder="Что поможет сделать первый шаг?"
            disabled={busy}
          />
        </label>
        {workspace.actionErrors['task-save'] && (
          <p className="form-error" role="alert">
            {workspace.actionErrors['task-save']}
          </p>
        )}
        <div className="modal-actions">
          <button type="button" className="button secondary" onClick={onClose} disabled={busy}>
            Отмена
          </button>
          <button className="button primary" disabled={busy || !title.trim()}>
            <Icon name={task ? 'check' : 'plus'} size={18} />
            {busy ? 'Сохраняем…' : task ? 'Сохранить' : 'Добавить задачу'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
