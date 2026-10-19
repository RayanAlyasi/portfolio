# alyasi.tech

**Not Just a Student**: my portfolio, staged as *12 Angry Men*. Eight exhibits answer eight jurors' doubts. Live at [alyasi.tech](https://alyasi.tech).

A fully static [Astro](https://astro.build) site, served by nginx on my own Coolify server behind Cloudflare, and deployed by GitHub Actions: every change goes through staging, and production runs the exact image staging tested.

## Quick start

Requires Node 22.12 or newer.

```bash
bash scripts/setup.sh   # dependencies, Chromium for the layout check, tool check
npm run dev             # http://localhost:4321
npm run check           # everything CI checks; run it before pushing
```

## Project layout

```
src/
  pages/          index.astro, [slide].astro (each slide's own address), 404.astro
  layouts/        Base.astro: metadata, structured data, fonts, analytics
  components/     Deck.astro (the whole page), slides/, panels/, chrome/, ui/ (Pic and Vid)
  scripts/        one ES module per feature, wired up in main.js
  styles/         one stylesheet per area, imported by index.css
  data/           site.ts (profile), images.ts (image registry)
public/           robots.txt, llms.txt, icons, cv/
integrations/     security-headers.mjs: security headers and caching rules
scripts/          site checks, phone-layout check, deploy helpers
```

## Docs

- [Development](docs/development.md): commands, checks, updating content, analytics events, working with Claude Code
- [Deployment](docs/deployment.md): hosting, CI/CD, one-time setup, staging, rollback and analytics
- [AGENTS.md](AGENTS.md): the project's rules and code standards
