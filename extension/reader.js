// ==UserScript==
// @name         온메일 메일읽기
// @namespace    https://www.onmail.go.kr/
// @version      2026-09-01
// @description  메일읽기 화면의 단축키 표시와 동작을 정리합니다.
// @match        https://www.onmail.go.kr/mailread.ds*
// @grant        none
// @run-at       document-end
// ==/UserScript==

(() => {
  'use strict';

  const buttons = document.querySelectorAll('div.button_set button');
  const shortcuts = [
    { index: 0, key: 'Escape', label: 'Esc' },
    { index: 1, key: 'r', label: 'R' },
    { index: 3, key: 'f', label: 'F' },
    { index: 5, key: 'Delete', label: 'Del' }
  ];

  function appendShortcutLabel(element, label) {
    if (!element || element.dataset.onmailShortcutLabel === label) {
      return;
    }

    element.append(`(${label})`);
    element.dataset.onmailShortcutLabel = label;
  }

  // 사이트가 마지막 버튼의 strong 요소만 굵게 표시하는 문제를 보정합니다.
  buttons[5]?.querySelectorAll('strong').forEach((element) => {
    element.replaceWith(...element.childNodes);
  });

  shortcuts.forEach(({ index, label }) => {
    appendShortcutLabel(buttons[index], label);
  });

  document.addEventListener('keydown', (event) => {
    if (
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey ||
      (event.target instanceof Element && event.target.closest('input, textarea, select, [contenteditable="true"]'))
    ) {
      return;
    }

    const shortcut = shortcuts.find(({ key }) => key.toLowerCase() === event.key.toLowerCase());
    if (!shortcut || !buttons[shortcut.index]) {
      return;
    }

    event.preventDefault();
    buttons[shortcut.index].click();
  });
})();
