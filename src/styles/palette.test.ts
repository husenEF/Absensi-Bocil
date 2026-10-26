import {describe, expect, it} from 'vitest';
import {ratio} from '../utils/contrast';
import {
  dark,
  light,
  statusDark,
  statusLight,
  STATUS_CODE,
  STATUS_LABEL,
  STATUS_REPORT_LABEL,
  STATUS_ORDER,
  type StatusColors,
  type ThemeColors,
} from './palette';

/**
 * WCAG 2.2 AA thresholds.
 * - 1.4.3 Contrast (Minimum): 4.5:1 for body text.
 * - 1.4.11 Non-text Contrast: 3:1 for UI component boundaries and focus rings.
 */
const TEXT = 4.5;
const NON_TEXT = 3;

const themes: Array<[string, ThemeColors]> = [
  ['light', light],
  ['dark', dark],
];

describe.each(themes)('%s theme', (_name, t) => {
  it('body text is readable on every surface', () => {
    expect(ratio(t.text, t.bg)).toBeGreaterThanOrEqual(TEXT);
    expect(ratio(t.text, t.surface)).toBeGreaterThanOrEqual(TEXT);
    expect(ratio(t.text, t.surfaceSunken)).toBeGreaterThanOrEqual(TEXT);
  });

  it('muted text is readable on every surface', () => {
    expect(ratio(t.textMuted, t.bg)).toBeGreaterThanOrEqual(TEXT);
    expect(ratio(t.textMuted, t.surface)).toBeGreaterThanOrEqual(TEXT);
    expect(ratio(t.textMuted, t.surfaceSunken)).toBeGreaterThanOrEqual(TEXT);
  });

  it('control borders meet the non-text minimum', () => {
    expect(ratio(t.borderStrong, t.surface)).toBeGreaterThanOrEqual(NON_TEXT);
    expect(ratio(t.borderStrong, t.bg)).toBeGreaterThanOrEqual(NON_TEXT);
  });

  it('brand text is readable on surface and on its own tint', () => {
    expect(ratio(t.brand, t.surface)).toBeGreaterThanOrEqual(TEXT);
    expect(ratio(t.brand, t.brandTint)).toBeGreaterThanOrEqual(TEXT);
  });

  it('text on the primary button is readable, in rest and hover', () => {
    expect(ratio(t.brandInk, t.brandSolid)).toBeGreaterThanOrEqual(TEXT);
    // The old theme failed exactly here: hover resolved to a near-white,
    // so white button labels disappeared.
    expect(ratio(t.brandInk, t.brandSolidHover)).toBeGreaterThanOrEqual(TEXT);
  });

  it('danger text and the danger button are readable', () => {
    expect(ratio(t.danger, t.surface)).toBeGreaterThanOrEqual(TEXT);
    expect(ratio(t.danger, t.dangerTint)).toBeGreaterThanOrEqual(TEXT);
    expect(ratio(t.dangerInk, t.dangerSolid)).toBeGreaterThanOrEqual(TEXT);
    expect(ratio(t.dangerInk, t.dangerSolidHover)).toBeGreaterThanOrEqual(TEXT);
  });

  it('the focus ring is visible against both backgrounds', () => {
    expect(ratio(t.focus, t.bg)).toBeGreaterThanOrEqual(NON_TEXT);
    expect(ratio(t.focus, t.surface)).toBeGreaterThanOrEqual(NON_TEXT);
  });

  it('the primary button has a visible boundary against the page', () => {
    // Signal yellow is a pale fill: against white it reaches only ~1.4:1, and
    // no yellow bright enough to be a signal will ever clear 3:1 on paper.
    // The boundary is therefore drawn, not filled — every brand surface sits
    // inside an ink keyline, and that keyline is what 1.4.11 measures.
    expect(ratio(t.brandEdge, t.surface)).toBeGreaterThanOrEqual(NON_TEXT);
    expect(ratio(t.brandEdge, t.bg)).toBeGreaterThanOrEqual(NON_TEXT);
  });
});

const statusThemes: Array<[string, Record<string, StatusColors>, ThemeColors]> = [
  ['light', statusLight, light],
  ['dark', statusDark, dark],
];

describe.each(statusThemes)('%s attendance statuses', (_name, statuses, t) => {
  it.each(STATUS_ORDER)('%s is readable as a chip and when selected', (key) => {
    const s = statuses[key];
    expect(ratio(s.ink, s.tint)).toBeGreaterThanOrEqual(TEXT);
    expect(ratio(s.solidInk, s.solid)).toBeGreaterThanOrEqual(TEXT);
    // The chip has to be distinguishable from the card it sits on.
    expect(ratio(s.tint, t.surface)).toBeGreaterThanOrEqual(1.05);
  });

  it('gives every status its own colour', () => {
    // Contrast ratio is luminance-only, so it cannot tell green from blue at the
    // same lightness — there is no point asserting a ratio between two statuses.
    // What matters for WCAG 1.4.1 is that colour is never the only channel, which
    // the letter code covers (asserted separately), and that no two statuses
    // accidentally share a swatch.
    const solids = STATUS_ORDER.map((k) => statuses[k].solid);
    expect(new Set(solids).size).toBe(STATUS_ORDER.length);
  });
});

describe('status codes', () => {
  it('carries meaning in a letter, so colour is never the only channel (WCAG 1.4.1)', () => {
    const codes = STATUS_ORDER.map((k) => STATUS_CODE[k]);
    expect(codes).toEqual(['H', 'S', 'I', 'A']);
    expect(new Set(codes).size).toBe(4);
  });

  it('labels every status in Indonesian for its accessible name', () => {
    expect(STATUS_ORDER.map((k) => STATUS_LABEL[k])).toEqual([
      'Hadir',
      'Sakit',
      'Izin',
      'Alpa',
    ]);
  });
});

describe('report labels', () => {
  it('spells an unexplained absence out for reports, not as teacher shorthand', () => {
    expect(STATUS_REPORT_LABEL.alpa).toBe('Tanpa keterangan');
    expect(STATUS_REPORT_LABEL.hadir).toBe('Hadir');
  });
});

describe('colour is reserved for attendance', () => {
  const marks = (s: Record<string, StatusColors>) =>
    STATUS_ORDER.map((k) => s[k].solid.toLowerCase());

  it.each([
    ['light', light, statusLight],
    ['dark', dark, statusDark],
  ])('%s: no chrome colour reuses a mark colour', (_n, theme, statuses) => {
    // If a button or a heading borrowed a mark's colour, a colour on screen
    // would stop meaning one thing. Ink and paper only, everywhere else.
    //
    // Sakit is the single, deliberate exception: the ClassSync palette paints
    // the primary action and the Sakit mark in the same yellow. Pinning it
    // here means the overlap stays one colour in one place rather than
    // spreading to Hadir, Izin or Alpa, which must never appear as chrome.
    const chrome = [
      theme.bg,
      theme.surface,
      theme.text,
      theme.textMuted,
      theme.border,
      theme.borderStrong,
      theme.brandSolid,
      theme.brandEdge,
      theme.dangerSolid,
      theme.focus,
    ].map((c) => c.toLowerCase());

    const s = statuses as Record<string, StatusColors>;
    const sharedYellow = s.sakit.solid.toLowerCase();
    expect(sharedYellow).toBe(theme.brandSolid.toLowerCase());

    for (const mark of marks(s)) {
      if (mark === sharedYellow) continue;
      expect(chrome, `${mark} is used as chrome`).not.toContain(mark);
    }
  });

  it.each([
    ['light', statusLight],
    ['dark', statusDark],
  ])('%s: every mark is a fill carrying ink, not coloured text', (_n, statuses) => {
    for (const key of STATUS_ORDER) {
      const s = (statuses as Record<string, StatusColors>)[key];
      // The letter inside the mark is what must be readable.
      expect(ratio(s.solidInk, s.solid)).toBeGreaterThanOrEqual(4.5);
    }
  });
});
