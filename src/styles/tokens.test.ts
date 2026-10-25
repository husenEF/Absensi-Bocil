import fs from 'fs';
import path from 'path';
import {describe, expect, it} from 'vitest';
import {
  dark,
  light,
  statusDark,
  statusLight,
  STATUS_ORDER,
  type StatusKey,
} from './palette';

const css = fs.readFileSync(path.resolve(__dirname, 'tokens.css'), 'utf8');

/** The `:root` block holds light mode; `html.dark` holds dark mode. */
function blockFor(selector: string): string {
  const start = css.indexOf(selector);
  expect(start, `${selector} block missing from tokens.css`).toBeGreaterThan(-1);
  const open = css.indexOf('{', start);
  const close = css.indexOf('}', open);
  return css.slice(open, close);
}

function tokenIn(block: string, name: string): string {
  const match = block.match(new RegExp(`--${name}:\\s*([^;]+);`));
  expect(match, `--${name} is not defined`).not.toBeNull();
  return (match as RegExpMatchArray)[1].trim().toLowerCase();
}

const lightBlock = blockFor(':root');
const darkBlock = blockFor('html.dark');

const PAIRS: Array<[string, keyof typeof light]> = [
  ['cs-bg', 'bg'],
  ['cs-surface', 'surface'],
  ['cs-surface-sunken', 'surfaceSunken'],
  ['cs-text', 'text'],
  ['cs-text-muted', 'textMuted'],
  ['cs-border', 'border'],
  ['cs-border-strong', 'borderStrong'],
  ['cs-brand', 'brand'],
  ['cs-brand-solid', 'brandSolid'],
  ['cs-brand-solid-hover', 'brandSolidHover'],
  ['cs-brand-ink', 'brandInk'],
  ['cs-brand-tint', 'brandTint'],
  ['cs-danger', 'danger'],
  ['cs-danger-solid', 'dangerSolid'],
  ['cs-danger-solid-hover', 'dangerSolidHover'],
  ['cs-danger-ink', 'dangerInk'],
  ['cs-danger-tint', 'dangerTint'],
  ['cs-focus', 'focus'],
];

describe('tokens.css mirrors the tested palette', () => {
  it.each(PAIRS)('--%s matches the light palette', (cssName, key) => {
    expect(tokenIn(lightBlock, cssName)).toBe(light[key].toLowerCase());
  });

  it.each(PAIRS)('--%s matches the dark palette', (cssName, key) => {
    expect(tokenIn(darkBlock, cssName)).toBe(dark[key].toLowerCase());
  });

  it.each(STATUS_ORDER)('%s status colours match the light palette', (key: StatusKey) => {
    const s = statusLight[key];
    expect(tokenIn(lightBlock, `cs-${key}-tint`)).toBe(s.tint.toLowerCase());
    expect(tokenIn(lightBlock, `cs-${key}-ink`)).toBe(s.ink.toLowerCase());
    expect(tokenIn(lightBlock, `cs-${key}-solid`)).toBe(s.solid.toLowerCase());
    expect(tokenIn(lightBlock, `cs-${key}-solid-ink`)).toBe(s.solidInk.toLowerCase());
  });

  it.each(STATUS_ORDER)('%s status colours match the dark palette', (key: StatusKey) => {
    const s = statusDark[key];
    expect(tokenIn(darkBlock, `cs-${key}-tint`)).toBe(s.tint.toLowerCase());
    expect(tokenIn(darkBlock, `cs-${key}-ink`)).toBe(s.ink.toLowerCase());
    expect(tokenIn(darkBlock, `cs-${key}-solid`)).toBe(s.solid.toLowerCase());
    expect(tokenIn(darkBlock, `cs-${key}-solid-ink`)).toBe(s.solidInk.toLowerCase());
  });
});

describe('sizing rules', () => {
  it('sets the body/control size to 18px, above the iOS zoom threshold', () => {
    expect(tokenIn(lightBlock, 'cs-text-base')).toBe('1.125rem');
  });

  it('never allows text below 14px', () => {
    expect(tokenIn(lightBlock, 'cs-text-xs')).toBe('0.875rem');
  });

  it('sets a 48px tap target with an 8px gap', () => {
    expect(tokenIn(lightBlock, 'cs-tap')).toBe('48px');
    expect(tokenIn(lightBlock, 'cs-tap-gap')).toBe('8px');
  });

  it('keeps focused controls clear of the fixed tab bar (WCAG 2.4.11)', () => {
    expect(css).toMatch(/scroll-padding-bottom:/);
  });

  it('honours prefers-reduced-motion', () => {
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)/);
  });

  it('gives every focusable control a visible 3px focus ring', () => {
    expect(css).toMatch(/:focus-visible\s*{[^}]*outline:\s*3px solid var\(--cs-focus\)/);
  });
});
