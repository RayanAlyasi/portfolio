import { $, NS, markTime, reduceMotion, state } from './core.js';
import { seatPos } from './table.js';

const tracker = $('.jury');
const counter = $('.jcount');
const seats = {};
let flipTimer = 0;

export function initJuryTracker() {
  const mini = $('.jury svg');
  for (let n = 1; n <= 12; n++) {
    const [x, y] = seatPos(n);
    const dot = document.createElementNS(NS, 'circle');
    dot.setAttribute('cx', 7 + (x / 1000) * 44);
    dot.setAttribute('cy', 4 + (y / 386) * 25);
    dot.setAttribute('r', 3.2);
    mini.append(dot);
    seats[n] = dot;
  }
}

/** Show who's convinced before slide i; this slide's converts flip when its rebuttal lands. */
export function setJury(i, animate) {
  clearTimeout(flipTimer);
  const on = { 8: true };
  const pending = [];
  state.slides.forEach((slide, j) => {
    for (const n of (slide.dataset.flip || '').split(',').filter(Boolean)) {
      if (j < i) on[n] = true;
      else if (j === i) pending.push(+n);
    }
  });
  const paint = () => {
    let count = 0;
    for (let n = 1; n <= 12; n++) {
      seats[n].classList.toggle('on', !!on[n]);
      if (on[n]) count++;
    }
    counter.textContent = `${count} of 12`;
  };
  paint();
  if (pending.length) {
    flipTimer = setTimeout(
      () => {
        for (const n of pending) {
          on[n] = true;
          seats[n].classList.remove('pop');
          void seats[n].getBBox();
          seats[n].classList.add('pop');
        }
        paint();
      },
      animate && !reduceMotion ? (markTime(state.slides[i]) + 0.8) * 1000 : 0,
    );
  }
  const slide = state.slides[i];
  tracker.classList.toggle('show', slide.classList.contains('ex'));
  tracker.style.setProperty(
    '--jbg',
    slide.classList.contains('bg-paper') ? '#ECE9E3' : slide.classList.contains('bg-char') ? '#161616' : '#000',
  );
}
