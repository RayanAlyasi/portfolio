import { $, state } from './core.js';

// Our Umami runs a patched heatmap recorder (deploy/umami) that hands each heatmap event to
// window.umamiHeatmapEvent before recording it. Stock Umami files a click under the page's address and
// draws it over a copy of that page, as tall as the page measured. The deck is one page at "/" that never
// scrolls, and its panels scroll inside themselves, so each click is filed under its slide (/exhibit-b) or
// open panel (/panel/b) instead, both real pages that open on it, with that page's size and position.

let clickTarget = null; // set before the recorder sees a click: window's capture phase runs before document's

const slideAddress = () => (state.cur === 0 ? '/' : `/${state.slides[state.cur].id}`);

const placeOnSlide = (event) => ({ ...event, url: location.origin + slideAddress(), pageW: innerWidth, pageH: innerHeight });

/** Panels scroll inside themselves: place clicks on the panel's full length, which is how Umami shows it. */
function placeInPanel(event, panel) {
  // The header stays pinned at the top while the panel scrolls, so its clicks are not shifted.
  const scrolled = clickTarget?.closest?.('.d-head') ? 0 : panel.scrollTop;
  return {
    ...event,
    url: `${location.origin}/panel/${panel.id.replace(/^d-/, '')}`,
    ...(event.type === 'click' && { pageY: event.pageY + scrolled }),
    pageW: innerWidth,
    pageH: Math.max(innerHeight, panel.scrollHeight),
  };
}

export function initHeatmap() {
  addEventListener('click', (e) => (clickTarget = e.target), true);
  window.umamiHeatmapEvent = (event) => {
    // During the countdown or a slide change, or on a photo shown full screen: no page shows what was clicked.
    if (state.leaderOn || state.busy || $('#lightbox')?.open) return null;
    const panel = $('dialog.drawer[open]');
    return panel ? placeInPanel(event, panel) : placeOnSlide(event);
  };
}
