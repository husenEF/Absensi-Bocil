import React from 'react';
import {STATUS_CODE, STATUS_LABEL, STATUS_ORDER, type StatusKey} from '../styles/palette';

type Props = {
  /** Who this row is about — used to build each option's accessible name. */
  readonly personName: string;
  readonly value: StatusKey;
  readonly onChange: (next: StatusKey) => void;
};

/**
 * Four tap targets — Hadir / Sakit / Izin / Alfa — as a radio group.
 *
 * Every option shows its letter AND its word, so the meaning never rests on
 * colour alone. Each is a 48px target, operable with a single finger: no
 * swiping, no long-press, no drag, so there is nothing a teacher has to know a
 * gesture for.
 *
 * Implemented as real radios so arrow keys work and the group announces as
 * "Status kehadiran <name>, Hadir, 1 of 4".
 */
export const StatusPicker: React.FC<Props> = ({personName, value, onChange}) => {
  const groupName = `status-${personName.replace(/\s+/g, '-').toLowerCase()}`;

  return (
    <div
      className="cs-status"
      role="radiogroup"
      aria-label={`Status kehadiran ${personName}`}
    >
      {STATUS_ORDER.map((key) => {
        const selected = key === value;
        return (
          <label
            key={key}
            className={`cs-status__opt cs-status__opt--${key}${
              selected ? ' is-selected' : ''
            }`}
          >
            <input
              className="cs-visually-hidden"
              type="radio"
              name={groupName}
              value={key}
              checked={selected}
              onChange={() => onChange(key)}
            />
            <span className="cs-status__code" aria-hidden="true">
              {STATUS_CODE[key]}
            </span>
            <span className="cs-status__text">{STATUS_LABEL[key]}</span>
          </label>
        );
      })}
    </div>
  );
};
