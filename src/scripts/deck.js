import { $, $$, openDialog, reduceMotion, state, track } from './core.js';
import { hydrate, playVideos } from './media.js';
import { dealOffsets } from './table.js';
import { setJury } from './jury.js';
import { countUps } from './countups.js';
import { buildRedaction, cancelSpeak, scramble, sizeMarks, speakIn, stopScramble } from './objections.js';
import { playTransition } from './transitions.js';
import { openPanel } from './panels.js';

const dotsNav = $('.dots');
const countEl = $('.count');
const nextBtn = $('.next');
const chrome = [$('.hdr'), $('.foot'), dotsNav];
const visited = new Set();
let shown = -1; // the slide currently active, -1 before the first one
let dotButtons = [];
const pad = (n) => String(n).padStart(2, '0');

function updateChrome(i) {
  const slide = state.slides[i];
  // Only the chrome reads --ink. Setting it on these three, not :root, keeps the restyle inside them
  // instead of the whole page (about 1,000 elements) on every slide change.
  for (const el of chrome) {
    el.style.setProperty('--ink', slide.dataset.ink);
    el.style.setProperty('--inkInv', slide.dataset.ink === '#000' ? '#ECE9E3' : '#000');
  }
  dotButtons.forEach((b, j) => {
    b.classList.toggle('on', j === i);
    j === i ? b.setAttribute('aria-current', 'step') : b.removeAttribute('aria-current');
  });
  countEl.textContent = `${pad(i + 1)} / ${pad(state.slides.length)}`;
  nextBtn.style.visibility = i === state.slides.length - 1 ? 'hidden' : 'visible';
  for (const a of nextBtn.getAnimations({ subtree: true })) a.currentTime = 0; // SCROLL waits again on each slide
}

/** Make slide i current. Revisited slides appear already finished. */
export function activate(i, animate) {
  const slide = state.slides[i];
  const seen = visited.has(i);
  if (!seen) {
    visited.add(i);
    track(`reach-${slide.id}`);
  }
  slide.classList.toggle('seen', seen);
  if (seen) animate = false;
  // Every slide on the first call, then only the outgoing and incoming ones.
  for (const [j, s] of state.slides.entries()) {
    if (shown >= 0 && j !== shown && j !== i) continue;
    const on = j === i;
    s.classList.toggle('active', on);
    on
      ? (s.removeAttribute('inert'), s.removeAttribute('aria-hidden'))
      : (s.setAttribute('inert', ''), s.setAttribute('aria-hidden', 'true'));
  }
  shown = i;
  hydrate(slide);
  hydrate(state.slides[i + 1]);
  dealOffsets(slide);
  buildRedaction(slide);
  sizeMarks(slide);
  if (seen) {
    stopScramble();
    cancelSpeak(slide);
  } else {
    scramble(slide);
    speakIn(slide);
  }
  updateChrome(i);
  setJury(i, animate);
  countUps(slide, seen);
  playVideos(slide);
  state.cur = i;
}

/** Transition to slide i. Ignored mid-transition, during the countdown, or while a panel is open. */
export function go(target) {
  const i = Math.max(0, Math.min(state.slides.length - 1, target));
  if (state.busy || i === state.cur || openDialog() || state.leaderOn) return;
  state.busy = true;
  const dir = i > state.cur ? 1 : -1;
  const ref = dir > 0 ? state.slides[i] : state.slides[state.cur];
  const kind = reduceMotion ? 'fade' : ref.dataset.fx || 'fade';
  const color = dir < 0 ? getComputedStyle(state.slides[i]).backgroundColor : ref.dataset.fxc || '#000';
  // Focus inside the outgoing slide (e.g. on "Skip to the evidence") would fall back to <body> when that
  // slide goes inert, so keyboard users would restart from the top; hand it to the incoming slide instead.
  const hadFocus = state.slides[state.cur].contains(document.activeElement);
  hydrate(state.slides[i]);
  playTransition({
    kind,
    color,
    dir,
    quick: reduceMotion,
    onCovered: () => activate(i, true),
    onDone: () => {
      state.busy = false;
      if (hadFocus) state.slides[i].focus({ preventScroll: true });
      state.quietUntil = performance.now() + 380;
      state.needQuiet = true;
    },
  });
}

export function initDeck() {
  for (const [i, slide] of state.slides.entries()) {
    slide.tabIndex = -1; // focusable from script only, see go()
    slide.setAttribute('aria-label', slide.dataset.label);
    const button = Object.assign(document.createElement('button'), { type: 'button' });
    button.setAttribute('aria-label', slide.dataset.label);
    button.append(Object.assign(document.createElement('span'), { textContent: slide.dataset.label }));
    button.addEventListener('click', () => go(i));
    dotsNav.append(button);
  }
  dotButtons = $$('button', dotsNav);
  nextBtn.addEventListener('click', () => go(state.cur + 1));
  for (const b of $$('[data-go]')) b.addEventListener('click', () => go(+b.dataset.go));

  let resizeTimer = 0;
  addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      const slide = state.slides[state.cur];
      hydrate(slide);
      dealOffsets(slide);
      buildRedaction(slide);
      sizeMarks(slide);
    }, 200);
  });
}

/**
 * Open on what the address names: a slide (/exhibit-b or /#exhibit-b) or a panel (/panel/b, opened over the
 * slide that holds its button). These pages exist mainly for Umami's heatmaps (heatmap.js).
 * Returns true if the address named something, so the countdown is skipped.
 */
export function startDeck() {
  const name = location.hash.slice(1) || location.pathname.replace(/^\/|\.html$|\/$/g, '');
  const panel = name.startsWith('panel/') ? document.getElementById(`d-${name.slice(6)}`) : null;
  const slideName = panel ? $(`[data-open="${panel.id}"]`)?.closest('.slide')?.id : name;
  const start = Math.max(
    0,
    state.slides.findIndex((s) => s.id === slideName),
  );
  // Read once, then drop it: the address stays alyasi.tech/ while moving through the deck.
  if (location.pathname !== '/' || location.hash) history.replaceState(null, '', `/${location.search}`);
  activate(start, false);
  if (panel) openPanel(panel);
  return start > 0 || Boolean(panel);
}
