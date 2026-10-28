import { $ } from './core.js';

/** Title bars behind the name (its letters are in the HTML, from Opening.astro). */
export function initOpening() {
  const bars = $('.bars');
  [3, 17, 31, 45, 59, 73, 87].forEach((top, i) => {
    const bar = document.createElement('i');
    bar.className = 'bar';
    bar.style.top = `${top}%`;
    bar.style.setProperty('--from', i % 2 ? '110%' : '-110%');
    bar.style.setProperty('--d', `${i * 70}ms`);
    bars.append(bar);
  });
}
