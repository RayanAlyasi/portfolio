# Development

Working on the site: commands, checks, content and conventions. The rules and code standards are in [AGENTS.md](../AGENTS.md).

## Commands

| Command | |
|---|---|
| `npm ci` | Install the exact locked versions |
| `npm run dev` | Local dev server at http://localhost:4321 |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run check` | All site checks: build, lint, formatting, security policy, animations, privacy, wording, docs, speed budget, secrets |
| `npm run lint` / `npm run format` | ESLint and Prettier on the JavaScript and JSON |
| `npm run qa:overflow` | Every slide on six phone sizes (needs `npx playwright install chromium` once) |

## Branches

`main` is production and the default branch; all work lands on `staging` first. Nothing is pushed to either directly:

1. Branch from `staging`, then open a PR into `staging` (pick it as the base; GitHub suggests `main`, and `gh pr create --base staging` sets it). Merge (squash) when `build` and `dependency-review` pass; staging deploys and checks itself.
2. To release, open a PR from `staging` into `main` and merge it (merge commit) when `promotion` passes. Production gets the exact image staging tested.

Commit messages and PR titles follow Conventional Commits (`type(scope): summary`); the rules and examples are in [AGENTS.md](../AGENTS.md#commits-and-pull-requests). Details of the branch flow, and why it works this way, are in [Deployment](deployment.md).

## What `npm run check` covers

The same checks run in CI on every pull request into `staging`, so passing locally means the build will pass.

| Check | Fails when |
|---|---|
| build | The site does not build |
| lint, format | ESLint finds a problem, or JavaScript and JSON are not formatted (`npm run format` fixes formatting) |
| csp | Any inline script or event handler reaches the built pages |
| anim | An element's entrance animation (`--an:`) names `@keyframes` that do not exist, which leaves it invisible |
| privacy | A phone number, `tel:` link or private file appears in public files |
| claims | Wording breaks a rule in `scripts/claims.json` |
| docs | A doc mentions an `npm run` command, file or link that does not exist |
| budget | The page's HTML exceeds 40 KB or its JavaScript 10 KB (gzip), or more than 2 fonts are preloaded |
| secrets | gitleaks finds a credential (skipped locally if gitleaks is not installed; CI always runs it) |

## Updating content

- **Text:** edit the slide or panel component in `src/components/`.
- **Images:** drop a high-resolution file into `src/assets/img/` and reference it by file name: `<Pic name="file-name" alt="…" sizes="…" />`. Make photos 2560 px wide where the original allows (never upscale), and strip all metadata (camera details, location) first; the repository is public.
- **Videos:** put `name.mp4` (H.264 with `-movflags +faststart`, a light file for normal viewing) in `src/assets/video/`, and optionally `name-hd.mp4` at the original's full resolution for full screen. Strip metadata (`-map_metadata -1`).
- **CV:** replace `public/cv/Rayan-Alyasi-CV.pdf` and `src/assets/img/cv.webp` (a render of the page for the viewer). Use the public CV only: `npm run check` cannot read inside the PDF, so open it and confirm it has no phone number or address before committing.
- **Arabic page:** `src/pages/ar.astro` repeats the main facts in Arabic so a search for the name in Arabic finds the site. Its name, title and description are in `src/data/site.ts`. When a headline fact changes, change it there too.
- **Automatic:** the university year, its progress bar and the home lab's days-running counter update themselves.
- **Links to a slide or panel:** `/<slide-id>` (or `/#<slide-id>`) opens that slide and skips the countdown, for example `alyasi.tech/exhibit-e`; `/panel/<id>` opens a panel over its slide, for example `alyasi.tech/panel/cv`. The pages come from the components' ids (`src/pages/[slide].astro`, `src/pages/panel/[panel].astro`), so new slides and panels get one automatically. The address goes back to `alyasi.tech/` once read, and moving around never changes it. These pages exist for Umami's heatmaps (below); they name `/` as the canonical page, and only `/` is in the sitemap.

## How it stays fast

- **About 70 KB on first load:** HTML with all CSS inlined (no render-blocking stylesheet), a 7 KB script, two preloaded fonts. No framework runtime: Astro ships zero JavaScript of its own.
- **Images:** every photo is generated in AVIF and WebP at several widths, so phones download small files. Images load only when their slide or panel is reached, and images hidden on the current screen size are never downloaded.
- **Full screen:** tapping a panel photo shows the copy already on screen at once, then swaps in a sharper one (up to 2560 px) once it has fully loaded. Those large sizes are never downloaded while browsing.
- **Videos:** a panel's video downloads nothing until the panel opens, then only its length and index (about 220 KB for the FieldLog video), so it can be skipped through before playing. The rest streams when played. A video with an HD file switches to it in full screen, at the same moment and without restarting (about half a second on a 10 Mbit/s connection). The muted loop on the Exhibit H slide loads on desktop only, from the slide before it.
- **Animations** move only `transform` and `opacity`, so they run on the GPU. Revisited slides appear finished instead of replaying.
- **Caching:** everything under `/_astro/` is content-hashed and cached for a year.

## Security

- Static output only: no server, no database, no form handling.
- Strict content security policy with **no inline JavaScript**, generated by `integrations/security-headers.mjs` (the CI build fails if inline script ever appears). Plus HSTS, `nosniff`, a strict referrer policy and disabled device permissions.
- Self-hosted fonts; the only third-party script is my own Umami instance.
- Dependencies pinned with a lockfile, audited in CI, and updated by Dependabot with a two-week cooldown on new releases.

## Analytics events

| Event | When |
|---|---|
| `reach-<section>` | First arrival on a section: `reach-opening` … `reach-credits` (use as funnel steps) |
| `begin-case` / `skip-to-evidence` | The opening buttons |
| `countdown-finished` / `countdown-skipped` | The film leader |
| `open-<panel>` + `read-time` | Panels opened (`open-a` … `open-h`, `open-cv`, `open-file`, `open-contact`) and seconds spent |
| `cv-download`, `email-copy`, `email-app` | Contact intent (good goals) |
| `outbound` | External links, with `{ to }` |
| `video-play` / `video-progress` | Video engagement at 25/50/75/100% |
| `image-zoom` | A panel image opened full screen |
| `ref` | Visits tagged `?ref=…` (Umami also reads `utm_source`) |

**Heatmaps.** Stock Umami files heatmap clicks by page address and draws them over a copy of that page as tall as the page measured, but the deck is one page at `/` that never scrolls, with panels that scroll inside themselves. Our Umami runs a patched recorder (see [Deployment](deployment.md#patched-image-one-heatmap-per-slide-and-panel)) that lets the page adjust each heatmap event, and `src/scripts/heatmap.js` uses it: a click on a slide is filed under that slide (`/exhibit-b`) with the screen's size; a click in an open panel is filed under the panel (`/panel/b`), placed on the panel's full length (adding how far it was scrolled, except on its pinned header). Clicks during the countdown or a slide change, or on a full-screen photo, are not recorded. So Umami shows one heatmap per slide and per panel, while visitors only ever see `alyasi.tech/`. Two limits remain: Umami draws each heatmap at one of its standard widths (320, 375, 425, 768, 1024, 1440, 1920), so on long panels text that wraps differently drifts further down the page, and the RGB video in Panel H is sized by screen height, which shifts what is below it. Umami records heatmaps for 15% of visits by default (*Websites → this site → Settings → Replays & Heatmaps*).

## Working with Claude Code

`AGENTS.md` holds the project's rules and standards, and `CLAUDE.md` loads it. Two agents live in `.claude/agents/`: **Explore** runs code searches on a smaller, cheaper model, and **judge** gives a thorough review, but only when you ask for one (for example "have the judge review this before I push").
