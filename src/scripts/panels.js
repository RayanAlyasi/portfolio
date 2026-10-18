import { $, $$, track } from './core.js';
import { hydrate } from './media.js';

const EMAIL = 'rayanalyasi@gmail.com';

function initDrawers() {
  for (const button of $$('[data-open]')) {
    button.addEventListener('click', () => {
      const dialog = document.getElementById(button.dataset.open);
      if (!dialog?.showModal) return;
      hydrate(dialog);
      dialog.showModal();
      dialog.scrollTop = 0;
      dialog._openedAt = Date.now();
      track(`open-${dialog.id.replace(/^d-/, '')}`);
    });
  }
  for (const dialog of $$('dialog.drawer')) {
    $('.d-close', dialog).addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', (e) => {
      if (e.target === dialog) dialog.close();
    });
    dialog.addEventListener('close', () => {
      for (const v of $$('video', dialog)) v.pause();
      if (dialog._openedAt) {
        track('read-time', { panel: dialog.id.replace(/^d-/, ''), seconds: Math.round((Date.now() - dialog._openedAt) / 1000) });
        dialog._openedAt = 0;
      }
    });
  }
}

function initCopyEmail() {
  const button = $('.copy'),
    status = $('.copied');
  if (!button) return;
  const ok = () => {
    track('email-copy');
    status.textContent = 'Copied. Paste it into any email app.';
    button.textContent = 'Copied';
    setTimeout(() => {
      button.textContent = 'Copy email';
    }, 2200);
  };
  const selectInstead = () => {
    const range = document.createRange();
    range.selectNodeContents($('.addr'));
    const sel = getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    status.textContent = 'Select the address above to copy it.';
  };
  button.addEventListener('click', () => {
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(EMAIL).then(ok, selectInstead);
    else selectInstead();
  });
}

/** Tap a panel image to see it full screen, at the best resolution for the screen. */
function initLightbox() {
  const box = document.getElementById('lightbox');
  if (!box?.showModal) return;
  const view = $('img', box);
  document.addEventListener('click', (e) => {
    const img = e.target.closest?.('.d-body img');
    if (!img) return;
    const webp = img.closest('picture')?.querySelector('source[type="image/webp"]');
    view.srcset = webp?.srcset || '';
    view.sizes = '100vw';
    view.src = img.currentSrc || img.src;
    view.alt = img.alt || '';
    box.showModal();
    track('image-zoom', { image: img.dataset.img || '' });
  });
  box.addEventListener('click', () => box.close());
}

export function initPanels() {
  initDrawers();
  initCopyEmail();
  initLightbox();
}
