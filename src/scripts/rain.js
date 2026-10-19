import { $$ } from './core.js';

/** Film-scratch rain on the verdict and credits; fewer lines on phones. */
export function initRain() {
  for (const field of $$('.rain')) {
    const count = innerWidth < 820 ? 22 : 46;
    for (let i = 0; i < count; i++) {
      const line = document.createElement('i');
      line.style.setProperty('--x', `${Math.random() * 110 - 5}%`);
      line.style.setProperty('--t', `${0.55 + Math.random() * 0.5}s`);
      line.style.setProperty('--d', `${-Math.random() * 2}s`);
      line.style.setProperty('--h', `${60 + Math.random() * 90}px`);
      field.append(line);
    }
  }
}
