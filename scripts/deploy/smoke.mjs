// Checks a running copy of the site: the expected commit is live, the pages load,
// and the security headers are present. Used after deploys, after rollbacks and by the uptime check.
//   node scripts/deploy/smoke.mjs --url https://alyasi.tech [--commit <sha>] [--timeout 300]
// For a staging site behind Cloudflare Access, set CF_ACCESS_CLIENT_ID and CF_ACCESS_CLIENT_SECRET.
const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, all) => (a.startsWith('--') ? [...acc, [a.slice(2), all[i + 1]]] : acc), []),
);
const base = String(args.url || '').replace(/\/$/, '');
const commit = args.commit || null;
const timeoutS = Number(args.timeout || (commit ? 300 : 30));
if (!/^https?:\/\//.test(base)) {
  console.error('Usage: smoke.mjs --url https://example.com [--commit <sha>] [--timeout seconds]');
  process.exit(2);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const get = async (path) => {
  const sep = path.includes('?') ? '&' : '?';
  // A unique query string skips any cache between us and the server.
  const access =
    process.env.CF_ACCESS_CLIENT_ID && process.env.CF_ACCESS_CLIENT_SECRET
      ? { 'CF-Access-Client-Id': process.env.CF_ACCESS_CLIENT_ID, 'CF-Access-Client-Secret': process.env.CF_ACCESS_CLIENT_SECRET }
      : {};
  return fetch(`${base}${path}${sep}smoke=${Date.now()}`, {
    redirect: 'manual',
    headers: { 'user-agent': 'rayanalyasi-smoke-test', ...access },
  });
};

const failures = [];
const check = (ok, msg) => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${msg}`);
  if (!ok) failures.push(msg);
};

// 1. Wait until the expected commit is live (deploys take a moment to roll out).
if (commit) {
  const deadline = Date.now() + timeoutS * 1000;
  let live = null;
  while (Date.now() < deadline) {
    try {
      const r = await get('/version.json');
      if (r.ok) live = (await r.json()).commit;
    } catch {
      /* not reachable yet: keep polling */
    }
    if (live === commit) break;
    await sleep(5000);
  }
  check(live === commit, `live commit is ${commit.slice(0, 12)} (saw ${live ? live.slice(0, 12) : 'nothing'})`);
}

// 2. The home page loads, with the owner's name and the security headers.
try {
  const r = await get('/');
  const body = await r.text();
  check(r.status === 200, `home page answers 200 (got ${r.status})`);
  check(body.includes('Rayan Alyasi'), 'home page contains the site content');
  const h = (k) => r.headers.get(k) || '';
  check(h('content-security-policy').includes("default-src 'self'"), 'Content-Security-Policy is present and strict');
  check(/max-age=\d{7,}/.test(h('strict-transport-security')), 'Strict-Transport-Security is present');
  check(h('x-content-type-options') === 'nosniff', 'X-Content-Type-Options is nosniff');
} catch (e) {
  check(false, `home page reachable (${e.message})`);
}

// 3. Key files and the not-found page.
for (const [path, want] of [
  ['/robots.txt', 200],
  ['/llms.txt', 200],
  ['/cv/Rayan-Alyasi-CV.pdf', 200],
  ['/this-page-does-not-exist', 404],
]) {
  try {
    const r = await get(path);
    check(r.status === want, `${path} answers ${want} (got ${r.status})`);
  } catch (e) {
    check(false, `${path} reachable (${e.message})`);
  }
}

console.log(failures.length ? `\n${failures.length} check(s) failed for ${base}.` : `\nAll checks passed for ${base}.`);
process.exit(failures.length ? 1 : 0);
