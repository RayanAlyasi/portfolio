// Site checks, run locally (npm run check) and in CI. No AI involved.
//   npm run check                       all checks
//   node scripts/check.mjs --only lint,docs
//   node scripts/check.mjs --ci         (CI: skips the build, which the workflow already ran)
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

// Plain helpers, no dependencies.
const ROOT = (() => {
  try {
    return execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return process.cwd();
  }
})();
const git = (a) => {
  try {
    return execFileSync('git', a, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 64 * 1024 * 1024 });
  } catch {
    return '';
  }
};
const run = (cmd, a) => {
  const t = Date.now();
  const r = spawnSync(cmd, a, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, shell: process.platform === 'win32' });
  return { code: r.status ?? 1, out: `${r.stdout || ''}${r.stderr || ''}`, ms: Date.now() - t };
};
const hasBinary = (n) => (process.platform === 'win32' ? run('where', [n]) : run('sh', ['-c', `command -v ${n}`])).code === 0;
const readJSON = (f, fb) => {
  try {
    return JSON.parse(fs.readFileSync(f, 'utf8'));
  } catch {
    return fb;
  }
};
function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) {
      out._.push(a);
      continue;
    }
    const next = argv[i + 1];
    if (next === undefined || next.startsWith('--')) out[a.slice(2)] = true;
    else {
      out[a.slice(2)] = next;
      i++;
    }
  }
  return out;
}

const args = parseArgs(process.argv.slice(2));
const only = typeof args.only === 'string' ? args.only.split(',') : null;
const skip = typeof args.skip === 'string' ? args.skip.split(',') : [];
const staged = Boolean(args.staged);

// Speed budget, in gzip bytes (what visitors download). About 15% above the site's size when set;
// raise it deliberately, in the same change as the reason, never just to make a check pass.
const BUDGET = { htmlGzip: 40 * 1024, jsGzip: 10 * 1024, preloadedFonts: 2 };
// Files whose paths and commands must stay true to the code.
const DOCS = ['README.md', 'AGENTS.md', 'CLAUDE.md', 'docs', '.claude/agents'];
const GENERATED = ['dist/', 'deploy/nginx/site.conf'];

const TEXT = /\.(astro|ts|js|mjs|css|md|txt|json|html|xml|svg|webmanifest|yml|yaml|toml)$/i;
const PUBLIC_SCOPE = ['src/', 'public/', 'README.md', 'astro.config.mjs', 'integrations/'];

function filesInScope(prefixes) {
  const list = staged ? git(['diff', '--cached', '--name-only', '--diff-filter=ACMR']) : git(['ls-files']);
  return list.split('\n').filter((f) => f && prefixes.some((p) => f === p || f.startsWith(p)));
}
const read = (f) => {
  try {
    return fs.readFileSync(path.join(ROOT, f), 'utf8');
  } catch {
    return '';
  }
};
const readStagedOrDisk = (f) => (staged ? git(['show', `:${f}`]) : read(f));
const lineOf = (text, idx) => text.slice(0, idx).split('\n').length;

const gates = {
  build() {
    const r = run('npm', ['run', 'build']);
    return r.code === 0
      ? { ok: true, detail: `built in ${(r.ms / 1000).toFixed(0)}s` }
      : { ok: false, detail: r.out.split('\n').slice(-15).join('\n') };
  },

  csp() {
    const dist = path.join(ROOT, 'dist');
    if (!fs.existsSync(dist)) return { ok: false, detail: 'dist/ not found: run the build gate first' };
    const problems = [];
    const walk = (d) =>
      fs.readdirSync(d, { withFileTypes: true }).forEach((e) => {
        const p = path.join(d, e.name);
        if (e.isDirectory()) return walk(p);
        if (!e.name.endsWith('.html')) return;
        const html = fs.readFileSync(p, 'utf8');
        // Browsers also end a script at </script > or </script foo>, so the closing tag allows attributes too.
        for (const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\b[^>]*>/gi)) {
          const attrs = m[1];
          if (/\bsrc\s*=/.test(attrs) || /application\/ld\+json/i.test(attrs) || !m[2].trim()) continue;
          problems.push(`${path.relative(ROOT, p)}: inline <script>`);
        }
        for (const m of html.matchAll(/<[a-z][^>]*\s(on[a-z]+)\s*=/gi)) problems.push(`${path.relative(ROOT, p)}: inline handler ${m[1]}=`);
      });
    walk(dist);
    return problems.length
      ? { ok: false, detail: `CSP forbids inline JavaScript (default-src 'self'):\n${problems.slice(0, 10).join('\n')}` }
      : { ok: true, detail: 'no inline JavaScript' };
  },

  // `.a` elements start invisible and name their entrance with --an. An unknown name animates
  // nothing, so the element never appears, and no other check notices.
  anim() {
    const defined = new Set();
    for (const f of filesInScope(['src/styles/']))
      for (const m of readStagedOrDisk(f).matchAll(/@keyframes\s+([\w-]+)/g)) defined.add(m[1]);
    const hits = [];
    for (const f of filesInScope(['src/'])) {
      if (!TEXT.test(f)) continue;
      const text = readStagedOrDisk(f);
      for (const m of text.matchAll(/--an:\s*([\w-]+)/g))
        if (!defined.has(m[1])) hits.push(`${f}:${lineOf(text, m.index)}: --an:${m[1]} has no @keyframes`);
    }
    return hits.length
      ? { ok: false, detail: `Unknown animation, so the element stays invisible:\n${hits.slice(0, 10).join('\n')}` }
      : { ok: true, detail: `every --an names one of ${defined.size} @keyframes` };
  },

  privacy() {
    const phone = [/(?:\+|00)966[\s-]?5\d(?:[\s-]?\d){7}/g, /\b05\d(?:[\s-]?\d){7}\b/g, /href=["']tel:/gi];
    const hits = [];
    for (const f of filesInScope(PUBLIC_SCOPE)) {
      if (/(^|\/)[^/]*private[^/]*$/i.test(f) && f.startsWith('public/')) hits.push(`${f}: private file in public/`);
      if (!TEXT.test(f)) continue;
      const text = readStagedOrDisk(f);
      for (const re of phone) for (const m of text.matchAll(re)) hits.push(`${f}:${lineOf(text, m.index)}: phone number or tel: link`);
    }
    return hits.length
      ? { ok: false, detail: `Public site and repo carry no phone numbers or private files:\n${hits.slice(0, 10).join('\n')}` }
      : { ok: true, detail: 'no personal contact data' };
  },

  claims() {
    const rules = [
      ...readJSON(path.join(ROOT, 'scripts/claims.json'), { rules: [] }).rules,
      ...readJSON(path.join(ROOT, 'scripts/claims.local.json'), { rules: [] }).rules,
    ];
    const hits = [];
    for (const f of filesInScope(['src/', 'public/llms.txt'])) {
      if (!TEXT.test(f)) continue;
      const text = readStagedOrDisk(f);
      for (const r of rules) {
        const re = new RegExp(r.pattern, `g${r.flags || ''}`);
        for (const m of text.matchAll(re)) hits.push(`${f}:${lineOf(text, m.index)} [${r.id}] ${r.reason}`);
      }
    }
    return hits.length ? { ok: false, detail: hits.slice(0, 10).join('\n') } : { ok: true, detail: `${rules.length} wording rules clean` };
  },

  lint() {
    const r = run('npx', ['--no-install', 'eslint', '.']);
    return r.code === 0
      ? { ok: true, detail: 'no lint errors' }
      : {
          ok: false,
          detail: `Fix with npm run lint (some fix automatically with --fix):\n${r.out.trim().split('\n').slice(0, 12).join('\n')}`,
        };
  },

  format() {
    const r = run('npx', ['--no-install', 'prettier', '--check', '**/*.{js,mjs,json}']);
    const files = r.out
      .split('\n')
      .filter((l) => l.startsWith('[warn]') && !l.includes('Code style'))
      .map((l) => l.replace('[warn] ', ''));
    return r.code === 0
      ? { ok: true, detail: 'JavaScript and JSON formatted' }
      : { ok: false, detail: `Run npm run format:\n${files.slice(0, 10).join('\n')}` };
  },

  docs() {
    const scripts = Object.keys(readJSON(path.join(ROOT, 'package.json'), { scripts: {} }).scripts || {});
    // Folders (docs/, .claude/agents/) expand into their Markdown files.
    const markdownIn = (dir) =>
      fs.existsSync(path.join(ROOT, dir))
        ? fs
            .readdirSync(path.join(ROOT, dir))
            .filter((f) => f.endsWith('.md'))
            .map((f) => `${dir}/${f}`)
        : [];
    const docs = DOCS.flatMap((d) => (d.endsWith('.md') ? [d] : markdownIn(d)));
    const looksLikePath =
      /^(src|scripts|public|integrations|deploy|docs|\.github|\.claude)\/|^(Dockerfile|package\.json|astro\.config\.mjs|eslint\.config\.mjs|\.prettierrc\.json|\.editorconfig|\.nvmrc)$/;
    const problems = [];
    const report = (doc, text, index, message) => problems.push(`${doc}:${lineOf(text, index)} ${message}`);
    for (const doc of docs) {
      const text = read(doc);
      for (const m of text.matchAll(/npm run ([a-z][\w:-]*)/g)) {
        if (!scripts.includes(m[1])) report(doc, text, m.index, `mentions "npm run ${m[1]}", which package.json does not define`);
      }
      for (const m of text.matchAll(/`([^`\s]+)`/g)) {
        const ref = m[1].replace(/[),.:;]+$/, '').replace(/:\d+(-\d+)?$/, '');
        if (!looksLikePath.test(ref) || /[<>*{}$]/.test(ref) || GENERATED.some((g) => ref.startsWith(g))) continue;
        if (!fs.existsSync(path.join(ROOT, ref))) report(doc, text, m.index, `refers to ${ref}, which does not exist`);
      }
      // Relative Markdown links, such as [Deployment](docs/deployment.md), resolve from the doc's own folder.
      for (const m of text.matchAll(/\]\(([^)\s]+)\)/g)) {
        const target = m[1].split('#')[0];
        if (!target || /^(https?:|mailto:)/.test(target)) continue;
        if (!fs.existsSync(path.join(ROOT, path.dirname(doc), target)))
          report(doc, text, m.index, `links to ${target}, which does not exist`);
      }
    }
    return problems.length
      ? { ok: false, detail: `Docs are out of date with the code:\n${problems.slice(0, 10).join('\n')}` }
      : { ok: true, detail: `commands, paths and links in ${docs.length} docs are real` };
  },

  budget() {
    const html = path.join(ROOT, 'dist', 'index.html');
    if (!fs.existsSync(html)) return { ok: false, detail: 'dist/ not found: run the build gate first' };
    const gz = (f) => zlib.gzipSync(fs.readFileSync(f)).length;
    const astro = path.join(ROOT, 'dist', '_astro');
    const js = fs.existsSync(astro)
      ? fs
          .readdirSync(astro)
          .filter((f) => f.endsWith('.js'))
          .reduce((sum, f) => sum + gz(path.join(astro, f)), 0)
      : 0;
    const htmlGz = gz(html);
    const fonts = (fs.readFileSync(html, 'utf8').match(/<link[^>]+rel="preload"[^>]+as="font"/g) || []).length;
    const kb = (b) => `${(b / 1024).toFixed(1)} KB`;
    const over = [];
    if (htmlGz > BUDGET.htmlGzip) over.push(`index.html is ${kb(htmlGz)} gzip (budget ${kb(BUDGET.htmlGzip)})`);
    if (js > BUDGET.jsGzip) over.push(`JavaScript is ${kb(js)} gzip (budget ${kb(BUDGET.jsGzip)})`);
    if (fonts > BUDGET.preloadedFonts) over.push(`${fonts} preloaded fonts (budget ${BUDGET.preloadedFonts})`);
    return over.length
      ? { ok: false, detail: `Over the speed budget:\n${over.join('\n')}` }
      : { ok: true, detail: `HTML ${kb(htmlGz)}, JS ${kb(js)} gzip, ${fonts} fonts (within budget)` };
  },

  secrets() {
    if (!hasBinary('gitleaks')) return { ok: true, detail: 'skipped: gitleaks not installed locally (CI always scans)' };
    const opts = ['--no-banner', '--no-color', '--redact', '--verbose'];
    const r = staged ? run('gitleaks', ['git', '--pre-commit', '--staged', ...opts]) : run('gitleaks', ['dir', '.', ...opts]);
    if (r.code === 0) return { ok: true, detail: 'no secrets found' };
    const useful = r.out
      .split('\n')
      .filter((l) => /leaks found|RuleID|File:|Line:/i.test(l))
      .map((l) => l.trim());
    return {
      ok: false,
      detail: ['Possible secret: remove it, rotate it if it was real, and try again.', ...useful.slice(0, 8)].join('\n'),
    };
  },
};

const order = ['build', 'lint', 'format', 'csp', 'anim', 'privacy', 'claims', 'docs', 'budget', 'secrets'];
const selected = order.filter((g) => (!only || only.includes(g)) && !skip.includes(g) && !(args.ci && g === 'build'));
let failed = 0;
for (const name of selected) {
  const res = gates[name]();
  if (!res.ok) failed++;
  console.log(`${res.ok ? 'PASS' : 'FAIL'}  ${name.padEnd(8)} ${res.detail.split('\n')[0]}`);
  if (!res.ok && res.detail.includes('\n'))
    console.log(
      res.detail
        .split('\n')
        .slice(1)
        .map((l) => `        ${l}`)
        .join('\n'),
    );
}
console.log(failed ? `\n${failed} gate(s) failed.` : '\nAll gates passed.');
process.exit(failed ? 1 : 0);
