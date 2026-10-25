/**
 * ClassSync palette — ink on paper, with colour reserved for attendance.
 *
 * The rule that shapes everything else: **the only colour in the product is the
 * four attendance marks.** Buttons, links, headings and rules are ink. A colour
 * on screen therefore always answers one question — was this santri here?
 *
 * The four marks are the user's palette (colorhunt.co/palette/ff7f50ffd16606d6a0118ab2).
 * Measured, they can only be used one way: as solid fills carrying ink. As text
 * on white they reach 2.50, 1.44, 1.89 and 3.96 — all failing 4.5:1 — while as
 * fills under ink they reach 11.13, 14.56, 5.30 and 8.40. So a mark is a filled
 * block with a letter in it, never a coloured word and never a coloured hairline.
 *
 * `palette.test.ts` asserts every pair, so a colour cannot be changed into an
 * unreadable one without a test failing.
 */

export type ThemeColors = {
  /** The page. */
  bg: string;
  /** Same as the page: there are no cards to raise. */
  surface: string;
  /** The few inset areas that genuinely recede. */
  surfaceSunken: string;
  /** Body text, headings, buttons. */
  text: string;
  /** Secondary text: meta, hints, counts. */
  textMuted: string;
  /** Hairlines between rows. Separation, not enclosure. */
  border: string;
  /** Edges that carry meaning — input outlines. Needs 3:1. */
  borderStrong: string;
  /** Ink. Kept under the old names so the rest of the app need not care. */
  brand: string;
  brandSolid: string;
  brandSolidHover: string;
  brandInk: string;
  brandTint: string;
  /** Destructive actions are ink too; the words and the gate carry the weight. */
  danger: string;
  dangerSolid: string;
  dangerSolidHover: string;
  dangerInk: string;
  /** The one place coral appears outside a mark: flagging a destructive area. */
  dangerTint: string;
  focus: string;
};

export type StatusKey = 'hadir' | 'sakit' | 'izin' | 'alpa';

export type StatusColors = {
  /** Soft wash, for summary chips away from the register. */
  tint: string;
  /** Text on `tint`. */
  ink: string;
  /** The mark itself. */
  solid: string;
  /** The letter inside the mark. */
  solidInk: string;
};

export const light: ThemeColors = {
  bg: '#ffffff',
  surface: '#ffffff',
  surfaceSunken: '#f6f5f2',
  text: '#000000',
  textMuted: '#5b5b5b',
  border: '#e2dfd8',
  borderStrong: '#8c8880',
  brand: '#000000',
  brandSolid: '#000000',
  brandSolidHover: '#2b2b2b',
  brandInk: '#ffffff',
  brandTint: '#f6f5f2',
  danger: '#000000',
  dangerSolid: '#000000',
  dangerSolidHover: '#2b2b2b',
  dangerInk: '#ffffff',
  dangerTint: '#fff1ea',
  focus: '#000000',
};

export const dark: ThemeColors = {
  bg: '#111010',
  surface: '#111010',
  surfaceSunken: '#1b1a18',
  text: '#fafaf8',
  textMuted: '#adaaa4',
  border: '#302e2b',
  borderStrong: '#8c8880',
  brand: '#fafaf8',
  brandSolid: '#fafaf8',
  brandSolidHover: '#e4e2dd',
  brandInk: '#111010',
  brandTint: '#1b1a18',
  danger: '#fafaf8',
  dangerSolid: '#fafaf8',
  dangerSolidHover: '#e4e2dd',
  dangerInk: '#111010',
  dangerTint: '#2a1a14',
  focus: '#fafaf8',
};

/**
 * The marks. Identical in both themes — a bright fill carrying dark ink reads
 * the same on paper and at night, so Hadir is one colour the teacher learns
 * once.
 */
const MARK = {
  hadir: '#06d6a0',
  sakit: '#ffd166',
  izin: '#118ab2',
  alpa: '#ff7f50',
} as const;

export const statusLight: Record<StatusKey, StatusColors> = {
  hadir: {tint: '#e3f9f1', ink: '#055c45', solid: MARK.hadir, solidInk: '#000000'},
  sakit: {tint: '#fff4de', ink: '#6b4a00', solid: MARK.sakit, solidInk: '#000000'},
  izin: {tint: '#e2f1f7', ink: '#0d5e7a', solid: MARK.izin, solidInk: '#000000'},
  alpa: {tint: '#ffeee7', ink: '#8c3410', solid: MARK.alpa, solidInk: '#000000'},
};

export const statusDark: Record<StatusKey, StatusColors> = {
  hadir: {tint: '#0c2a22', ink: '#5fe3bd', solid: MARK.hadir, solidInk: '#111010'},
  sakit: {tint: '#2b2310', ink: '#ffd98a', solid: MARK.sakit, solidInk: '#111010'},
  izin: {tint: '#0d2630', ink: '#6cc2dd', solid: MARK.izin, solidInk: '#111010'},
  alpa: {tint: '#2e1a12', ink: '#ff9f7d', solid: MARK.alpa, solidInk: '#111010'},
};

/** Teacher-facing labels. */
export const STATUS_LABEL: Record<StatusKey, string> = {
  hadir: 'Hadir',
  sakit: 'Sakit',
  izin: 'Izin',
  alpa: 'Alpa',
};

/**
 * Report-facing labels. Indonesian report cards spell an unexplained absence
 * out rather than using the teacher's shorthand.
 */
export const STATUS_REPORT_LABEL: Record<StatusKey, string> = {
  hadir: 'Hadir',
  sakit: 'Sakit',
  izin: 'Izin',
  alpa: 'Tanpa keterangan',
};

/** The single-letter codes the official report uses. */
export const STATUS_CODE: Record<StatusKey, 'H' | 'S' | 'I' | 'A'> = {
  hadir: 'H',
  sakit: 'S',
  izin: 'I',
  alpa: 'A',
};

export const STATUS_ORDER: StatusKey[] = ['hadir', 'sakit', 'izin', 'alpa'];
