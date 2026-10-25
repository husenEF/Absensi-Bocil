import React from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'warning';
export type ButtonSize = 'md' | 'lg';

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  readonly variant?: ButtonVariant;
  readonly size?: ButtonSize;
  /** Decorative icon. Never the only thing in the button — a label is required. */
  readonly icon?: React.ReactNode;
  /** Stretch to the container width. */
  readonly block?: boolean;
};

const VARIANT: Record<ButtonVariant, string> = {
  primary: 'cs-btn--primary',
  secondary: 'cs-btn--secondary',
  ghost: 'cs-btn--ghost',
  danger: 'cs-btn--danger',
  warning: 'cs-btn--warning',
};

/**
 * The app's only button.
 *
 * Every button carries a visible text label: an icon alone is ambiguous, and a
 * `title` tooltip never appears on a touch device. Passing an icon without
 * children is a type error for that reason.
 *
 * Minimum height is the 48px tap target, so this cannot be made too small to
 * hit by passing a className.
 */
export const Button = React.forwardRef<HTMLButtonElement, Props>(function Button(
  {variant = 'secondary', size = 'md', icon, block, className = '', children, type, ...rest},
  ref,
) {
  return (
    <button
      ref={ref}
      type={type ?? 'button'}
      className={[
        'cs-btn',
        VARIANT[variant],
        size === 'lg' ? 'cs-btn--lg' : '',
        block ? 'cs-btn--block' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {icon ? (
        <span className="cs-btn__icon" aria-hidden="true">
          {icon}
        </span>
      ) : null}
      <span className="cs-btn__label">{children}</span>
    </button>
  );
});
