/**
 * Where the built app will be served from.
 *
 * Kept apart from vite.config.ts so it can be imported on its own: the config
 * reads package.json and pulls in the Tailwind and React plugins at module
 * scope, which is a lot of machinery to drag into a test about one string.
 */

/*
 * A GitHub Pages project site lives under /<repo>/, so every asset URL has to
 * carry that prefix — but only there. Everywhere else the app sits at the root
 * of whatever serves it (the dev server, `vite preview`, Vercel, a plain
 * static host) and relative URLs are what work.
 *
 * The prefix is read from GITHUB_REPOSITORY, which Actions always sets, rather
 * than written down. A hardcoded path survives exactly until the repository is
 * renamed, and then points every script, stylesheet and icon at a URL that no
 * longer exists: a blank page, served with a 200, with nothing in the build
 * log to suggest why.
 */
export function githubPagesBase(
  env: Record<string, string | undefined> = process.env,
): string | undefined {
  if (env.GITHUB_ACTIONS !== 'true') return undefined;

  const repo = env.GITHUB_REPOSITORY?.split('/')[1];
  if (!repo) return undefined;

  // A user or organisation site (owner.github.io) is served from the root.
  return repo.toLowerCase().endsWith('.github.io') ? '/' : `/${repo}/`;
}
