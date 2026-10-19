# Umami 3.4.0 with one change to its heatmap recorder (/app/public/recorder.js), for alyasi.tech's slide deck.
#
# Stock Umami files each heatmap click under the page's path, and the whole deck lives at "/", so every
# slide's clicks land on one heatmap. The patched recorder asks the page for the address to file a click
# under (window.umamiHeatmapUrl, set by src/scripts/deck.js) and falls back to location.href, so any
# other page behaves exactly as before. Nothing else in the image changes: same server, database and API.
#
# The patch is checked byte for byte (input and output SHA-256), so a different Umami version fails the
# build instead of shipping an unpatched or half-patched recorder. To upgrade Umami: pin the new digest,
# check the click line still reads url:location.href, and update the two checksums.
#
# The recorder is plain JavaScript, identical on amd64 and arm64, so it is patched once on the build
# machine; the final images only copy it in (no emulation needed for arm64).

# The base image is written out in both FROM lines (not an ARG) so Dependabot can see and propose upgrades.
FROM --platform=$BUILDPLATFORM ghcr.io/umami-software/umami:3.4.0@sha256:85909afc45bdcda1917394594a087421fdbb05610fded0fa9f6fb861abb2f367 AS patch
RUN set -eu; \
    echo '21e6312866db01a71841b772c9882333231be1bc3fdbeeac1ed5193794ad80c6  /app/public/recorder.js' | sha256sum -c -; \
    sed 's/Y({type:"click",url:location.href,/Y({type:"click",url:window.umamiHeatmapUrl?.()||location.href,/' \
      /app/public/recorder.js > /tmp/recorder.js; \
    test "$(grep -o 'url:window.umamiHeatmapUrl' /tmp/recorder.js | wc -l)" -eq 1; \
    echo 'be8bb1e05412685fd1d0d07fa2bb967e2fb1b92685db5c67f7a31c1779f698fe  /tmp/recorder.js' | sha256sum -c -

FROM ghcr.io/umami-software/umami:3.4.0@sha256:85909afc45bdcda1917394594a087421fdbb05610fded0fa9f6fb861abb2f367
COPY --from=patch --chown=nextjs:nodejs /tmp/recorder.js /app/public/recorder.js
