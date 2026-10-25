import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import {describe, expect, it, vi} from 'vitest';
import {Button} from './Button';
import {Field} from './Field';
import {StatusPicker} from './StatusPicker';

describe('Button', () => {
  it('always exposes its visible text as the accessible name', () => {
    render(<Button icon={<svg />}>Simpan presensi</Button>);
    // The icon is decorative, so the name comes from the label alone — which is
    // also what WCAG 2.5.3 Label in Name wants.
    expect(screen.getByRole('button', {name: 'Simpan presensi'})).toBeInTheDocument();
  });

  it('defaults to type="button" so it cannot submit a form by accident', () => {
    render(<Button>Batal</Button>);
    expect(screen.getByRole('button')).toHaveAttribute('type', 'button');
  });

  it('can still be an explicit submit button', () => {
    render(<Button type="submit">Simpan</Button>);
    expect(screen.getByRole('button')).toHaveAttribute('type', 'submit');
  });

  it('does not fire when disabled', async () => {
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        Ekspor
      </Button>,
    );
    await userEvent.click(screen.getByRole('button'));
    expect(onClick).not.toHaveBeenCalled();
  });
});

describe('Field', () => {
  it('associates the label with the control', () => {
    render(
      <Field id="nama" label="Nama santri">
        {(p) => <input className="cs-input" {...p} />}
      </Field>,
    );
    expect(screen.getByLabelText('Nama santri')).toBeInTheDocument();
  });

  it('links hint text to the control instead of using a placeholder', () => {
    render(
      <Field id="tanggal" label="Tanggal" hint="Pilih hari kegiatan belajar.">
        {(p) => <input className="cs-input" {...p} />}
      </Field>,
    );
    const input = screen.getByLabelText('Tanggal');
    expect(input).toHaveAccessibleDescription('Pilih hari kegiatan belajar.');
    expect(input).not.toHaveAttribute('placeholder');
  });

  it('marks the control invalid and describes the error in text', () => {
    render(
      <Field id="nama" label="Nama santri" error="Masukkan nama santri.">
        {(p) => <input className="cs-input" {...p} />}
      </Field>,
    );
    const input = screen.getByLabelText('Nama santri');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription(/Masukkan nama santri\./);
  });

  it('announces errors with a hidden prefix so they are not mistaken for hints', () => {
    render(
      <Field id="nama" label="Nama" error="Masukkan nama.">
        {(p) => <input className="cs-input" {...p} />}
      </Field>,
    );
    expect(screen.getByText('Error:')).toHaveClass('cs-visually-hidden');
  });

  it('keeps hint and error descriptions together', () => {
    render(
      <Field id="x" label="X" hint="Petunjuk." error="Ada yang salah.">
        {(p) => <input className="cs-input" {...p} />}
      </Field>,
    );
    expect(screen.getByLabelText('X')).toHaveAccessibleDescription(
      /Petunjuk\.[\s\S]*Ada yang salah\./,
    );
  });
});

describe('StatusPicker', () => {
  const setup = (value: 'hadir' | 'sakit' | 'izin' | 'alfa' = 'hadir') => {
    const onChange = vi.fn();
    render(<StatusPicker personName="Budi" value={value} onChange={onChange} />);
    return {onChange};
  };

  it('names the group after the person it belongs to', () => {
    setup();
    expect(
      screen.getByRole('radiogroup', {name: 'Status kehadiran Budi'}),
    ).toBeInTheDocument();
  });

  it('offers all four Indonesian statuses as real radios', () => {
    setup();
    expect(screen.getByRole('radio', {name: 'Hadir'})).toBeInTheDocument();
    expect(screen.getByRole('radio', {name: 'Sakit'})).toBeInTheDocument();
    expect(screen.getByRole('radio', {name: 'Izin'})).toBeInTheDocument();
    expect(screen.getByRole('radio', {name: 'Alfa'})).toBeInTheDocument();
  });

  it('shows which status is set', () => {
    setup('izin');
    expect(screen.getByRole('radio', {name: 'Izin'})).toBeChecked();
    expect(screen.getByRole('radio', {name: 'Hadir'})).not.toBeChecked();
  });

  it('reports the chosen status', async () => {
    const {onChange} = setup();
    await userEvent.click(screen.getByRole('radio', {name: 'Sakit'}));
    expect(onChange).toHaveBeenCalledWith('sakit');
  });

  it('is operable by a single tap — no gesture required', async () => {
    const {onChange} = setup();
    // A plain click on the label reaches the control: no swipe, no long-press,
    // nothing that needs WCAG 2.5.7's drag alternative.
    await userEvent.click(screen.getByText('Alfa'));
    expect(onChange).toHaveBeenCalledWith('alfa');
  });

  it('writes each status as a letter as well as a word, never colour alone', () => {
    setup();
    for (const code of ['H', 'S', 'I', 'A']) {
      expect(screen.getByText(code)).toBeInTheDocument();
    }
  });
});
