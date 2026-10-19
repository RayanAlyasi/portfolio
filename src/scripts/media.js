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
    // Panels hydrate when opened: fetch just the duration and index, so the scrubber can seek
    // before play. The markup keeps preload="none" so a closed panel costs nothing.
    if (video.closest('dialog')) video.preload = 'metadata';
    video.src = useWebm ? video.dataset.webm : video.dataset.mp4;
  }
}

const fullscreenElement = () => document.fullscreenElement || document.webkitFullscreenElement;

// The current frame as an image, shown as the poster while the source switches. Null if unavailable.
function frameOf(video) {
  try {
    const canvas = Object.assign(document.createElement('canvas'), { width: video.videoWidth, height: video.videoHeight });
    canvas.getContext('2d').drawImage(video, 0, 0);
    return canvas.toDataURL('image/jpeg', 0.85);
  } catch {
    return null;
  }
}

/**
 * Switch a video that entered full screen to its HD file. The HD file loads in a hidden element from the
 * current position; once it can play through, the visible video takes it over at the same time and play
 * state, with the current frame held as the poster, so nothing restarts or flashes. Leaving full screen
 * first cancels the load.
 */
function upgradeToHd(video) {
  if (!video.dataset.hd || video.dataset.hdLoading || video.currentSrc.endsWith(video.dataset.hd)) return;
  video.dataset.hdLoading = '1';
  const prep = Object.assign(document.createElement('video'), { muted: true, preload: 'auto' });
  const stop = () => {
    document.removeEventListener('fullscreenchange', onExit);
    document.removeEventListener('webkitfullscreenchange', onExit);
    video.removeEventListener('webkitendfullscreen', onExit);
    delete video.dataset.hdLoading;
  };
  // Drop the preloaded copy so its buffered HD video doesn't stay in memory.
  const release = () => {
    prep.removeAttribute('src');
    prep.load();
  };
  const onExit = () => {
    if (fullscreenElement() === video) return;
    stop();
    release();
  };
  prep.addEventListener(
    'canplaythrough',
    () => {
      stop();
      if (fullscreenElement() !== video && !video.webkitDisplayingFullscreen) return release();
      const time = video.currentTime;
      const playing = !video.paused;
      const poster = video.poster;
      video.poster = frameOf(video) || poster;
      video.src = video.dataset.hd;
      video.currentTime = time;
      video.addEventListener(time ? 'seeked' : 'loadeddata', () => (video.poster = poster), { once: true });
      if (playing) video.play()?.catch(() => {});
      release();
    },
    { once: true },
  );
  document.addEventListener('fullscreenchange', onExit);
  document.addEventListener('webkitfullscreenchange', onExit);
  video.addEventListener('webkitendfullscreen', onExit);
  prep.src = video.dataset.hd;
  prep.currentTime = video.currentTime;
}

/** Videos with an HD file switch to it when they enter full screen (Safari on iPhone reports it on the video). */
export function initHdOnFullscreen() {
  const onEnter = () => {
    const el = fullscreenElement();
    if (el?.tagName === 'VIDEO') upgradeToHd(el);
  };
  document.addEventListener('fullscreenchange', onEnter);
  document.addEventListener('webkitfullscreenchange', onEnter);
  document.addEventListener('webkitbeginfullscreen', (e) => e.target.tagName === 'VIDEO' && upgradeToHd(e.target), true);
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
