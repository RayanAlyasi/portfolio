# Serves the prebuilt static site with nginx, as a non-root user, on port 8080.
# CI builds and checks dist/ first, generates deploy/nginx/site.conf from it, then builds this image,
# so the image contains exactly the files that passed the checks. To build locally:
#   npm run build && node scripts/deploy/nginx-config.mjs && docker build -t rayanalyasi .
#
# Only COPY steps, no RUN: the image builds for amd64 and arm64 (the server) without emulation.
# dist/_headers, the Cloudflare-format source of site.conf, is left out by .dockerignore.
#
# Pinned to the nginx 1.30 stable line: patch releases (security fixes) arrive automatically,
# and Dependabot proposes the next stable line.
FROM nginxinc/nginx-unprivileged:1.30-alpine-slim

COPY deploy/nginx/site.conf /etc/nginx/conf.d/default.conf
COPY dist/ /usr/share/nginx/html/

EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:8080/healthz || exit 1
