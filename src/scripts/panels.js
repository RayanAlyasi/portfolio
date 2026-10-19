import { $, $$, track } from './core.js';
import { hydrate } from './media.js';

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
    // Clicks on the backdrop also target the dialog, but so do clicks on its own empty space;
    // only the ones outside its box close it.
    dialog.addEventListener('click', (e) => {
      if (e.target !== dialog) return;
      const r = dialog.getBoundingClientRect();
      if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) dialog.close();
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
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText($('.addr').textContent).then(ok, selectInstead);
    else selectInstead();
  });
}

/**
 * Tap a panel image to see it full screen. The copy already on the page shows at once; a sharper one
 * for the screen loads alongside and replaces it only once decoded, and only if that photo is still open.
 */
function initLightbox() {
  const box = document.getElementById('lightbox');
  if (!box?.showModal) return;
  let view = $('img', box);
  let pending = null; // sharper copy loading for the open photo
  let early = null; // copy started on mouse press, before the click lands

  // Same format the browser chose for the page (AVIF or WebP), at full-screen widths.
  const sharperCopy = (img) => {
    const copy = new Image();
    const type = /\.avif(\?|$)/.test(img.currentSrc) ? 'image/avif' : 'image/webp';
    const source = img.closest('picture')?.querySelector(`source[type="${type}"]`);
    copy.sizes = '100vw';
    if (source) copy.srcset = source.srcset;
    copy.src = img.currentSrc || img.src;
    copy.alt = img.alt || '';
    return copy;
  };
  // Emptying the sources stops the download; its decode() then rejects.
  const cancel = (copy) => {
    copy?.removeAttribute('srcset');
    if (copy) copy.src = '';
  };

  // Touch presses usually start a scroll, so only a mouse press gets the head start.
  document.addEventListener('pointerdown', (e) => {
    const img = e.pointerType === 'mouse' && e.target.closest?.('.d-body img');
    if (!img || early?.img === img) return;
    cancel(early?.copy);
    early = { img, copy: sharperCopy(img) };
  });
  document.addEventListener('click', (e) => {
    const img = e.target.closest?.('.d-body img');
    if (!img) return;
    cancel(pending);
    const copy = early?.img === img ? early.copy : sharperCopy(img);
    if (early?.img !== img) cancel(early?.copy);
    early = null;
    pending = copy;
    view.removeAttribute('srcset');
    view.removeAttribute('sizes');
    view.src = img.currentSrc || img.src;
    view.alt = img.alt || '';
    box.showModal();
    track('image-zoom', { image: img.dataset.img || '' });
    copy.decode().then(
      () => {
        if (pending !== copy || !box.open) return;
        view.replaceWith(copy);
        view = copy;
        pending = null;
      },
      () => {},
    );
  });
  box.addEventListener('click', () => box.close());
  box.addEventListener('close', () => {
    cancel(pending);
    pending = null;
  });
}

export function initPanels() {
  initDrawers();
  initCopyEmail();
  initLightbox();
}
