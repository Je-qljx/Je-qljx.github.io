## Development

When starting the dev server, use background mode:

```
astro dev --background
```

Manage the background server with `astro dev stop`, `astro dev status`, and `astro dev logs`.

## Overview

Personal static site for Je (Astro 7, all content zh-CN), deployed to GitHub Pages at https://Je-qljx.github.io on every push to `main` (`.github/workflows/pages.yml`). Requires Node >= 22.12.

## Commands

- Typecheck: `npm run check` (`astro check`)
- Build: `npm run build` → `dist/` (sitemap generated automatically)
- No lint or test setup.

If `astro sync`/`dev`/`build` fail with `require is not defined` under newer Node versions, run `node patch-vite.mjs` (session-local vite patch; revert with `npm install`). See the comment at its top.

## Structure & conventions

- `src/config.ts`: site identity/socials. `src/data/matrix.ts`: entries shared by the homepage `#matrix` section and the `/matrix/` page.
- Content collections live in `src/content/blog` and `src/content/projects`, with Zod schemas in `src/content.config.ts`. Blog posts support `draft: true`; projects sort by `order`, and the homepage features those with `featured: true`.
- Project page body (介绍) is copied verbatim from the corresponding git repository's README: mirror its full content, dropping only the repo's top-level `#` title line (it duplicates the frontmatter `title` heading) and leaving the rest of sections/tables/code intact.
- Adding a top-level page requires updating BOTH the `nav` array and the breadcrumb `PAGE_HREFS` map in `src/components/Header.astro`.
- Cards use the stretched-link pattern (title link gets an `::after` with `inset: 0`; card is `position: relative`) so the whole card is clickable. Hover spotlight/ghost-frame effects are class-driven in `src/scripts/motion.ts` (`RIPPLE_SELECTOR`, spot targets, `FRAME_EXCLUDE`) — register new card classes there.
- Styles use design tokens from `src/styles/global.css` (e.g. `--space-*`, `--text-*`, `--accent-*`) inside scoped component styles.
- Internal links end with a trailing slash (`/projects/`).

## Notes

- This file (`AGENTS.md`) is the single source of project instructions (no `CLAUDE.md`).
- Theme is light/dark via `localStorage` + `prefers-color-scheme`; motion effects degrade gracefully under `prefers-reduced-motion` and without JS.

## Documentation

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)
