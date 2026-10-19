// Shared helpers and state. Module scripts run after the document is parsed,
// so querying the DOM at import time is safe.
export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
export const NS = 'http://www.w3.org/2000/svg';
export const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

export const state = {
  slides: $$('.slide'),
  cur: 0,
  busy: false,
  leaderOn: false,
  quietUntil: 0, // after a slide change, wheel input is ignored until this time (ms)
  needQuiet: false, // and until the wheel pauses once, so one long scroll moves one slide
};

/** Seconds after a slide activates when its objection gets rebutted. */
export const markTime = (slide) => parseFloat(slide.dataset.t || '2.45');

export const openDialog = () => !!document.querySelector('dialog[open]');

/** Send a custom event to Umami if it's loaded; a silent no-op otherwise. */
export function track(name, data) {
  try {
    if (typeof window.umami?.track === 'function') data ? window.umami.track(name, data) : window.umami.track(name);
  } catch {
    /* analytics must never break the page */
  }
}
