import { $, $$, NS } from './core.js';

/** Seat position [x, y, rotation] in the 1000x386 table drawing. */
export function seatPos(n) {
  if (n === 1) return [54, 193, -90];
  if (n === 7) return [946, 193, 90];
  if (n <= 6) return [246 + (n - 2) * 127, 56, 0];
  return [754 - (n - 8) * 127, 330, 180];
}
const platePos = (n) => (n === 1 ? [148, 193] : n === 7 ? [852, 193] : [seatPos(n)[0], n <= 6 ? 130 : 256]);
/** Order in which chairs light up on the verdict: you first, then each exhibit's converts. */
const LIT = [8, 6, 1, 3, 10, 7, 9, 4, 11, 12, 5, 2];

function svg(tag, attrs, parent) {
  const node = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  parent?.append(node);
  return node;
}

function buildTable(root, withBallots) {
  svg('rect', { class: 'tb', x: 118, y: 106, width: 764, height: 174, rx: 18 }, root);
  svg('rect', { class: 'tbe', x: 130, y: 118, width: 740, height: 150, rx: 11 }, root);
  for (let n = 1; n <= 12; n++) {
    const [x, y, rot] = seatPos(n);
    const pos = svg('g', { transform: `translate(${x} ${y}) rotate(${rot})` }, root);
    const chair = svg('g', { class: `chair${n === 8 && withBallots ? ' me' : ''}` }, pos);
    chair.style.setProperty('--i', n);
    chair.style.setProperty('--o', LIT.indexOf(n));
    svg('rect', { class: 'cb', x: -33, y: -36, width: 66, height: 15, rx: 7 }, chair);
    svg('rect', { class: 'cs', x: -27, y: -17, width: 54, height: 42, rx: 12 }, chair);

    const [px, py] = platePos(n);
    const plate = svg('g', { class: 'plate' }, svg('g', { transform: `translate(${px} ${py})` }, root));
    plate.style.setProperty('--i', n);
    plate.style.setProperty('--o', LIT.indexOf(n));
    plate.style.transformBox = 'fill-box';
    plate.style.transformOrigin = 'center';
    svg('rect', { x: -21, y: -13, width: 42, height: 26, rx: 3 }, plate);
    svg('text', { 'text-anchor': 'middle', dy: '.36em' }, plate).textContent = n;

    if (!withBallots) continue;
    const ballot = document.createElement('span');
    ballot.className = `ballot${n === 8 ? ' me' : ''}`;
    const face = Object.assign(document.createElement('span'), {
      className: 'bf',
      textContent: n === 8 ? 'Show me the evidence' : 'Just a student',
    });
    ballot.append(face);
    const bx = n === 1 ? 184 : n === 7 ? 816 : x;
    const by = n === 1 || n === 7 ? 193 : n <= 6 ? 174 : 212;
    if (n === 1 || n === 7) face.style.setProperty('--rot', '90deg');
    const order = n === 8 ? 11 : n < 8 ? n - 1 : n - 2;
    ballot.style.setProperty('--x', bx / 10);
    ballot.style.setProperty('--y', by / 3.86);
    ballot.style.setProperty('--i', n);
    ballot.style.setProperty('--di', n);
    ballot.style.setProperty('--rv', `${(2.75 + order * 0.11 + (n === 8 ? 0.3 : 0)).toFixed(2)}s`);
    ballot.style.setProperty('--spin', `${((n * 53) % 40) - 20}deg`);
    root.parentNode.append(ballot);
  }
  if (withBallots) svg('text', { class: 'you', x: 754, y: 392, 'text-anchor': 'middle' }, root).textContent = 'YOU';
}

export function buildTables() {
  buildTable($('.jtable'), true);
  buildTable($('.vtable'), false);
}

/** Ballots are dealt from the centre of the table: measure each one's offset from it. */
export function dealOffsets(slide) {
  const box = $('.tablebox', slide);
  if (!box || !$('.ballot', box)) return;
  const w = box.clientWidth,
    h = box.clientHeight;
  for (const b of $$('.ballot', box)) {
    const x = (parseFloat(b.style.getPropertyValue('--x')) / 100) * w;
    const y = (parseFloat(b.style.getPropertyValue('--y')) / 100) * h;
    b.style.setProperty('--dx', `${(w / 2 - x).toFixed(1)}px`);
    b.style.setProperty('--dy', `${(h / 2 - y).toFixed(1)}px`);
  }
}
