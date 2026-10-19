# Deployment

How alyasi.tech is hosted, deployed and operated.

Self-hosted with [Coolify](https://coolify.io) on my own server, behind Cloudflare. Every change goes through staging before production, and production runs the exact image that passed staging:

```
feature branch ─▶ PR into staging ─▶ build + checks, every slide on six phone sizes
merge          ─▶ nginx image built once: tested, published as sha-<commit>, provenance signed
               ─▶ staging.alyasi.tech: that image deployed, smoke test
PR staging ─▶ main ─▶ "promotion" check: source is staging, and staging passed for this commit
merge          ─▶ alyasi.tech: the SAME image promoted (nothing rebuilt), smoke test
visitors ─▶ Cloudflare (HTTPS, caching, attack protection) ─▶ Cloudflare Tunnel ─▶ Coolify proxy ─▶ nginx
CI deploy jobs ─▶ Tailscale (joined only for that job) ─▶ Coolify's deploy webhook
```

The image is nginx (unprivileged, port 8080) serving the built site; its config is generated from the build's security headers by `scripts/deploy/nginx-config.mjs`. It is built for amd64 and arm64 (the server is arm64). Cloudflare Tunnel connects out from the server, which also hides its IP. Coolify itself has no public hostname: it is reachable only over my Tailscale network (tailnet), and CI joins it just for each deploy.

## Branches

- **`staging`** is the default branch and deploys to https://staging.alyasi.tech. **`main`** deploys to https://alyasi.tech.
- Nothing is pushed to either directly; rulesets block it. Work on a branch from `staging`, open a PR into `staging` (squash merge), then promote with a PR from `staging` into `main` (merge commit).
- Only `staging` can be merged into `main`: the required **promotion** check fails for any other source branch.

## Build once, promote the same image

GitHub has no fast-forward merge: every merge method creates a new commit ([merge methods](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/configuring-pull-request-merges/about-merge-methods-on-github)). So `main` only accepts merge commits, and a promotion merge's second parent is the staging commit that was built and tested. Because `main` only ever receives `staging`, the merge's files are identical to that commit's.

`promote.yml` relies on that and checks it: it refuses to deploy unless the merge's file tree equals its second parent's, then copies that commit's image (`sha-<commit>`) to the `production` tag. The copy keeps the digest, so the provenance attestation still verifies, and `/version.json` on production shows the staging commit.

## Workflows

| Workflow | When | What it does |
|---|---|---|
| `deploy.yml` | PRs into `staging`, merges to `staging` | Secret scan, workflow lint, build, site checks, every slide on six phone sizes (all in the `build` check). On merge: image, staging deploy, smoke test |
| `promote.yml` | PRs into `main`, merges to `main` | `promotion` check on the PR; on merge, promotes the tested image to production and smoke-tests it |
| `dependency-review.yml` | Every PR | Fails if the PR adds a dependency with a known vulnerability |
| `pr-title.yml` | Every PR | Fails unless the title follows Conventional Commits (rules in `AGENTS.md`) |
| `uptime.yml` | Every 30 minutes | Checks production; a failure emails you |
| `rollback.yml` | Manually, on `main` | Points production at an earlier version |
| CodeQL (GitHub default setup) | Every PR and push | Code scanning, configured in settings, no workflow file |

Every action is pinned to a full commit SHA (GitHub's guidance for immutable releases), tokens get the least permissions each job needs, and deploy secrets live only in the `staging` and `production` environments, so pull request builds can never read them. Dependabot keeps actions, npm packages and the nginx image current, and opens its PRs against `staging`, titled `chore(deps): …`.

## One-time setup

**Cloudflare** (dashboard)
1. Add the domain to Cloudflare (free plan) and switch its nameservers. For AI crawlers choose **Do not block** (otherwise Cloudflare blocks them regardless of `robots.txt`). Turn on DNSSEC and 2FA.
2. Create a tunnel (*Networking → Tunnels*, Docker option) and keep its token. Add three **Published Application** routes, each to `http://localhost:80` (the Coolify proxy): `alyasi.tech`, `staging.alyasi.tech` and `stats.alyasi.tech`. No wildcard, and no route to Coolify ([Coolify: tunnel all resources](https://coolify.io/docs/integrations/networking/cloudflare/tunnels/all-resource)).
3. In Zero Trust, create a **service token** for CI and an **Access** application for `staging.alyasi.tech` with an **Allow** policy for your email and a **Service Auth** policy for that token. Search engines then cannot index a duplicate of the site, and CI's smoke test still gets through.

**Tailscale** (how CI reaches Coolify)
1. Install Tailscale on the server ([Ubuntu packages](https://pkgs.tailscale.com/stable/#ubuntu-noble)), run `sudo tailscale up`, approve the device, and turn off its key expiry in the admin console.
2. Coolify listens only on `127.0.0.1`: port 8000 (dashboard and API), 6001 (realtime updates) and 6002 (terminal). Share each on the tailnet with `sudo tailscale serve --bg --http=<port> http://127.0.0.1:<port>` ([Tailscale Serve](https://tailscale.com/kb/1242/tailscale-serve)); this survives reboots and passes websockets through. Without 6001 the dashboard shows "Cannot connect to real-time service".
3. In the tailnet policy file, define `tag:ci`, a `hosts` alias for the server, and one grant: `tag:ci` may reach only the server on `tcp:8000`. Make sure no other rule has `"src": ["*"]`, which would include `tag:ci`. Add policy `tests` that accept `tag:ci` on port 8000 and deny it on 22, 80, 6001 and 6002, so a policy that widens CI's access cannot be saved.
4. *Settings → Trust credentials*: two **OpenID Connect** credentials ([workload identity federation](https://tailscale.com/kb/1581/workload-identity-federation)), one per GitHub environment, so GitHub's own short-lived token signs CI in and no Tailscale secret is stored anywhere. Each has issuer `https://token.actions.githubusercontent.com`, scope **Auth Keys: Write** with tag `tag:ci`, and an exact subject. The repository was created after 15 July 2026, so GitHub's subject includes the owner and repository IDs ([GitHub OIDC](https://docs.github.com/en/actions/reference/security/oidc)):
   - `repo:RayanAlyasi@<owner id>/portfolio@<repository id>:environment:staging`
   - `repo:RayanAlyasi@<owner id>/portfolio@<repository id>:environment:production`

   (`gh api repos/RayanAlyasi/portfolio --jq '"\(.owner.id) \(.id)"'` prints both IDs.) Deploy jobs use the credential through [tailscale/github-action](https://github.com/tailscale/github-action) as an ephemeral node that logs out when the job ends.

**Coolify**
1. Run the tunnel connector: a **Cloudflared** service with the tunnel token as `CLOUDFLARE_TUNNEL_TOKEN`, its image pinned to a fixed `cloudflare/cloudflared` release instead of `latest`.
2. No public URL in *Settings → General*: the dashboard is used over SSH or Tailscale.
3. *Settings → Advanced*: **API Access** on. *Keys & Tokens*: a token with only the **deploy** permission, for CI.
4. A project with `staging` and `production` environments, each with a **Docker Image** application:
   - image `ghcr.io/rayanalyasi/portfolio`, tag `staging` or `production`
   - port **8080**, health check `/healthz` on host **`127.0.0.1`**. Coolify checks from inside the container with `wget`, and there `localhost` resolves to IPv6 `::1`, where nginx does not listen
   - domain `https://staging.alyasi.tech` or `https://alyasi.tech`, with **Redirect HTTP to HTTPS** off (the tunnel connects over HTTP, so the redirect would loop)
5. Each application's deploy webhook is `http://<server MagicDNS name>:8000/api/v1/deploy?uuid=<app uuid>`, called with the deploy token. Use the full `*.ts.net` name, not the `100.x` address: Tailscale Serve routes by hostname and answers 404 to the bare address ([deploy webhooks](https://coolify.io/docs/applications/deployments/automatic-deployments)). The address stays out of this public repository; it lives only in the `COOLIFY_WEBHOOK` secrets.
6. After the first staging build publishes the image, make the GHCR package public (it contains only the public site), so the server needs no registry login.

**GitHub repository settings** (the rulesets are in `.github/rulesets/`)
1. *Settings → Actions → General*: workflow permissions **Read repository contents and packages permissions**; untick **Allow GitHub Actions to create and approve pull requests**; turn on **Require actions to be pinned to a full-length commit SHA**.
2. Default branch `staging`; allow **squash** and **merge commits**, not rebase; **automatically delete head branches** (the rulesets keep `staging` and `main` from deletion). Both merge methods default to the **pull request title and description** as the commit message (`squash_merge_commit_title=PR_TITLE`, `squash_merge_commit_message=PR_BODY`, `merge_commit_title=PR_TITLE`, `merge_commit_message=PR_BODY`).
3. *Settings → Rules → Rulesets*: import `.github/rulesets/staging.json` and `.github/rulesets/main.json`, or create them with `gh api repos/RayanAlyasi/portfolio/rulesets --input .github/rulesets/<branch>.json`. Both require a pull request, block force pushes and deletion, and have no bypass. Required checks: `build`, `dependency-review` and `pr-title` on `staging`; `promotion`, `dependency-review` and `pr-title` on `main`.
4. *Settings → Environments*, each with no required reviewers (merging the promotion PR is the approval):
   - `staging`: deployment branch **`staging`** only. Variables: `TS_CLIENT_ID`, `TS_AUDIENCE` (the staging Tailscale credential; not secrets). Secrets: `COOLIFY_WEBHOOK` (staging app), `COOLIFY_TOKEN`, and the Access service token as `CF_ACCESS_CLIENT_ID` / `CF_ACCESS_CLIENT_SECRET`.
   - `production`: deployment branch **`main`** only. Variables: `TS_CLIENT_ID`, `TS_AUDIENCE` (the production Tailscale credential). Secrets: `COOLIFY_WEBHOOK` (production app), `COOLIFY_TOKEN`. Production is public, so it needs no Access token.
5. *Settings → Secrets and variables → Actions → Variables*: `SITE_URL` (`https://alyasi.tech`), `STAGING_URL` (`https://staging.alyasi.tech`), and optionally `UMAMI_HOST`, `UMAMI_WEBSITE_ID`.
6. *Settings → Advanced Security*: enable the **dependency graph** (the required `dependency-review` check fails on every PR without it), **secret scanning** with **push protection**, **Dependabot alerts** and **security updates**, **CodeQL (default setup)**, and **private vulnerability reporting**.

**First push (new repository).** A pull request needs an existing base branch, so `main` starts at an empty commit and gets its content only through the first promotion:
1. `git init -b staging`, commit an empty first commit (`git commit --allow-empty -m "Start"`), then commit the site, and push `staging`. This first push deploys staging.
2. Create `main` at the empty first commit: `gh api repos/RayanAlyasi/portfolio/git/refs -f ref=refs/heads/main -f sha=<first commit>`. Creating the branch deploys nothing.
3. Apply the settings, rulesets and environments above.
4. Open a PR from `staging` into `main` and merge it: the first production deploy.

## Day to day
- Branch from `staging`, open a PR into `staging`, merge it when `build` and `dependency-review` pass. Staging deploys and checks itself.
- To release, open a PR from `staging` into `main` titled `chore(release): promote staging to production`. When `promotion` passes, merge it (merge commit): production gets the same image. If `promotion` fails because staging is still deploying, re-run it when that finishes.
- To verify an image's provenance: `gh attestation verify oci://ghcr.io/rayanalyasi/portfolio:production --repo RayanAlyasi/portfolio`.
- To roll back: *Actions → Roll back → Run workflow*, choose the **main** branch, and give the full commit SHA (the one `/version.json` showed).

## Analytics (Umami)

The site's tracking code is built in and switches on when the Umami variables exist; without them the site ships with analytics off. Tracking only runs on the production domain, so staging visits are never counted.

1. In Coolify, add the **Umami** service (one-click template), pinned to **3.4.0** or newer (the first release with `/recorder.js` is 3.1.0), with the domain `https://stats.alyasi.tech` and **Redirect HTTP to HTTPS** off. The `stats.alyasi.tech` tunnel route is already in place.
2. Log in and change the default admin password immediately.
3. Add a website for `alyasi.tech`, copy its **Website ID**, and set **heatmaps on, replays off**.
4. Add the repository variables `UMAMI_HOST` (`https://stats.alyasi.tech`) and `UMAMI_WEBSITE_ID`, then re-run the staging deploy and promote it.

To keep the dashboard private, put `stats.alyasi.tech` behind Cloudflare Access, but leave `/script.js`, `/recorder.js` and `/api/*` public, or tracking stops.
