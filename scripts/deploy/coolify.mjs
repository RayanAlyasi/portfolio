// Asks Coolify to redeploy an application through its authenticated deploy webhook.
// Used by the staging, production and rollback jobs; the values come from the job's environment.
//   COOLIFY_WEBHOOK=<app deploy webhook> COOLIFY_TOKEN=<deploy-only token> node scripts/deploy/coolify.mjs
// Coolify is reachable only over Tailscale, so the job joins the tailnet first.
// Coolify answering means the deploy is queued, not live: the smoke test that follows confirms that.
const { COOLIFY_WEBHOOK: url, COOLIFY_TOKEN: token } = process.env;
if (!url || !token) {
  console.error("Set COOLIFY_WEBHOOK and COOLIFY_TOKEN in this job's GitHub environment.");
  process.exit(1);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// A freshly joined tailnet node can take a few seconds to reach its peer, so retry connection errors.
let res;
for (let attempt = 1; !res; attempt++) {
  try {
    res = await fetch(url, { headers: { authorization: `Bearer ${token}` } });
  } catch (e) {
    if (attempt === 6) {
      console.error(`Coolify did not answer over the tailnet (${e.cause?.code || e.message}).`);
      process.exit(1);
    }
    await sleep(5000);
  }
}

const body = (await res.text()).slice(0, 500);
if (!res.ok) {
  console.error(`Coolify did not accept the deploy (HTTP ${res.status}): ${body}`);
  process.exit(1);
}
console.log(`Coolify queued the deploy: ${body}`);
