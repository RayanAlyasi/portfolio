import { $$, reduceMotion } from './core.js';

/**
 * Load the images and videos inside `root` the first time it's needed.
 * Elements that aren't displayed (e.g. desktop-only photos on a phone) are skipped,
 * so phones never download them.
 */
export function hydrate(root) {
  if (!root) return;
  for (const img of $$('img[data-src]', root)) {
    if (img.getAttribute('src') || (!img.closest('dialog') && img.offsetParent === null)) continue;
    const picture = img.parentElement?.tagName === 'PICTURE' ? img.parentElement : null;
    if (picture) for (const source of $$('source[data-srcset]', picture)) source.srcset = source.dataset.srcset;
    img.src = img.dataset.src;
  }
  for (const video of $$('video[data-vid]', root)) {
    if (video.getAttribute('src') || (!video.closest('dialog') && video.offsetParent === null)) continue;
    video.poster = video.dataset.posterSrc || '';
    video.addEventListener(
      'error',
      () => {
        const img = document.createElement('img');
        img.className = video.className;
        img.src = video.dataset.fallbackSrc;
        img.alt = video.getAttribute('aria-label') || '';
        video.replaceWith(img);
      },
      { once: true },
    );
    const mp4 = video.canPlayType('video/mp4; codecs="avc1.4D401E, mp4a.40.2"');
    const webm = video.canPlayType('video/webm; codecs="vp9, opus"');
    const useWebm = video.dataset.webm && mp4 !== 'probably' && (!mp4 || webm);
    video.src = useWebm ? video.dataset.webm : video.dataset.mp4;
  }
}

/** Play the muted loops on the active slide and pause every other video. */
export function playVideos(active) {
  for (const video of $$('.slide video')) {
    if (active.contains(video) && !reduceMotion && video.offsetParent !== null && video.getAttribute('src')) {
      video.play()?.catch(() => {});
    } else if (!video.paused) {
      video.pause();
    }
  }
}
