import { track } from './core.js';

/** Page-wide events: tagged buttons, outbound links, video engagement and ?ref= tags. */
export function initAnalytics() {
  // Umami's heatmap screen shows the site in a frame; viewing a heatmap is not a visit, so send nothing.
  // (The recorder needs the session this would create, so it records nothing there either.)
  if (window.self !== window.top) window.umamiBeforeSend = () => null;
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
