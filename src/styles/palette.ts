/**
 * ClassSync palette — a register drawn in heavy keylines.
 *
 * Two rules hold the whole product together.
 *
 * **One signal colour.** Signal yellow marks the single thing the teacher came
 * here to do: save the register. It appears on the primary action, the active
 * tab and nowhere else. It is never load-bearing on its own — every yellow
 * surface sits inside an ink keyline, which is what carries the 3:1 boundary a
 * pale fill cannot.
 *
 * **Four marks, and nothing else wears them.** Hadir, Sakit, Izin and Alpa own
 * the only other colours on screen, so a colour always answers one question:
 * was this santri here? Buttons, headings, rules and destructive actions are
 * all ink, which is also why a red "delete" never gets confused with a coral
 * Alpa.
 *
 * Structure is drawn rather than shaded: a 2px ink keyline and a hard offset
 * shadow in the same ink. There is no blur and no gradient anywhere, so the
 * interface stays legible in sunlight on a phone held at arm's length.
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
  /** The keyline drawn around a brand fill. A pale fill cannot carry 3:1 alone. */
  brandEdge: string;
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
  bg: '#faf9f5',
  surface: '#ffffff',
  surfaceSunken: '#f1efe6',
  text: '#121212',
  textMuted: '#56534c',
  border: '#ded9cc',
  borderStrong: '#121212',
  brand: '#121212',
  brandSolid: '#ffe14d',
  brandSolidHover: '#ffd60a',
  brandInk: '#121212',
  brandTint: '#fff8d6',
  brandEdge: '#121212',
  danger: '#121212',
  dangerSolid: '#121212',
  dangerSolidHover: '#2f2f2f',
  dangerInk: '#ffffff',
  dangerTint: '#fdeee9',
  focus: '#121212',
};

export const dark: ThemeColors = {
  bg: '#0b0b0a',
  surface: '#171714',
  surfaceSunken: '#211f1b',
  text: '#f7f6f1',
  textMuted: '#a9a69c',
  border: '#36342d',
  borderStrong: '#8b887f',
  brand: '#f7f6f1',
  brandSolid: '#ffe14d',
  brandSolidHover: '#ffd60a',
  brandInk: '#121212',
  brandTint: '#2b2614',
  brandEdge: '#f7f6f1',
  danger: '#f7f6f1',
  dangerSolid: '#f7f6f1',
  dangerSolidHover: '#e2e0d9',
  dangerInk: '#121212',
  dangerTint: '#2d1a14',
  focus: '#ffe14d',
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
  hadir: {tint: '#e3f9f1', ink: '#055c45', solid: MARK.hadir, solidInk: '#121212'},
  sakit: {tint: '#fff4de', ink: '#6b4a00', solid: MARK.sakit, solidInk: '#121212'},
  izin: {tint: '#e2f1f7', ink: '#0d5e7a', solid: MARK.izin, solidInk: '#121212'},
  alpa: {tint: '#ffeee7', ink: '#8c3410', solid: MARK.alpa, solidInk: '#121212'},
};

export const statusDark: Record<StatusKey, StatusColors> = {
  hadir: {tint: '#0c2a22', ink: '#5fe3bd', solid: MARK.hadir, solidInk: '#121212'},
  sakit: {tint: '#2b2310', ink: '#ffd98a', solid: MARK.sakit, solidInk: '#121212'},
  izin: {tint: '#0d2630', ink: '#6cc2dd', solid: MARK.izin, solidInk: '#121212'},
  alpa: {tint: '#3a211a', ink: '#ff9f7d', solid: MARK.alpa, solidInk: '#121212'},
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
