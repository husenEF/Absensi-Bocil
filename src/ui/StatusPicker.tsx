import React from 'react';
import {STATUS_CODE, STATUS_LABEL, STATUS_ORDER, type StatusKey} from '../styles/palette';

type Props = {
  /** Who this row is about — used to build each option's accessible name. */
  readonly personName: string;
  /** Unique per row. Names alone collide when two differ only by case. */
  readonly groupId: string;
  /** The mark this santri carries, or nothing if they have not been marked. */
  readonly value: StatusKey | undefined;
  readonly onChange: (next: StatusKey) => void;
};

/**
 * Five tap targets — Hadir / Sakit / Izin / Alpa / Lainnya — as a radio group.
 *
 * Nothing is chosen until the teacher chooses it. A register that opened with
 * everyone on Hadir recorded a class nobody had looked at, so the empty state
 * here is the honest one and the boxes start dashed and unfilled.
 *
 * Tapping the mark a santri already carries takes it off again, which is the
 * only way back to unmarked after a mistap — a radio group cannot normally be
 * emptied by clicking.
 *
 * Every option shows its letter AND its word, so the meaning never rests on
 * colour alone. Each is a 48px target, operable with a single finger: no
 * swiping, no long-press, no drag, so there is nothing a teacher has to know a
 * gesture for.
 *
 * Implemented as real radios so arrow keys work and the group announces as
 * "Status kehadiran <name>, Hadir, 1 of 5".
 */
export const StatusPicker: React.FC<Props> = ({personName, groupId, value, onChange}) => {
  const groupName = `status-${groupId}`;

  return (
    <div
      className="cs-status"
      role="radiogroup"
      aria-label={
        value
          ? `Status kehadiran ${personName}`
          : `Status kehadiran ${personName}, belum ditandai`
      }
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
              // `change` does not fire when a checked radio is clicked again,
              // so clearing a mark has to be caught here.
              onClick={() => {
                if (selected) onChange(key);
              }}
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
