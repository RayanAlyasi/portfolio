import { $$, markTime, reduceMotion } from './core.js';

/** Count stats up from zero after the rebuttal; a newer run cancels an older one. */
export function countUps(slide, instant) {
  const token = (slide._countToken = (slide._countToken || 0) + 1);
  for (const el of $$('[data-count]', slide)) {
    const to = +el.dataset.count,
      pre = el.dataset.prefix || '',
      suf = el.dataset.suffix || '';
    const fmt = (v) => pre + Math.round(v).toLocaleString('en-US') + suf;
    if (reduceMotion || instant) {
      el.textContent = fmt(to);
      continue;
    }
    el.textContent = fmt(0);
    const delay = (markTime(slide) + 0.75) * 1000,
      duration = 1200;
    let start = 0;
    const step = (ts) => {
      if (slide._countToken !== token) return;
      start ||= ts + delay;
      const t = Math.min(1, Math.max(0, (ts - start) / duration));
      el.textContent = fmt(to * (1 - (1 - t) ** 3));
      if (t < 1 && slide.classList.contains('active')) requestAnimationFrame(step);
      else el.textContent = fmt(to);
    };
    requestAnimationFrame(step);
  }
}
