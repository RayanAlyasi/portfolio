import { $, $$, openDialog, reduceMotion, state, track } from './core.js';
import { hydrate, playVideos } from './media.js';
import { dealOffsets } from './table.js';
import { setJury } from './jury.js';
import { countUps } from './countups.js';
import { buildRedaction, cancelSpeak, scramble, sizeMarks, speakIn, stopScramble } from './objections.js';
import { playTransition } from './transitions.js';

const root = document.documentElement;
const dotsNav = $('.dots');
const countEl = $('.count');
const nextBtn = $('.next');
const visited = new Set();
let dotButtons = [];
const pad = (n) => String(n).padStart(2, '0');

function updateChrome(i) {
  const slide = state.slides[i];
  root.style.setProperty('--ink', slide.dataset.ink);
  root.style.setProperty('--inkInv', slide.dataset.ink === '#000' ? '#ECE9E3' : '#000');
  dotButtons.forEach((b, j) => {
    b.classList.toggle('on', j === i);
    j === i ? b.setAttribute('aria-current', 'step') : b.removeAttribute('aria-current');
  });
  countEl.textContent = `${pad(i + 1)} / ${pad(state.slides.length)}`;
  nextBtn.style.visibility = i === state.slides.length - 1 ? 'hidden' : 'visible';
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
  state.slides.forEach((s, j) => {
    const on = j === i;
    s.classList.toggle('active', on);
    on
      ? (s.removeAttribute('inert'), s.removeAttribute('aria-hidden'))
      : (s.setAttribute('inert', ''), s.setAttribute('aria-hidden', 'true'));
  });
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
  history.replaceState?.(null, '', `#${slide.id}`);
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
  hydrate(state.slides[i]);
  playTransition({
    kind,
    color,
    dir,
    quick: reduceMotion,
    onCovered: () => activate(i, true),
    onDone: () => {
      state.busy = false;
      state.quietUntil = performance.now() + 380;
      state.needQuiet = true;
    },
  });
}

export function initDeck() {
  for (const [i, slide] of state.slides.entries()) {
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

/** Open on the slide named in the URL hash, or the first one. Returns its index. */
export function startDeck() {
  const hash = location.hash.slice(1);
  const start = Math.max(
    0,
    state.slides.findIndex((s) => s.id === hash),
  );
  activate(start, false);
  return start;
}
