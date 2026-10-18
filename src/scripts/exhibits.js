import { $, $$ } from './core.js';

const HOMELAB_SINCE = new Date(2021, 8, 1);

/** Split headlines into masked words (or letters), stagger stats, and fill live counters. */
export function initExhibits() {
  for (const h of $$('.evh')) {
    const text = h.textContent.trim();
    const words = text.split(/\s+/);
    h.setAttribute('aria-label', text);
    h.textContent = '';
    words.forEach((w, k) => {
      const mask = Object.assign(document.createElement('span'), { className: 'wm' });
      mask.setAttribute('aria-hidden', 'true');
      const word = Object.assign(document.createElement('span'), { className: 'wi', textContent: w });
      word.style.setProperty('--k', k);
      mask.append(word);
      h.append(mask);
      if (k < words.length - 1) h.append(' ');
    });
  }
  for (const h of $$('.ex[data-hl="chars"] .evh')) {
    let j = 0;
    for (const word of $$('.wi', h)) {
      const letters = word.textContent;
      word.textContent = '';
      for (const ch of letters) {
        const span = Object.assign(document.createElement('span'), { className: 'ch2', textContent: ch });
        span.style.setProperty('--j', j++);
        word.append(span);
      }
      j++;
    }
  }
  for (const list of $$('.stats')) $$('li', list).forEach((li, k) => li.style.setProperty('--k', k));

  const days = Math.floor((Date.now() - HOMELAB_SINCE.getTime()) / 864e5).toLocaleString('en-US');
  for (const el of $$('.since')) {
    el.dataset.count = days.replace(/,/g, '');
    el.textContent = days;
  }
  for (const el of $$('.since-f')) el.textContent = days;

  const field = $('.dotfield');
  if (field) {
    for (let d = 0; d < 160; d++) {
      const dot = document.createElement('i');
      dot.style.setProperty('--d', ((d * 47) % 100) / 100);
      if (d % 9 === 0) dot.className = 'keep';
      if (d === 81) dot.className = 'me';
      field.append(dot);
    }
  }
}
