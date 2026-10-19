import { track } from './core.js';

/**
 * Umami's tracker counts a page view whenever the address changes, and the deck changes it on every slide.
 * Report the deck as one page, as before: the first page view only, every event on "/". (The recorder is
 * separate and still sees each slide's address, which is what splits the heatmaps.)
 */
function reportDeckAsOnePage() {
  let viewed = false;
  let firstReferrer;
  window.umamiBeforeSend = (type, payload) => {
    if (type !== 'event' || !payload) return payload;
    const isPageView = !payload.name;
    if (isPageView && viewed) return null;
    viewed ||= isPageView;
    firstReferrer ??= payload.referrer;
    const url = new URL(payload.url || '/', location.origin);
    return { ...payload, url: `/${url.search}`, referrer: firstReferrer };
  };
}

/** Page-wide events: tagged buttons, outbound links, video engagement and ?ref= tags. */
export function initAnalytics() {
  reportDeckAsOnePage();
  document.addEventListener('click', (e) => {
    const tagged = e.target.closest?.('[data-track]');
    if (tagged) track(tagged.dataset.track);
    const link = e.target.closest?.('a[href^="http"]');
    if (link) {
      try {
        const u = new URL(link.href);
        track('outbound', { to: u.hostname.replace(/^www\./, '') + u.pathname.replace(/\/$/, '') });
      } catch {
        /* ignore */
      }
    }
  });
  document.addEventListener(
    'play',
    (e) => {
      const v = e.target;
      if (v?.tagName === 'VIDEO' && !v.muted) track('video-play', { video: v.dataset.vid || '' });
    },
    true,
  );
  document.addEventListener(
    'timeupdate',
    (e) => {
      const v = e.target;
      if (v?.tagName !== 'VIDEO' || v.muted || !v.duration) return;
      const percent = Math.floor((v.currentTime / v.duration) * 4) * 25;
      v._milestones ||= {};
      if (percent >= 25 && !v._milestones[percent]) {
        v._milestones[percent] = true;
        track('video-progress', { video: v.dataset.vid || '', percent });
      }
    },
    true,
  );
  const ref = new URLSearchParams(location.search).get('ref');
  if (ref) track('ref', { ref: ref.slice(0, 40) });
}
