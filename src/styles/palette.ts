/**
 * ClassSync semantic palette — the single source of truth for colour.
 *
 * `tokens.css` mirrors these values as CSS custom properties, and
 * `palette.test.ts` asserts every pair meets its WCAG 2.2 AA ratio, so a
 * colour can never be changed into an unreadable one without a test failing.
 *
 * Naming is by ROLE, not by hue: `text` on `surface`, `brandInk` on `brand`.
 * The ember identity (#ff5500) is kept as the accent, with darker variants
 * where it has to carry text.
 */

export type ThemeColors = {
  /** Page background. */
  bg: string;
  /** Raised card/panel. */
  surface: string;
  /** Inset wells, table stripes, disabled fields. */
  surfaceSunken: string;
  /** Primary body text. */
  text: string;
  /** Secondary text: hints, metadata. */
  textMuted: string;
  /** Hairlines between content. Decorative only. */
  border: string;
  /** Borders that carry meaning: input outlines, control edges. Needs 3:1. */
  borderStrong: string;
  /** Brand accent for text and icons. Needs 4.5:1 on surface. */
  brand: string;
  /** Brand fill behind `brandInk`. */
  brandSolid: string;
  brandSolidHover: string;
  /** Text that sits on `brandSolid`. */
  brandInk: string;
  /** Subtle brand wash behind `brand` text. */
  brandTint: string;
  /** Destructive accent for text and icons. */
  danger: string;
  dangerSolid: string;
  dangerSolidHover: string;
  dangerInk: string;
  dangerTint: string;
  /** Focus ring. Needs 3:1 against both bg and surface. */
  focus: string;
};

export type StatusKey = 'hadir' | 'sakit' | 'izin' | 'alpa';

export type StatusColors = {
  /** Tint background for the unselected/!summary chip. */
  tint: string;
  /** Text/icon on `tint`. Needs 4.5:1. */
  ink: string;
  /** Fill when the status is selected. */
  solid: string;
  /** Text on `solid`. Needs 4.5:1. */
  solidInk: string;
};

export const light: ThemeColors = {
  bg: '#faf7f4',
  surface: '#ffffff',
  surfaceSunken: '#f3ede7',
  text: '#1a1512',
  textMuted: '#5b524b',
  border: '#e5ddd5',
  borderStrong: '#8a7d72',
  brand: '#b83c00',
  brandSolid: '#b83c00',
  brandSolidHover: '#993200',
  brandInk: '#ffffff',
  brandTint: '#fdeee6',
  danger: '#b3261e',
  dangerSolid: '#b3261e',
  dangerSolidHover: '#8c1d17',
  dangerInk: '#ffffff',
  dangerTint: '#fdecea',
  focus: '#0b57d0',
};

export const dark: ThemeColors = {
  bg: '#12100e',
  surface: '#1c1917',
  surfaceSunken: '#252120',
  text: '#f6f1ec',
  textMuted: '#b8aea5',
  border: '#332e2b',
  borderStrong: '#8a7d72',
  brand: '#ff8a4d',
  // Dark mode inverts the button: a bright fill carrying dark text reaches
  // 7.75:1, where a deep ember with white text only managed 3.99:1.
  brandSolid: '#ff8a4d',
  brandSolidHover: '#ffa273',
  brandInk: '#1a1512',
  brandTint: '#2c1a10',
  danger: '#ff8a80',
  dangerSolid: '#ff8a80',
  dangerSolidHover: '#ff9a91',
  dangerInk: '#1a1512',
  dangerTint: '#2c1512',
  focus: '#a8c7fa',
};

/**
 * Attendance statuses. Colour is never the only channel — every chip also
 * carries its letter (H/S/I/A) and an accessible name.
 */
export const statusLight: Record<StatusKey, StatusColors> = {
  hadir: {tint: '#e6f4ea', ink: '#17623b', solid: '#17623b', solidInk: '#ffffff'},
  sakit: {tint: '#fdf0dc', ink: '#7a4f00', solid: '#7a4f00', solidInk: '#ffffff'},
  izin: {tint: '#e6f0fb', ink: '#1a4f8a', solid: '#1a4f8a', solidInk: '#ffffff'},
  alpa: {tint: '#fdeceb', ink: '#9e2820', solid: '#9e2820', solidInk: '#ffffff'},
};

export const statusDark: Record<StatusKey, StatusColors> = {
  hadir: {tint: '#13291d', ink: '#7ddfa4', solid: '#1f7a48', solidInk: '#ffffff'},
  sakit: {tint: '#2b1f0c', ink: '#ffc97a', solid: '#8a5a00', solidInk: '#ffffff'},
  izin: {tint: '#12223a', ink: '#9cc5f5', solid: '#1f5f9e', solidInk: '#ffffff'},
  alpa: {tint: '#41201b', ink: '#ff9d94', solid: '#b32f26', solidInk: '#ffffff'},
};

/** Teacher-facing labels — used in the UI and as accessible names. */
export const STATUS_LABEL: Record<StatusKey, string> = {
  hadir: 'Hadir',
  sakit: 'Sakit',
  izin: 'Izin',
  alpa: 'Alpa',
};

/**
 * Report-facing labels. Indonesian report cards spell an unexplained absence
 * out as "tanpa keterangan" rather than using the teacher's shorthand.
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
