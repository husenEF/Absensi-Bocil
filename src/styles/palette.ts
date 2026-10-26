/**
 * ClassSync palette — a register drawn in heavy keylines.
 *
 * This file is the single source of truth for colour. `tokens.css` mirrors it
 * into CSS custom properties, `index.css` repoints the legacy Tailwind scales
 * at the same values, and `palette.test.ts` / `tokens.test.ts` assert that the
 * three stay in step and that every pair is readable. Change a colour here and
 * the tests will tell you what else has to move.
 *
 * The values are the ClassSync design-system palette, which arrives as three
 * Tailwind sketches — a numbered scale, a semantic `app.*` map and a flat
 * `classsync.light/dark` map. They describe the same eighteen colours, so they
 * are folded together here once, by role rather than by shade number.
 *
 * Two rules hold the whole product together.
 *
 * **One signal colour.** Signal yellow — #ffd966 by day, the dimmer gold
 * #e5c05e at night — marks the single thing the teacher came here to do: save
 * the register. It appears on the primary action, the active tab and nowhere
 * else. It is never load-bearing on its own; every yellow surface sits inside
 * an ink keyline, which is what carries the 3:1 boundary a pale fill cannot.
 *
 * **Four marks, and nothing else wears them.** Hadir, Sakit, Izin and Alpa own
 * the only other colours on screen, so a colour always answers one question:
 * was this santri here? Buttons, headings, rules and destructive actions are
 * all ink, which is also why a red "delete" never gets confused with an orange
 * Alpa. The one deliberate overlap is Sakit, which the palette paints in the
 * same yellow as the primary action — see `palette.test.ts`, which pins that
 * down as the only exception rather than letting it spread.
 *
 * Structure is drawn rather than shaded: a 2px keyline and a hard offset
 * shadow in the same ink. There is no blur and no gradient anywhere, so the
 * interface stays legible in sunlight on a phone held at arm's length. At
 * night the keyline inverts to a light grey, because a black edge drawn on a
 * charcoal page draws nothing.
 *
 * Measured, the marks can only be used one way: as solid fills carrying ink.
 * As words on paper they fall well under 4.5:1; as fills they clear it
 * comfortably. So a mark is a filled block with a letter in it, never a
 * coloured word and never a coloured hairline.
 */

export type ThemeColors = {
  /** The page. */
  bg: string;
  /** A panel lifted off the page. */
  surface: string;
  /** Inset areas that recede: input fills, trays. */
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
  /** The one place a warm wash appears outside a mark: flagging a destructive area. */
  dangerTint: string;
  focus: string;
  /** The drawn edge every panel, control and offset shadow is made of. */
  edge: string;
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
  bg: '#f5f5f3',
  surface: '#fdfdfc',
  surfaceSunken: '#e8e8e8',
  text: '#1a1d1a',
  // The palette's one grey, #707070, is specified for "sub-text & borders".
  // It clears 4.5:1 on the page but only reaches 4.04:1 inside an inset tray,
  // so running text drops two steps and #707070 stays on the borders, where
  // the bar is 3:1.
  textMuted: '#656565',
  border: '#d3d3d3',
  borderStrong: '#707070',
  brand: '#1a1d1a',
  brandSolid: '#ffd966',
  brandSolidHover: '#ffcc33',
  brandInk: '#1a1d1a',
  brandTint: '#fff6dc',
  brandEdge: '#1a1d1a',
  danger: '#1a1d1a',
  dangerSolid: '#1a1d1a',
  dangerSolidHover: '#2c2c2c',
  dangerInk: '#fdfdfc',
  dangerTint: '#fff1e4',
  focus: '#1a1d1a',
  edge: '#1a1d1a',
};

/**
 * Night is a cool charcoal rather than a neutral grey, and it is built from
 * one numbered scale: 900 is the deepest well, 800 the page, 700 a panel
 * lifted off it, 500 a hairline, 300 a drawn edge, 200 sub-text, 100 the
 * reading colour. Running the whole theme off one ramp is what stopped the
 * old dark mode drifting — a #555 rule beside a #202020 tray beside a
 * #3e3e3e card never belonged to the same family.
 */
export const dark: ThemeColors = {
  bg: '#282830',
  surface: '#32323b',
  surfaceSunken: '#1e1e24',
  text: '#e4e4e8',
  // Two steps down the ramp, which still clears 4.5:1 on all three surfaces.
  // The step below it, #8e8e9a, only reaches 3.92:1 on a panel, so it stays on
  // the borders, where the bar is 3:1.
  textMuted: '#b8b8c2',
  border: '#52525e',
  borderStrong: '#8e8e9a',
  brand: '#e4e4e8',
  // Signal yellow is dimmed to a muted gold at night; it still carries dark ink.
  brandSolid: '#e5c05e',
  brandSolidHover: '#f0cf74',
  brandInk: '#1e1e24',
  brandTint: '#3a3016',
  brandEdge: '#e4e4e8',
  danger: '#e4e4e8',
  dangerSolid: '#e4e4e8',
  dangerSolidHover: '#b8b8c2',
  dangerInk: '#1e1e24',
  dangerTint: '#3a2419',
  focus: '#e5c05e',
  // Light enough to read as a drawn edge on charcoal, and to clear 3:1 against
  // the page, a panel and a sunken tray — the dark theme's whole structure
  // rests on it.
  edge: '#8e8e9a',
};

/**
 * The marks.
 *
 * By day they are bright fills carrying dark ink. At night they are the same
 * four hues muted a step, so a wall of marks does not glare in a dark room,
 * and they still carry dark ink. The letter inside the block is what the
 * teacher reads either way, and it is always the readable half of the pair.
 */
const MARK_LIGHT = {
  hadir: '#2ecc71',
  sakit: '#ffd966',
  izin: '#1f6ed0',
  alpa: '#ff9f43',
} as const;

/**
 * At night the marks are the palette's muted accents rather than the daylight
 * fills: bright enough to read as colour on charcoal, dim enough that a
 * screenful of them does not burn in a dark room.
 *
 * Izin is the one adjustment. The palette's #4a82c4 carries its letter at only
 * 4.17:1 in dark ink and 3.62:1 in light, so no ink makes it legible; it is
 * lifted two steps to #5b90ce, the nearest blue of the same hue that clears
 * 4.5:1. Every mark then carries the same dark ink, which is also what keeps
 * the four reading as one set.
 */
const MARK_DARK = {
  hadir: '#3da868',
  sakit: '#e5c05e',
  izin: '#5b90ce',
  alpa: '#d98943',
} as const;

export const statusLight: Record<StatusKey, StatusColors> = {
  hadir: {tint: '#e4f8ed', ink: '#1a6b3c', solid: MARK_LIGHT.hadir, solidInk: '#1a1d1a'},
  sakit: {tint: '#fff6dc', ink: '#6b4a00', solid: MARK_LIGHT.sakit, solidInk: '#1a1d1a'},
  // Blue is the one mark too dark for black type; its block carries paper.
  izin: {tint: '#e4eefb', ink: '#17508f', solid: MARK_LIGHT.izin, solidInk: '#fdfdfc'},
  alpa: {tint: '#fff1e4', ink: '#8a4408', solid: MARK_LIGHT.alpa, solidInk: '#1a1d1a'},
};

export const statusDark: Record<StatusKey, StatusColors> = {
  hadir: {tint: '#163322', ink: '#7fd9a0', solid: MARK_DARK.hadir, solidInk: '#1e1e24'},
  sakit: {tint: '#352b12', ink: '#e8c75e', solid: MARK_DARK.sakit, solidInk: '#1e1e24'},
  izin: {tint: '#1e2c45', ink: '#9cc0ec', solid: MARK_DARK.izin, solidInk: '#1e1e24'},
  alpa: {tint: '#33210f', ink: '#e8a263', solid: MARK_DARK.alpa, solidInk: '#1e1e24'},
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
