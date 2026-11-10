# Umami 3.4.0 with one change to its heatmap recorder (/app/public/recorder.js), for alyasi.tech's slide deck.
#
# Stock Umami files each heatmap click under the page's address and sizes the heatmap from the page's
# measured height. The deck is one page at "/" that never scrolls, with long panels that scroll inside
# themselves, so stock heatmaps pile every slide and panel onto one misaligned picture. The patched
# recorder passes each heatmap event (click or scroll) through window.umamiHeatmapEvent when the page
# defines it (src/scripts/heatmap.js): the page returns the event to record, adjusted (address, position,
# page size), or nothing to skip it. Pages without that function behave exactly as before. Nothing else in
# the image changes: same server, database and API.
#
# The patch is checked byte for byte (input and output SHA-256), so a different Umami version fails the
# build instead of shipping an unpatched or half-patched recorder. To upgrade Umami: pin the new digest,
# check the recorder still queues heatmap events in one function, and update the patch and both checksums.
#
# The recorder is plain JavaScript, identical on amd64 and arm64, so it is patched once on the build
# machine; the final images only copy it in (no emulation needed for arm64).

# The base image is written out in both FROM lines (not an ARG) so Dependabot can see and propose upgrades.
FROM --platform=$BUILDPLATFORM ghcr.io/umami-software/umami:3.4.1@sha256:e69d1a7932e9dab0fc523edc7be1f3a53f3c261f57856fc2167ae74a8fc022e8 AS patch
RUN set -eu; \
    echo '21e6312866db01a71841b772c9882333231be1bc3fdbeeac1ed5193794ad80c6  /app/public/recorder.js' | sha256sum -c -; \
    # queueHeatmapEvent (minified to Y): run the page's hook first; if it throws, record the event as is.
    sed 's/Y=e=>{I.push({...e,timestamp:Date.now()})/Y=e=>{const h=window.umamiHeatmapEvent;if("function"==typeof h){try{e=h(e)}catch{}if(!e)return}I.push({...e,timestamp:Date.now()})/' \
      /app/public/recorder.js > /tmp/recorder.js; \
    test "$(grep -o 'window.umamiHeatmapEvent' /tmp/recorder.js | wc -l)" -eq 1; \
    echo '451fd65370b2301b8542bc5d4099d4a66108d894d8b82fcf834cfe2f80fac5bf  /tmp/recorder.js' | sha256sum -c -

FROM ghcr.io/umami-software/umami:3.4.1@sha256:e69d1a7932e9dab0fc523edc7be1f3a53f3c261f57856fc2167ae74a8fc022e8
COPY --from=patch --chown=nextjs:nodejs /tmp/recorder.js /app/public/recorder.js
