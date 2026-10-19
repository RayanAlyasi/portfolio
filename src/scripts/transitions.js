import { $ } from './core.js';

const overlay = $('.ov');

function shape(kind, color) {
  const W = innerWidth,
    H = innerHeight,
    D = Math.ceil(Math.hypot(W, H)) + 4,
    s = overlay.style;
  s.background = color;
  s.borderRadius = '0';
  s.opacity = '1';
  if (kind === 'iris' || kind === 'square') {
    Object.assign(s, { width: `${D}px`, height: `${D}px`, left: `${(W - D) / 2}px`, top: `${(H - D) / 2}px` });
    if (kind === 'iris') s.borderRadius = '50%';
  } else if (kind === 'wipe') {
    Object.assign(s, { width: `${W * 1.5}px`, height: `${H + 40}px`, left: `${-W * 0.25}px`, top: '-20px' });
  } else {
    Object.assign(s, { width: `${W}px`, height: `${H + 2}px`, left: '0px', top: '0px' });
  }
}

function frames(kind, dir) {
  switch (kind) {
    case 'iris':
      return [
        [{ transform: 'scale(0)' }, { transform: 'scale(1)' }],
        [{ opacity: 1 }, { opacity: 0 }],
      ];
    case 'square':
      return [
        [{ transform: `rotate(${45 * dir}deg) scale(0)` }, { transform: 'rotate(0deg) scale(1)' }],
        [{ transform: 'rotate(0deg) scale(1)' }, { transform: `rotate(${-45 * dir}deg) scale(0)` }],
      ];
    case 'wipe':
      return [
        [{ transform: `translateX(${-110 * dir}%) skewX(-14deg)` }, { transform: 'translateX(0) skewX(-14deg)' }],
        [{ transform: 'translateX(0) skewX(-14deg)' }, { transform: `translateX(${110 * dir}%) skewX(-14deg)` }],
      ];
    case 'slab':
      return [
        [{ transform: `translateY(${100 * dir}%)` }, { transform: 'translateY(0)' }],
        [{ transform: 'translateY(0)' }, { transform: `translateY(${-100 * dir}%)` }],
      ];
    default:
      return [
        [{ opacity: 0 }, { opacity: 1 }],
        [{ opacity: 1 }, { opacity: 0 }],
      ];
  }
}

/** Cover the screen, swap slides underneath, uncover. Transform and opacity only, so it stays on the compositor. */
export function playTransition({ kind, color, dir, quick, onCovered, onDone }) {
  shape(kind, color);
  const [cover, uncover] = frames(kind, dir);
  overlay.style.visibility = 'visible';
  const a1 = overlay.animate(cover, { duration: quick ? 120 : 480, easing: 'cubic-bezier(.7,0,.3,1)', fill: 'forwards' });
  a1.onfinish = () => {
    onCovered();
    const a2 = overlay.animate(uncover, { duration: quick ? 120 : 560, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'forwards' });
    a2.onfinish = () => {
      overlay.style.visibility = 'hidden';
      // Hidden elements still have a size, and the iris and square shapes are larger than the screen.
      // Umami's recorder measures the page from every element's box, so a leftover large overlay would
      // make each later click look like it came from a taller page and skew that slide's heatmap.
      Object.assign(overlay.style, { width: '0px', height: '0px' });
      a1.cancel();
      a2.cancel();
      onDone();
    };
  };
}
