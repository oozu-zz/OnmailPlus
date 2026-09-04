// ==UserScript==
// @name         온메일 통합
// @namespace    https://www.onmail.go.kr/
// @version      2026-09-01
// @description  온메일 공통 키보드 단축키와 화면 보정
// @match        http://www.onmail.go.kr/*
// @match        https://www.onmail.go.kr/*
// @match        http://onmail.go.kr/*
// @match        https://onmail.go.kr/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=go.kr
// @grant        none
// @run-at       document-end
// ==/UserScript==

(() => {
  'use strict';

  const LINE_HEIGHTS = ['21px', '26px', '30px'];
  const MAIL_LIST_SELECTOR = '.mail_list_content > li';
  const LINE_HEIGHT_STYLE_ID = 'onmail-line-height-style';

  function isEditableTarget(target) {
    return target instanceof Element && Boolean(
      target.closest('input, textarea, select, button, [contenteditable="true"]')
    );
  }

  function appendShortcutLabel(element, label) {
    if (!element || element.dataset.onmailShortcutLabel === label) {
      return;
    }

    element.append(`(${label})`);
    element.dataset.onmailShortcutLabel = label;
  }

  function click(selector) {
    const element = document.querySelector(selector);
    if (!element) {
      return false;
    }

    element.click();
    return true;
  }

  /** mousetrap 스타일의 공백 구분 연속 단축키를 등록합니다. */
  function shortcut(sequence, callback) {
    const steps = sequence.toLowerCase().split(' ');
    let stepIndex = 0;
    let resetTimer;

    const reset = () => {
      stepIndex = 0;
      clearTimeout(resetTimer);
    };

    document.addEventListener('keydown', (event) => {
      if (isEditableTarget(event.target)) {
        reset();
        return;
      }

      const step = steps[stepIndex].split('+');
      const key = step.at(-1);
      const matched =
        event.ctrlKey === step.includes('ctrl') &&
        event.altKey === step.includes('alt') &&
        event.shiftKey === step.includes('shift') &&
        event.metaKey === step.includes('meta') &&
        event.key.toLowerCase() === key;

      if (!matched) {
        reset();
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      stepIndex += 1;

      if (stepIndex === steps.length) {
        reset();
        callback(event);
        return;
      }

      clearTimeout(resetTimer);
      resetTimer = setTimeout(reset, 1000);
    }, true);
  }

  function getStoredLineHeight() {
    const value = localStorage.getItem('lineHeight');
    return LINE_HEIGHTS.includes(value) ? value : LINE_HEIGHTS[0];
  }

  function applyLineHeight(value = getStoredLineHeight()) {
    let style = document.getElementById(LINE_HEIGHT_STYLE_ID);
    if (!style) {
      style = document.createElement('style');
      style.id = LINE_HEIGHT_STYLE_ID;
      (document.head || document.documentElement).appendChild(style);
    }

    style.textContent = `${MAIL_LIST_SELECTOR} { line-height: ${value}; }`;
  }

  function cycleLineHeight() {
    const rows = document.querySelectorAll(MAIL_LIST_SELECTOR);
    const current = rows[0] ? getComputedStyle(rows[0]).lineHeight : getStoredLineHeight();
    const currentIndex = LINE_HEIGHTS.indexOf(current);
    const next = LINE_HEIGHTS[(currentIndex + 1) % LINE_HEIGHTS.length];

    localStorage.setItem('lineHeight', next);
    applyLineHeight(next);
  }

  function setupMailListShortcuts() {
    applyLineHeight();
    shortcut('alt+shift+z', cycleLineHeight);

    const replyButton = document.querySelector('#button_set > div.di_if > button:nth-child(1)');
    const forwardButton = document.querySelector('#forwardBtn');
    const removeButton = document.querySelector('#removeButton');
    const trashButton = document.querySelector('#moveToTrashcanButton');
    const resendButton = document.querySelector('#forwardLayer > ul > li:nth-child(3) > a');

    appendShortcutLabel(replyButton, 'R');
    appendShortcutLabel(forwardButton, 'F');
    appendShortcutLabel(removeButton, 'Shift+Del');
    appendShortcutLabel(trashButton, 'Del');
    appendShortcutLabel(resendButton, 'E');
    appendShortcutLabel(
      document.querySelector('#gmLnb > div.lnb_btn_write > a > span'),
      'Tab'
    );

    document.addEventListener('keydown', (event) => {
      if (isEditableTarget(event.target)) {
        return;
      }

      const key = event.key.toLowerCase();
      let handled = false;

      if (
        event.key === 'Tab' &&
        !event.altKey &&
        !event.ctrlKey &&
        !event.metaKey
      ) {
        event.preventDefault();
        handled = event.shiftKey
          ? click('.gm_header .fn_menu_fold')
          : typeof mailWrite === 'function';
        if (!event.shiftKey && handled) {
          mailWrite();
        }
      } else if (!event.altKey && !event.ctrlKey && !event.shiftKey && !event.metaKey) {
        if (key === '/') {
          const search = document.querySelector('#search');
          search?.select();
          search?.focus();
          handled = Boolean(search);
        } else if (key === 'r') {
          if (typeof replyMail === 'function') {
            replyMail('reply');
            handled = true;
          }
        } else if (key === 'f') {
          handled = click('#forwardBtn');
        } else if (key === 'e') {
          if (typeof splitForwardMail === 'function') {
            splitForwardMail('resend');
            handled = true;
          }
        } else if (event.key === 'Delete') {
          handled = click('#moveToTrashcanButton');
        }
      } else if (
        event.key === 'Delete' &&
        event.shiftKey &&
        !event.altKey &&
        !event.ctrlKey &&
        !event.metaKey
      ) {
        handled = click('#removeButton');
      } else if (event.ctrlKey && event.altKey && event.key === 'F12') {
        const watermark = document.querySelector('#print-header-watermark');
        const parts = watermark?.textContent?.split(' | ') || [];
        alert(`IP주소 : ${parts.at(-1) || '확인할 수 없음'}`);
        handled = true;
      }

      if (handled) {
        event.preventDefault();
      }
    });
  }

  function setupSidebarShortcuts() {
    const mailMenus = {
      '전체메일함': '.mail_all .icon_ml',
      '받은메일함': '.mail_receive .icon_ml',
      '보낸메일함': '.mail_send .icon_ml',
      '임시메일함': '.mail_temporary .icon_ml',
      '예약메일함': '.mail_reservation .icon_ml',
      '수신거부함': '.mail_rejection .icon_ml',
      '휴지통': '.mail_trash .icon_ml'
    };

    Object.entries(mailMenus).forEach(([title, selector]) => {
      document.querySelector(selector)?.setAttribute('title', title);
    });

    const mailboxLinks = Array.from(document.querySelectorAll('#default_mboxlayer a'));
    const mailboxShortcuts = [
      { index: 4, mailbox: '1', label: 'Alt+Q1' },
      { index: 5, mailbox: '2', label: 'Alt+Q2' },
      { index: 7, mailbox: '3', label: 'Alt+Q3' }
    ];

    mailboxShortcuts.forEach(({ index, mailbox, label }) => {
      const link = mailboxLinks[index];
      link?.querySelector('.txt_mnml')?.setAttribute('title', `단축키 : ${label}`);
      if (!link) {
        return;
      }

      shortcut(`alt+q alt+${mailbox}`, () => {
        if (new URLSearchParams(location.search).get('mboxIdx') !== mailbox) {
          link.click();
        }
      });
    });

    const historyButton = document.querySelector('#historyBtn');
    historyButton?.setAttribute('title', '단축키 : Alt+QQ');
    if (historyButton) {
      shortcut('alt+q alt+q', () => historyButton.click());
    }
  }

  if (window.self === window.top) {
    if (location.pathname === '/maillist.ds') {
      setupMailListShortcuts();
    }

    setupSidebarShortcuts();
  }
})();
