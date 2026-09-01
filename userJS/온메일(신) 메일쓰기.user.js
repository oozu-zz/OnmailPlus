// ==UserScript==
// @name         온메일 메일쓰기
// @namespace    https://www.onmail.go.kr/
// @version      2026-09-01
// @description  메일쓰기 화면의 포커스와 저장/발송 단축키 보정
// @match        https://www.onmail.go.kr/mailwrite*
// @grant        none
// @run-at       document-end
// ==/UserScript==

(() => {
  'use strict';

  const recipientInput = document.querySelector('#toTemp');
  const subjectInput = document.querySelector('#subject');
  const editorFrame = document.querySelector('#huskey_editor_jinto_set_id');
  const sendButton = document.querySelector('#btnSend_head');
  const draftButton = document.querySelector('#btnDraft_head');

  [recipientInput, subjectInput, editorFrame].forEach((element) => {
    if (element) {
      element.tabIndex = 1;
    }
  });

  function appendShortcutLabel(element, label) {
    if (!element || element.dataset.onmailShortcutLabel === label) {
      return;
    }

    element.append(`(${label})`);
    element.dataset.onmailShortcutLabel = label;
  }

  appendShortcutLabel(sendButton, 'Alt+Enter');
  appendShortcutLabel(draftButton, 'Ctrl+S');

  if (sendButton) {
    Object.assign(sendButton.style, {
      color: 'white',
      background: 'navy',
      fontWeight: '800'
    });
  }

  // 받는사람 자동완성으로 포커스가 이동하는 사이트 동작을 고려해 몇 차례 재시도합니다.
  [100, 300, 700, 1200].forEach((delay) => {
    setTimeout(() => recipientInput?.focus(), delay);
  });

  function setupEditorShortcuts() {
    const editorDocument = editorFrame?.contentDocument;
    const innerEditor = editorDocument?.querySelector('#se2_iframe');
    const innerDocument = innerEditor?.contentDocument;

    if (!innerDocument) {
      return false;
    }

    innerDocument.addEventListener('keydown', (event) => {
      if (event.altKey && !event.ctrlKey && event.key === 'Enter') {
        event.preventDefault();
        sendButton?.click();
      } else if (event.ctrlKey && !event.altKey && event.key.toLowerCase() === 's') {
        event.preventDefault();
        draftButton?.click();
      }
    });

    return true;
  }

  if (!setupEditorShortcuts()) {
    const retryTimer = setInterval(() => {
      if (setupEditorShortcuts()) {
        clearInterval(retryTimer);
      }
    }, 250);

    setTimeout(() => clearInterval(retryTimer), 10000);
  }
})();
