# AGENTS.md

Guide for anyone, human or AI, working in this repository: what the site is, how it is built, and the rules that keep it correct.

## What this project is

**alyasi.tech** is the portfolio of Rayan Alyasi, an Information Systems student at King Abdulaziz University who works as a DevOps engineering intern at Tabby. The site is built as a courtroom case, *"Not Just a Student"*: eleven jurors start out voting "just a student", and eight exhibits of evidence change their minds.

The audience is recruiters and engineers deciding whether to interview him. That makes **accuracy the product**: one inflated or unconfirmed claim undermines every true one.

The deck has 13 slides, in order: opening, the-jury, the-facts, exhibit-a (home lab), exhibit-b (Tabby and Lucidya), exhibit-c (BCG fellowship), exhibit-d (hackathon wins), exhibit-e (8,000-user WhatsApp AI), exhibit-f (people), exhibit-g (community), exhibit-h (for fun), verdict, credits. Most exhibits open a panel with the full evidence.

## Stack

- Astro 7.3.5, fully static output, no server runtime. Node 22.12+ (`.nvmrc`).
- Served by nginx in a container on the owner's Coolify server (arm64), behind Cloudflare (Tunnel). Coolify has no public hostname: CI reaches its deploy webhook over Tailscale, joining the tailnet only for each deploy job.
- Staging first: `staging` (default branch) deploys to staging.alyasi.tech, `main` to alyasi.tech. `.github/workflows/deploy.yml` builds, checks and publishes the image on every merge to `staging`, deploys it to staging and checks it there. `.github/workflows/promote.yml` lets only `staging` merge into `main`, then promotes that same image to production, never a rebuild. Pull requests build and check but never deploy. See `docs/deployment.md`.
- Security headers, including a strict Content-Security-Policy, are generated at build time by `integrations/security-headers.mjs`.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Local dev server |
| `npm run build` | Production build into `dist/` |
| `npm run check` | All site checks: build, lint, formatting, no inline JavaScript, no personal contact data, wording rules, docs match the code, speed budget, secrets |
| `npm run lint` | ESLint on all JavaScript (`npm run lint -- --fix` fixes what it can) |
| `npm run format` | Prettier on JavaScript and JSON |
| `npm run qa:overflow` | Checks every slide on six phone sizes (needs `npx playwright install chromium` once) |

## Repository map

```
src/pages/            index.astro, 404.astro
src/layouts/          Base.astro: metadata, fonts, analytics, global styles
src/components/
  chrome/             header, footer, section dots, transitions
  slides/             one component per slide (Opening, TheJury, TheFacts, ExhibitA–H, Verdict, Credits)
  panels/             Drawer shell + PanelA–H, Contact, CvViewer, CaseFile, Lightbox
  ui/                 Pic.astro (responsive images), Vid.astro (lazy video)
src/scripts/          ES modules; main.js wires them up
src/styles/           index.css imports 14 feature files (01-base … 14-responsive)
src/data/             site.ts (profile, structured data), images.ts (image registry and widths)
src/assets/           image masters, logos, video
public/               robots.txt, llms.txt, icons, og-image.png, cv/Rayan-Alyasi-CV.pdf
integrations/         security-headers.mjs (writes dist/_headers; scripts/deploy/nginx-config.mjs turns it into nginx config)
scripts/check.mjs     site checks (npm run check); wording rules in scripts/claims.json
eslint.config.mjs     lint rules; .prettierrc.json and .editorconfig set formatting
docs/                 development.md (working on the site), deployment.md (hosting and operations)
.claude/agents/       Explore (cheap code search) and judge (review on request), for Claude Code
scripts/qa/           overflow.mjs
scripts/deploy/       nginx-config.mjs, coolify.mjs, smoke.mjs (deploy pipeline)
.github/rulesets/     staging.json, main.json (branch rulesets, applied in GitHub settings)
.github/              pull_request_template.md; workflows/pr-title.yml checks PR titles
Dockerfile            nginx image for the built site
```

## Engineering rules

Each rule exists because breaking it broke something real.

1. **No inline JavaScript and no inline event handlers.** The CSP is `default-src 'self'` with no `unsafe-inline`, so inline code silently stops working on the live site, and CI fails on it. Put behavior in a module under `src/scripts/` and wire it from `main.js`.
2. **Images and video only through `<Pic>` / `<Vid>` and the registry in `src/data/images.ts`.** They produce AVIF and WebP at several widths and load lazily when a slide or panel opens. Walking the whole site on a phone downloads about 76 KB of images; a plain `<img>` can cost more than that alone.
3. **Every slide must fit six phone sizes** (375×667, 390×844, 412×915, 360×640, and landscape 844×390, 667×375). Run `npm run qa:overflow` after any change to slide text or layout. If content cannot fit, shorten it or move detail into the panel; do not shrink type below the existing scale.
4. **Styles go in the matching `src/styles/NN-*.css` feature file.** No CSS frameworks.
5. **Dependencies:** none added without the owner's approval. Pin exact versions, at least 14 days old (newly published releases are a supply-chain risk). Dependabot applies the same 14-day cooldown.
6. **Keep the first load small** (about 70 KB today) and keep accessibility intact: alt text on every image, visible focus, reduced-motion support.

## Code standards

Keep the code something a senior engineer would be glad to inherit.

- **Modular:** one responsibility per module (`src/scripts/` has one module per feature, wired up in `main.js`; styles have one file per area). Add to the module that owns the behavior, or create a new one; never grow a catch-all file.
- **Small and clear:** short functions with names that say what they do, early returns over deep nesting, comments that explain *why*, not *what*.
- **No dead weight:** delete unused code, debugging leftovers and commented-out blocks in the same change. Don't duplicate logic; extract it.
- **Platform first:** prefer what the browser and Node already provide over a new dependency. Every dependency is code you must keep secure.
- **Fast by default:** work happens when needed (images and video load when their slide or panel opens), not up front. The speed budget in `scripts/check.mjs` (HTML and JavaScript size, preloaded fonts) fails the build if a change bloats the site. Raise it only deliberately, with the reason in the same change.
- **Enforced, not hoped for:** `npm run lint` and `npm run format` run in `npm run check` and in CI, so style is never a review topic.

## Keep docs in sync

Docs are part of the change, not a follow-up. When a change alters behavior, commands, files, setup or deployment, update the matching docs in the same change: `README.md` (overview and quick start), `docs/development.md` (commands, checks, content), `docs/deployment.md` (hosting and operations), `AGENTS.md` (rules and structure) and code comments. Keep the README short: detail belongs in `docs/`, linked, never duplicated. `npm run check` fails if a doc mentions an `npm run` command, file or link that no longer exists.

## Content and claims rules

The site is evidence. These rules apply to every word in `src/` and `public/llms.txt`; `npm run check` enforces the ones a machine can catch (`scripts/claims.json`).

- **Only state what is supported.** A claim must come from existing site content, the published CV, or the owner's explicit confirmation in the task. Never infer titles, team names, numbers, dates or outcomes. If something is missing, ask.
- **wa-guardian is a "live service"**, running on a GitOps proof of concept. It is not part of Tabby's production systems; never call it "production". The proof of concept is a "proof of concept", not a "platform".
- **Measured numbers stay measured.** Onboarding a new stateless service is currently a 3-file change, Healthy under 2 minutes after merge; onboarding the stateful wa-guardian took 7.5 hours. The design goal of "one manifest and one values file" is not yet true. When the proof of concept changes, re-measure before changing any claim.
- **Plain language.** Readers are often recruiters. Prefer everyday words; explain or drop implementation jargon. No vague idioms or hype ("the real thing", "next level", "rockstar").
- **Privacy.** The site and this repository are public. Email is the only contact detail published. No phone numbers, home address or private documents, ever; the private CV never enters this repository.

## Public repository hygiene

This repository is public. Never commit secrets, tokens, internal hostnames, personal data or local logs. `.env*` and local settings are gitignored. Deployment credentials live in GitHub secrets and variables, not in files.

## Commits and pull requests

Commit messages and PR titles follow [Conventional Commits 1.0.0](https://www.conventionalcommits.org/en/v1.0.0/). The `pr-title` check enforces the format on every PR.

- **Format:** `type(scope): summary`. Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`. Add `!` before the colon for a breaking change.
- **Summary:** imperative mood, lowercase, no trailing period, about 72 characters at most. The scope is a noun for the area changed: `slides`, `panels`, `deploy`, `ci`, `deps`.
- **Body:** only when the why is not obvious from the summary.
- **Size:** one logical change per commit and per PR.
- **PR titles** use the same format: squash merges into `staging` and promotion merges into `main` use the title as the commit message. Promotion PRs are titled `chore(release): promote staging to production`.
- **PR descriptions** are short, under three headings from the template: what changed, why, how it was tested. No filler.
- **No attribution lines** (`Co-Authored-By`, "Generated with …") in commits or PRs.

| Good | Bad |
|---|---|
| `feat(slides): add exhibit i for open-source work` | `Added new slide` (no type, past tense) |
| `fix(panels): keep the cv viewer inside 360px screens` | `fix: Fixed the CV viewer.` (capitalised, past tense, trailing period) |
| `ci(deploy): build arm64 images` | `update deploy stuff` (no type, vague) |
| `revert: feat(slides): add exhibit i` | `Revert "feat(slides): add exhibit i"` (GitHub's default revert title; rename it) |

## Workflow

- Run `npm run check` (and `npm run qa:overflow` after slide changes) before pushing. All checks must pass.
- Never push to `staging` or `main` directly; rulesets block it. Branch from `staging` and open a PR into `staging` (squash merge). Releasing is a PR from `staging` into `main` (merge commit), which the owner merges.
- Keep each change to what was asked. If you see a better approach, say so in one sentence and still deliver the request as asked.

## Planned change

The owner plans to change the proof of concept so a new service really is one manifest and one values file. When that lands: re-measure onboarding, update the site copy and the CV, and update the `onboarding-is-measured` rule in `scripts/claims.json`.
