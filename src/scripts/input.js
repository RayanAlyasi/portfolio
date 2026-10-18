import { openDialog, state } from './core.js';
import { go } from './deck.js';
import { endLeader } from './leader.js';

/** One gesture moves one slide: wheel bursts are merged, swipes need clear vertical intent. */
export function initInput() {
  let acc = 0,
    lastWheel = 0;
  addEventListener(
    'wheel',
    (e) => {
      if (state.leaderOn) {
        e.preventDefault();
        endLeader();
        return;
      }
      if (openDialog()) return;
      e.preventDefault();
      const now = performance.now(),
        gap = now - lastWheel;
      lastWheel = now;
      if (state.busy || now < (state.quietUntil || 0)) return;
      if (state.needQuiet) {
        if (gap < 140) return;
        state.needQuiet = false;
      }
      if (gap > 220) acc = 0;
      acc += Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : 0;
      if (Math.abs(acc) > 28) {
        const step = acc > 0 ? 1 : -1;
        acc = 0;
        go(state.cur + step);
      }
    },
    { passive: false },
  );

  let startY = 0,
    startX = 0,
    startT = 0;
  addEventListener(
    'touchstart',
    (e) => {
      if (openDialog()) return;
      startY = e.touches[0].clientY;
      startX = e.touches[0].clientX;
      startT = performance.now();
    },
    { passive: true },
  );
  addEventListener(
    'touchmove',
    (e) => {
      if (!openDialog() && e.touches.length === 1) e.preventDefault();
    },
    { passive: false },
  );
  addEventListener(
    'touchend',
    (e) => {
      if (state.leaderOn) {
        endLeader();
        return;
      }
      if (openDialog()) return;
      const t = e.changedTouches[0],
        dy = startY - t.clientY,
        dx = startX - t.clientX;
      if (Math.abs(dy) > 42 && Math.abs(dy) > Math.abs(dx) * 1.2 && performance.now() - startT < 900) go(state.cur + (dy > 0 ? 1 : -1));
    },
    { passive: true },
  );

  addEventListener('keydown', (e) => {
    if (state.leaderOn) {
      endLeader();
      return;
    }
    if (openDialog()) return;
    const tag = e.target?.tagName;
    const keys = { ArrowDown: 1, PageDown: 1, ArrowUp: -1, PageUp: -1 };
    if (e.key in keys) {
      e.preventDefault();
      go(state.cur + keys[e.key]);
    } else if (e.key === ' ' && tag !== 'BUTTON' && tag !== 'A') {
      e.preventDefault();
      go(state.cur + 1);
    } else if (e.key === 'Home') {
      e.preventDefault();
      go(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      go(state.slides.length - 1);
    }
  });
}
