import React, {useEffect, useId, useRef, useState} from 'react';
import {Button} from './Button';

type Props = {
  readonly open: boolean;
  readonly title: string;
  /** What will actually happen, with counts. Not "Are you sure?". */
  readonly body: React.ReactNode;
  /** Describes the outcome, e.g. "Hapus semua presensi" — never "Ya"/"OK". */
  readonly confirmLabel: string;
  readonly cancelLabel?: string;
  /**
   * Require this word to be typed before confirming. For irreversible actions
   * only; used anywhere else it just teaches people to type past warnings.
   */
  readonly confirmPhrase?: string;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
};

/**
 * A styled confirmation, replacing window.confirm.
 *
 * The native dialog could not be sized, labelled or translated: its buttons
 * are the browser's "OK"/"Cancel", which say nothing about what is about to
 * happen. Here the confirm button names the outcome, nothing is focused by
 * default so there is no destructive button under a stray Enter, and Escape
 * always cancels.
 */
export const ConfirmDialog: React.FC<Props> = ({
  open,
  title,
  body,
  confirmLabel,
  cancelLabel = 'Batal',
  confirmPhrase,
  onConfirm,
  onCancel,
}) => {
  const titleId = useId();
  const bodyId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const [typed, setTyped] = useState('');

  useEffect(() => {
    if (!open) setTyped('');
  }, [open]);

  /**
   * Move focus into the dialog, and hand it back on close.
   *
   * Without this the Tab trap below never engaged — focus stayed on the page
   * behind an aria-modal dialog, so a keyboard user had to tab blindly to
   * reach it. The cancel button is focused rather than the confirm one, so
   * a stray Enter cannot destroy anything.
   */
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    cancelRef.current?.focus();
    return () => previous?.focus?.();
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
        return;
      }
      if (e.key !== 'Tab' || !dialogRef.current) return;

      // Keep focus inside the dialog while it is open.
      const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
        'button, input, [href], select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onCancel]);

  if (!open) return null;

  const unlocked = !confirmPhrase || typed.trim().toUpperCase() === confirmPhrase.toUpperCase();

  return (
    <div className="cs-dialog__backdrop" onClick={onCancel}>
      <div
        ref={dialogRef}
        className="cs-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={bodyId}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="cs-dialog__title" id={titleId}>
          {title}
        </h2>
        <div className="cs-dialog__body" id={bodyId}>
          {body}
        </div>

        {confirmPhrase ? (
          <div className="cs-field">
            <label className="cs-field__label" htmlFor={`${titleId}-phrase`}>
              Ketik {confirmPhrase} untuk melanjutkan
            </label>
            <input
              id={`${titleId}-phrase`}
              className="cs-input"
              type="text"
              autoComplete="off"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
            />
          </div>
        ) : null}

        <div className="cs-dialog__actions">
          <Button ref={cancelRef} variant="secondary" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button
            variant={confirmPhrase ? 'warning' : 'danger'}
            disabled={!unlocked}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
};
