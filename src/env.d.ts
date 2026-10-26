/**
 * The app's version, inlined at build time from package.json by the `define`
 * in vite.config.ts (and mirrored in vitest.config.ts, so tests see the same
 * string). It is a constant, not a variable: the bundler substitutes the
 * literal, so there is nothing to import and nothing to read at runtime.
 */
declare const __APP_VERSION__: string;
