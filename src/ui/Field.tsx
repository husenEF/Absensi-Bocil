import React from 'react';

type FieldProps = {
  readonly id: string;
  readonly label: string;
  /** Shown under the label, before the control, per GOV.UK ordering. */
  readonly hint?: string;
  /** Shown after the hint and before the control, prefixed for screen readers. */
  readonly error?: string;
  readonly optional?: boolean;
  readonly children: (controlProps: {
    id: string;
    'aria-describedby'?: string;
    'aria-invalid'?: true;
  }) => React.ReactNode;
};

/**
 * Label + hint + error + control, wired together.
 *
 * Labels are always visible and sit above the control: a placeholder is not a
 * label — it disappears on typing, is skipped by some screen readers, and gets
 * mistaken for a filled-in value.
 *
 * Error text names the field and is announced with a visually hidden "Error:"
 * prefix, and the field keeps whatever the user typed.
 */
export const Field: React.FC<FieldProps> = ({
  id,
  label,
  hint,
  error,
  optional,
  children,
}) => {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={`cs-field${error ? ' cs-field--error' : ''}`}>
      <label className="cs-field__label" htmlFor={id}>
        {label}
        {optional ? <span className="cs-field__optional"> (opsional)</span> : null}
      </label>

      {hint ? (
        <p className="cs-field__hint" id={hintId}>
          {hint}
        </p>
      ) : null}

      {error ? (
        <p className="cs-field__error" id={errorId}>
          <span className="cs-visually-hidden">Error: </span>
          {error}
        </p>
      ) : null}

      {children({
        id,
        'aria-describedby': describedBy,
        ...(error ? {'aria-invalid': true as const} : {}),
      })}
    </div>
  );
};
