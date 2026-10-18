// Entry point. Order matters: content is prepared before the deck activates its first slide.
import { state } from './core.js';
import { initYear } from './year.js';
import { initExhibits } from './exhibits.js';
import { initOpening } from './opening.js';
import { prepareObjections } from './objections.js';
import { buildTables } from './table.js';
import { initRain } from './rain.js';
import { initJuryTracker } from './jury.js';
import { activate, initDeck, startDeck } from './deck.js';
import { initPanels } from './panels.js';
import { initInput } from './input.js';
import { initAnalytics } from './analytics.js';
import { runLeader, startOpeningWithoutLeader } from './leader.js';

initYear();
initExhibits();
initOpening();
prepareObjections();
buildTables();
initRain();
initJuryTracker();
initDeck();
initPanels();
initInput();
initAnalytics();

if (startDeck() === 0) runLeader();
else startOpeningWithoutLeader();

// Test hook for automated checks, only with ?qa in the URL.
if (new URLSearchParams(location.search).has('qa')) {
  window.__go = (i) => {
    state.busy = false;
    activate(i, true);
  };
}
