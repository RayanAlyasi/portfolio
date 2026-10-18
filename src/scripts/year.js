import { $, $$ } from './core.js';

const START = new Date(2025, 7, 1); // first day of the degree
const YEARS = 4;
const ORDINALS = ['first', 'second', 'third', 'fourth'];

/** Fill every [data-yr] slot, the rolling year digit and the progress bar from today's date. */
export function initYear(now = new Date()) {
  const months = (now.getFullYear() - START.getFullYear()) * 12 + (now.getMonth() - START.getMonth()) + (now.getDate() - 1) / 31;
  const done = months >= YEARS * 12;
  const year = Math.max(1, Math.min(YEARS, Math.floor(months / 12) + 1));
  const ordinal = ORDINALS[year - 1];
  const text = {
    label: done ? 'Graduated' : `Year ${year} of ${YEARS}`,
    lower: done ? 'graduate' : `year ${year} of ${YEARS}`,
    ordinal,
    cap: ordinal[0].toUpperCase() + ordinal.slice(1),
    y2title: year <= 2 ? 'Year two, so far' : 'Year two',
  };
  for (const el of $$('[data-yr]')) if (text[el.dataset.yr] != null) el.textContent = text[el.dataset.yr];

  const label = $('.f-year [data-yr="label"]');
  if (label && !done) {
    label.textContent = 'Year ';
    const window_ = document.createElement('span');
    window_.className = 'reel-w';
    const reel = document.createElement('span');
    reel.className = 'reel';
    reel.style.setProperty('--n', year);
    for (let y = 1; y <= year; y++) reel.append(Object.assign(document.createElement('span'), { textContent: y }));
    window_.append(reel);
    label.append(window_, ` of ${YEARS}`);
    label.parentNode.setAttribute('aria-label', text.label);
  }

  $$('.f-seg').forEach((seg, i) => {
    const fill = Math.max(0, Math.min(1, months / 12 - i));
    seg.querySelector('i').style.setProperty('--fill', fill.toFixed(3));
    seg.querySelector('i').style.setProperty('--k', i);
  });
  const progress = Math.max(0, Math.min(1, months / (YEARS * 12)));
  $('.f-bar')?.style.setProperty('--now', `${(progress * 100).toFixed(2)}%`);
}
