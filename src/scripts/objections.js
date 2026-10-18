import { $, $$, NS, reduceMotion } from './core.js';

// Seconds until the rebuttal lands, per entrance style. Text-driven styles compute their own.
const MARK_AT = { crt: 2.05, stage: 2.75, echo: 2.0, spot: 2.1, flip: 1.75, scramble: 1.9 };
let scrambleTimer = 0;

const el = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  node.setAttribute('aria-hidden', 'true');
  return node;
};

function splitInto(q, text, makeWord) {
  q.setAttribute('aria-label', text);
  const frag = document.createDocumentFragment();
  const words = text.split(' ');
  words.forEach((word, j) => {
    frag.append(makeWord(word, j));
    if (j < words.length - 1) frag.append(' ');
  });
  q.textContent = '';
  q.append(frag);
}

/** Prepare each exhibit's objection: split its text, add its rebuttal mark, and set its timing. */
export function prepareObjections() {
  for (const ex of $$('.ex')) {
    const style = ex.dataset.style || 'stage';
    const mark = ex.dataset.mark || 'strike';
    const [kind, stampText] = mark.split(':');
    const q = $('.quote', ex);
    const wrap = $('.quote-wrap', ex);
    const text = q.textContent;
    let t = MARK_AT[style] ?? 2.45;

    if (style === 'scramble') {
      splitInto(q, text, (word) => {
        const w = el('span', 'wd');
        for (const ch of word) {
          const c = Object.assign(document.createElement('span'), { className: 'sc', textContent: ch });
          c.dataset.c = ch;
          w.append(c);
        }
        return w;
      });
    } else if (style === 'shout') {
      let kc = 0;
      splitInto(q, text, (word, kw) => {
        const w = el('span', 'wd');
        w.style.setProperty('--k', kw);
        for (const ch of word) {
          const c = Object.assign(document.createElement('span'), { className: 'c', textContent: ch });
          let r = Math.sin(++kc * 12.9898) * 43758.5453;
          r -= Math.floor(r); // deterministic scatter
          c.style.setProperty('--fx', `${((r - 0.5) * 160).toFixed(0)}px`);
          c.style.setProperty('--fr', `${((r - 0.5) * 220).toFixed(0)}deg`);
          c.style.setProperty('--fdl', `${(r * 0.45).toFixed(2)}s`);
          c.style.setProperty('--fd', `${(0.9 + r * 0.5).toFixed(2)}s`);
          w.append(c);
        }
        return w;
      });
      const words = text.split(' ').length;
      t = 0.15 + words * 0.095 + 1.2;
      ex.style.setProperty('--shk', `${(0.15 + words * 0.095 + 0.2).toFixed(2)}s`);
    } else if (style === 'type') {
      let k = 0;
      splitInto(q, text, (word, j) => {
        const w = el('span', 'wd');
        for (const ch of word) {
          const c = Object.assign(document.createElement('span'), { className: 'c', textContent: ch });
          c.style.setProperty('--k', k++);
          w.append(c);
        }
        if (j < text.split(' ').length - 1) k++;
        return w;
      });
      t = 0.3 + k * 0.034 + 0.55;
      q.style.setProperty('--blinks', Math.ceil((k * 0.034 + 0.9) / 0.5));
    }
    ex.style.setProperty('--t', `${t.toFixed(2)}s`);
    ex.dataset.t = t.toFixed(2);

    const clone = (cls) => {
      const c = el('p', `big quote ${cls}`, text);
      return c;
    };
    if (style === 'echo') wrap.append(clone('echo e1'), clone('echo e2'));
    if (style === 'spot') wrap.append(el('i', 'spot'));
    if (kind === 'tear') wrap.append(clone('half top'), clone('half bot'));
    if (kind === 'crumble') wrap.prepend(clone('ghostq'));
    if (kind === 'poweroff') {
      wrap.append(clone('crtclone'));
      ex.dataset.nodim = '1';
    }
    if (kind === 'dismiss') {
      const b = el('span', 'dbanner');
      b.append(document.createElement('i'), Object.assign(document.createElement('b'), { textContent: 'Dismissed' }));
      wrap.append(b);
    }
    if (kind !== 'strike') $('.strike', ex)?.remove();
    if (kind === 'tear' || kind === 'crumble') ex.dataset.nodim = '1';
    if (kind === 'stamp') wrap.append(el('i', 'ostamp', stampText || 'Overruled'));
    if (kind === 'scribble') {
      const svg = document.createElementNS(NS, 'svg');
      svg.setAttribute('class', 'omark scribble');
      svg.setAttribute('aria-hidden', 'true');
      const path = document.createElementNS(NS, 'path');
      path.setAttribute('pathLength', '1');
      path._pts = [
        [3, 26],
        [97, 18],
        [5, 44],
        [95, 37],
        [7, 62],
        [93, 56],
        [9, 80],
        [91, 74],
      ];
      svg.append(path);
      wrap.append(svg);
      ex.dataset.omark = '1';
    }
    if (kind === 'record') {
      ex.dataset.record = '1';
      wrap.append(el('i', 'rlabel', 'Struck from the record'));
    }
  }
}

/** Draw the scribble in real pixels so the stroke keeps an even width. */
export function sizeMarks(ex) {
  if (!ex.dataset.omark) return;
  const svg = $('.omark', ex);
  if (!svg) return;
  const r = svg.getBoundingClientRect();
  const w = Math.max(1, r.width),
    h = Math.max(1, r.height);
  svg.setAttribute('viewBox', `0 0 ${w.toFixed(1)} ${h.toFixed(1)}`);
  svg.style.setProperty('--sw', `${Math.max(6, Math.min(12, w / 60)).toFixed(1)}px`);
  for (const path of $$('path', svg)) {
    path.setAttribute(
      'd',
      path._pts.map(([x, y], i) => `${i ? 'L' : 'M'}${((x / 100) * w).toFixed(1)} ${((y / 100) * h).toFixed(1)}`).join(' '),
    );
  }
}

/** One redaction bar per rendered line of the quote. */
export function buildRedaction(ex) {
  if (!ex.dataset.record) return;
  const wrap = $('.quote-wrap', ex),
    q = $('.quote', ex);
  for (const bar of $$('.rbar', wrap)) bar.remove();
  const cs = getComputedStyle(q);
  const lineHeight = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 0.86;
  const h = q.offsetHeight,
    n = Math.max(1, Math.round(h / lineHeight));
  for (let i = 0; i < n; i++) {
    const bar = el('i', 'rbar');
    bar.style.top = `${(i * h) / n + (h / n) * 0.18}px`;
    bar.style.height = `${(h / n) * 0.64}px`;
    bar.style.setProperty('--k', i);
    wrap.insertBefore(bar, wrap.firstChild.nextSibling);
  }
  wrap.style.setProperty('--n', n);
}

export const stopScramble = () => clearInterval(scrambleTimer);

/** Letters cycle through random glyphs, then decode into the objection. */
export function scramble(ex) {
  stopScramble();
  if (ex.dataset.style !== 'scramble') return;
  const cells = $$('.quote .sc', ex);
  const settle = () =>
    cells.forEach((c) => {
      c.textContent = c.dataset.c;
      c.classList.remove('hot');
    });
  if (reduceMotion) return settle();
  const GLYPHS = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789#%&?';
  const t0 = performance.now();
  const at = cells.map((_, i) => 350 + (i / cells.length) * 1150 + Math.random() * 180);
  scrambleTimer = setInterval(() => {
    const now = performance.now() - t0;
    let left = 0;
    cells.forEach((c, i) => {
      if (now >= at[i]) {
        if (c.classList.contains('hot')) {
          c.textContent = c.dataset.c;
          c.classList.remove('hot');
        }
      } else {
        left++;
        if (/[A-Za-z0-9]/.test(c.dataset.c)) {
          c.textContent = GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
          c.classList.add('hot');
        }
      }
    });
    if (!left || !ex.classList.contains('active')) {
      stopScramble();
      settle();
    }
  }, 45);
}

/** Exhibit with the "stage" style: the objection is spoken big at centre, then settles into its column. */
export function speakIn(slide) {
  const speak = $('.speak', slide);
  if (!speak?.animate || slide.dataset.style !== 'stage') return;
  speak.getAnimations().forEach((a) => a.cancel());
  if (reduceMotion) return;
  const r = speak.getBoundingClientRect();
  const dx = innerWidth / 2 - (r.left + r.width / 2),
    dy = innerHeight / 2 - (r.top + r.height / 2);
  const sc = Math.max(1, Math.min(1.35, (innerWidth * 0.86) / r.width, (innerHeight * 0.62) / r.height));
  const held = `translate(${dx}px,${dy}px) scale(${sc})`;
  speak.animate(
    [
      { opacity: 0, transform: `translate(${dx}px,${dy + 26}px) scale(${sc * 0.96})`, easing: 'cubic-bezier(.2,.8,.2,1)' },
      { opacity: 1, transform: held, offset: 0.2, easing: 'linear' },
      { opacity: 1, transform: held, offset: 0.6, easing: 'cubic-bezier(.65,0,.35,1)' },
      { opacity: 1, transform: 'translate(0,0) scale(1)' },
    ],
    { duration: 2450, delay: 250, fill: 'backwards' },
  );
}

export const cancelSpeak = (slide) =>
  $('.speak', slide)
    ?.getAnimations?.()
    .forEach((a) => a.cancel());
