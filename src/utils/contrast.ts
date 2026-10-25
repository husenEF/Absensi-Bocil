/**
 * WCAG 2.x relative luminance and contrast ratio.
 *
 * Used by the token tests so colour pairs are verified rather than eyeballed.
 * Reference: https://www.w3.org/TR/WCAG22/#dfn-relative-luminance
 */

export type Rgb = {r: number; g: number; b: number};

export function parseHex(hex: string): Rgb {
  const clean = hex.trim().replace(/^#/, '');
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean;

  if (!/^[0-9a-fA-F]{6}$/.test(full)) {
    throw new Error(`Not a hex colour: ${hex}`);
  }

  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  };
}

function channelLuminance(value8Bit: number): number {
  const c = value8Bit / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

export function relativeLuminance(color: string | Rgb): number {
  const {r, g, b} = typeof color === 'string' ? parseHex(color) : color;
  return (
    0.2126 * channelLuminance(r) +
    0.7152 * channelLuminance(g) +
    0.0722 * channelLuminance(b)
  );
}

/** Contrast ratio between two colours, from 1 (identical) to 21 (black on white). */
export function contrastRatio(a: string | Rgb, b: string | Rgb): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);
  return (lighter + 0.05) / (darker + 0.05);
}

/** Rounded to 2dp, for readable assertion messages. */
export function ratio(a: string | Rgb, b: string | Rgb): number {
  return Math.round(contrastRatio(a, b) * 100) / 100;
}
