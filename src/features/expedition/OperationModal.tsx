import { useEffect, useId, useRef } from 'react';
import type { ReactNode } from 'react';

export default function OperationModal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  useEffect(() => {
    const trigger = document.activeElement;
    const dialog = ref.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog?.showModal();
    dialog?.querySelector<HTMLElement>('input,textarea,select')?.focus();
    return () => {
      dialog?.close();
      document.body.style.overflow = previousOverflow;
      if (trigger instanceof HTMLElement && trigger.isConnected) trigger.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className="operation-modal"
      aria-labelledby={id}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <header>
        <h2 id={id}>{title}</h2>
        <button
          type="button"
          className="operation-close"
          aria-label={`${title} 닫기`}
          onClick={onClose}
        >
          ×
        </button>
      </header>
      {children}
    </dialog>
  );
}
