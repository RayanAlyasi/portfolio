import { $, $$ } from './core.js';

/** Title bars and the letter-by-letter name. */
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
  let k = 0;
  for (const row of $$('.name .row')) {
    for (const ch of row.dataset.w) {
      const span = Object.assign(document.createElement('span'), { className: 'ch', textContent: ch });
      span.dataset.c = ch;
      span.setAttribute('aria-hidden', 'true');
      span.style.setProperty('--i', k++);
      row.append(span);
    }
  }
}
