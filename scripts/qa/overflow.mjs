// Fails if any slide's content overflows on the six reference phone sizes.
//   npm run qa:overflow            (builds first, so it checks the current code; in CI it reuses the job's build)
//   QA_URL=https://staging.example npm run qa:overflow   (checks a deployed copy instead)
// For a staging site behind Cloudflare Access, set CF_ACCESS_CLIENT_ID and CF_ACCESS_CLIENT_SECRET.
// Uses Playwright's Chromium: run `npx playwright install chromium` once (scripts/setup.sh does this).
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { chromium } from 'playwright';

const SIZES = [
  ['SE', 375, 667],
  ['i14', 390, 844],
  ['pixel', 412, 915],
  ['small', 360, 640],
  ['land', 844, 390],
  ['landSE', 667, 375],
];
// Decorative elements that are meant to bleed past the edges.
const SKIP = [
  'ballot',
  'bf',
  'chair',
  'plate',
  'strike',
  'omark',
  'dbanner',
  'ostamp',
  'rbar',
  'rlabel',
  'spot',
  'half',
  'echo',
  'ghostq',
  'rain',
  'bars',
  'bar',
  'fan',
  'tablebox',
  'you',
  'lnum',
  'wm',
  'wi',
  'c',
  'wd',
  'sc',
  'ltk',
  'reel',
];

const REMOTE = process.env.QA_URL ? process.env.QA_URL.replace(/\/$/, '') : null;
const ACCESS =
  process.env.CF_ACCESS_CLIENT_ID && process.env.CF_ACCESS_CLIENT_SECRET
    ? { 'CF-Access-Client-Id': process.env.CF_ACCESS_CLIENT_ID, 'CF-Access-Client-Secret': process.env.CF_ACCESS_CLIENT_SECRET }
    : {};

// A leftover dist/ from an older checkout would pass or fail the wrong code, so build unless CI just did.
if (!REMOTE && (!process.env.CI || !fs.existsSync('dist/index.html'))) {
  const b = spawnSync('npm', ['run', 'build'], { stdio: 'inherit', shell: process.platform === 'win32' });
  if (b.status !== 0) process.exit(1);
}

// Serve dist/ with a tiny built-in static server. Not `astro preview`: its behaviour differs between
// environments (it can detach into the background when it detects a coding agent), and this check
// only needs the built files.
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.pdf': 'application/pdf',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml',
  '.webmanifest': 'application/manifest+json',
};
const DIST = path.resolve('dist');
let server = null;
let PORT = null;
if (!REMOTE) {
  server = http.createServer((req, res) => {
    let rel;
    try {
      rel = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    } catch {
      res.writeHead(400).end();
      return;
    }
    if (rel.endsWith('/')) rel += 'index.html';
    let file = path.join(DIST, rel);
    const inside = path.relative(DIST, file);
    if (inside.startsWith('..') || path.isAbsolute(inside)) {
      res.writeHead(403).end();
      return;
    }
    if (!fs.existsSync(file) && fs.existsSync(`${file}.html`)) file = `${file}.html`;
    if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res
        .writeHead(404, { 'content-type': MIME['.html'] })
        .end(fs.existsSync(path.join(DIST, '404.html')) ? fs.readFileSync(path.join(DIST, '404.html')) : 'not found');
      return;
    }
    res.writeHead(200, { 'content-type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  try {
    PORT = await new Promise((resolve, reject) => {
      server.once('error', reject);
      server.listen(process.env.QA_PORT ? Number(process.env.QA_PORT) : 0, '127.0.0.1', () => resolve(server.address().port));
    });
  } catch (e) {
    console.error(`overflow check could not run: ${e.message}`);
    process.exit(1);
  }
}
const BASE = REMOTE || `http://127.0.0.1:${PORT}`;
const stop = () => {
  if (server)
    try {
      server.close();
    } catch {
      /* already closed */
    }
};
process.on('exit', stop);

async function waitForServer() {
  for (let i = 0; i < 60; i++) {
    try {
      if ((await fetch(`${BASE}/`, { headers: ACCESS })).ok) return;
    } catch {
      /* not up yet: retry */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`site did not answer at ${BASE}`);
}

function inspect({ i, skip }) {
  const s = document.querySelectorAll('.slide')[i];
  const vw = innerWidth;
  const top = document.querySelector('.hdr').getBoundingClientRect().bottom;
  const bot = document.querySelector('.foot').getBoundingClientRect().top;
  const skipSel = skip.map((c) => `.${c}`).join(',');
  // Only the visible part counts: clip each element by every overflow-hidden/clip ancestor,
  // so intentionally clipped animations (number reels, logo marquee) are not false alarms.
  const visibleBox = (el) => {
    const r = el.getBoundingClientRect();
    let l = r.left,
      t = r.top,
      rt = r.right,
      b = r.bottom;
    for (let a = el.parentElement; a && a !== s; a = a.parentElement) {
      const cs = getComputedStyle(a);
      const ar = a.getBoundingClientRect();
      if (/hidden|clip/.test(cs.overflowX)) {
        l = Math.max(l, ar.left);
        rt = Math.min(rt, ar.right);
      }
      if (/hidden|clip/.test(cs.overflowY)) {
        t = Math.max(t, ar.top);
        b = Math.min(b, ar.bottom);
      }
    }
    return { l, t, r: rt, b, w: rt - l, h: b - t };
  };
  const issues = [];
  // .inner holds each slide's content; the Opening slide uses .open-title instead.
  s.querySelectorAll('.inner *, .open-title *').forEach((el) => {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || el.closest('svg')) return;
    if (skipSel && el.closest(skipSel)) return;
    const r = visibleBox(el);
    if (r.w < 2 || r.h < 2) return;
    const name =
      el.tagName.toLowerCase() + (typeof el.className === 'string' && el.className ? `.${el.className.split(' ').join('.')}` : '');
    if (r.b > bot + 1) issues.push(`under footer by ${Math.round(r.b - bot)}px: ${name}`);
    if (r.t < top - 1) issues.push(`under header by ${Math.round(top - r.t)}px: ${name}`);
    if (r.r > vw + 1) issues.push(`past right edge by ${Math.round(r.r - vw)}px: ${name}`);
    if (r.l < -1) issues.push(`past left edge by ${Math.round(-r.l)}px: ${name}`);
  });
  return { id: s.id, issues };
}

/** Every slide at one phone size, in its own browser context. Returns the problems found, in slide order. */
async function checkSize(browser, [tag, width, height]) {
  const ctx = await browser.newContext({
    viewport: { width, height },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2,
    extraHTTPHeaders: ACCESS,
  });
  const page = await ctx.newPage();
  const errors = [];
  const problems = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(`${BASE}/?qa`);
  await page.waitForTimeout(500);
  await page.evaluate(() => document.querySelector('.lskip')?.click());
  await page.waitForTimeout(600);
  const count = await page.evaluate(() => document.querySelectorAll('.slide').length);
  for (let i = 0; i < count; i++) {
    await page.evaluate((n) => window.__go(n), i);
    await page.waitForTimeout(80);
    await page.evaluate((n) => window.__go(n), i);
    await page.waitForTimeout(250);
    // page.evaluate takes one argument; a check that cannot inspect a slide must fail, never pass.
    const r = await page
      .evaluate(inspect, { i, skip: SKIP })
      .catch((e) => ({ id: `slide ${i}`, issues: [`could not inspect: ${e.message.split('\n')[0]}`] }));
    if (r.issues.length) problems.push(`FAIL ${tag} ${width}x${height} #${r.id}: ${r.issues.slice(0, 3).join('; ')}`);
  }
  if (errors.length) problems.push(`FAIL ${tag}: page errors: ${errors.slice(0, 2).join(' | ')}`);
  await ctx.close();
  return problems;
}

let failures = 0;
try {
  await waitForServer();
  const browser = await chromium.launch(process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {});
  // The six sizes are independent, so they run at once; results print in the fixed SIZES order.
  const results = await Promise.all(SIZES.map((size) => checkSize(browser, size)));
  for (const line of results.flat()) {
    failures++;
    console.log(line);
  }
  await browser.close();
} catch (e) {
  console.error(`overflow check could not run: ${e.message}`);
  failures++;
}
stop();
console.log(failures ? `\n${failures} overflow problem(s).` : 'PASS  all slides fit on all six phone sizes');
process.exit(failures ? 1 : 0);
