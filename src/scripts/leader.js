import { $, reduceMotion, state, track } from './core.js';

const leader = $('.leader');
const opening = $('.s-open');
let timer = 0;

/** End the countdown and start the opening titles. */
export function endLeader(natural = false) {
  if (!state.leaderOn) return;
  state.leaderOn = false;
  clearTimeout(timer);
  track(natural ? 'countdown-finished' : 'countdown-skipped');
  leader.classList.add('out');
  opening.classList.add('go');
  setTimeout(() => leader.classList.remove('on', 'out'), 470);
}

/** 3-2-1 film leader. Skipped for reduced motion and inside frames (e.g. Umami's heatmap overlay). */
export function runLeader() {
  if (reduceMotion || window.self !== window.top) {
    opening.classList.add('go');
    return;
  }
  state.leaderOn = true;
  leader.classList.add('on');
  const num = $('.lnum', leader);
  let n = 3;
  const tick = () => {
    num.textContent = n;
    if (n === 0) return endLeader(true);
    n -= 1;
    timer = setTimeout(tick, 750);
  };
  tick();
  $('.lskip', leader).addEventListener('click', () => endLeader());
  leader.addEventListener('click', () => endLeader());
}

export const startOpeningWithoutLeader = () => opening.classList.add('go');
