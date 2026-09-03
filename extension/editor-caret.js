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

  moveCaretToStart(document.body);
})();
