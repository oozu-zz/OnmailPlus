(() => {
  'use strict';

  if (top === self) {
    return;
  }

  function moveCaretToStart(element) {
    if (!element.textContent.trim()) {
      return;
    }

    element.focus();

    const range = document.createRange();
    range.selectNodeContents(element);
    range.collapse(true);

    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
  }


  const el = document.body;
  [10, 50, 100].forEach((ms) => {
    setTimeout(() => moveCaretToStart(el), ms);
  });
})();
