// ==UserScript==
// @name         온메일 스마트에디터 커서 시작 위치
// @namespace    https://www.onmail.go.kr/
// @version      2026-09-03
// @description  SmartEditor 입력 iframe의 커서를 본문 시작 위치로 이동합니다.
// @match        http://onmail.go.kr/js/lib/smartEditor/smart_editor2_inputarea.html*
// @match        https://onmail.go.kr/js/lib/smartEditor/smart_editor2_inputarea.html*
// @match        http://www.onmail.go.kr/js/lib/smartEditor/smart_editor2_inputarea.html*
// @match        https://www.onmail.go.kr/js/lib/smartEditor/smart_editor2_inputarea.html*
// @grant        none
// @run-at       document-end
// ==/UserScript==

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
