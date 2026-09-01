// ==UserScript==
// @name         온메일 방향키 이동
// @namespace    https://www.onmail.go.kr/
// @version      2026-09-01
// @description  방향키 메일 이동, 페이지 이동, 발신자 검색과 첨부파일 단축키
// @author       You
// @match        https://www.onmail.go.kr/maillist.ds*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=go.kr
// @grant        none
// ==/UserScript==

(() => {
  'use strict';

  // ==============================
  // 온메일 화면 선택자와 키보드 설정
  // ==============================

  const VIEW_FRAME_SELECTOR = '#view_frame';
  const MAIL_LIST_SELECTOR = '.mail_list_content';
  const MAIL_ROW_SELECTOR = `${MAIL_LIST_SELECTOR} > li.checkBoxClass[id^="li_"]`;
  const RECEIVER_LIST_SELECTOR = '.view_info';
  const VIEW_TITLE_SELECTOR = '#view_frame > div.view_info > div > h4';
  const SUBJECT_LINK_SELECTOR = '.mail_title a.subject_link';
  const PERSON_NAME_SELECTOR = `${MAIL_LIST_SELECTOR} .name_wd a.etcPopupMenu`;

  // 검색창의 ID나 name이 온메일 버전별로 다를 수 있어 여러 기준을 사용합니다.
  const SEARCH_INPUT_SELECTORS = [
    '#searchText',
    '#searchWord',
    '#searchKeyword',
    '#search_input',
    'input[name="searchText"]',
    'input[name="searchWord"]',
    'input[name="keyword"]',
    'input[placeholder*="검색"]',
    'input[title*="검색"]',
    'input[aria-label*="검색"]'
  ];

  // 온메일 버전에 따라 페이지 버튼의 클래스명이 다를 수 있어 여러 경우를 지원합니다.
  const PAGE_CONTROL_SELECTORS = [
    '.paging a, .paging button',
    '.paginate a, .paginate button',
    '.pagination a, .pagination button',
    '.page_nav a, .page_nav button',
    '.mail_paging a, .mail_paging button',
    'a[onclick*="goPage"], button[onclick*="goPage"]',
    'a[onclick*="movePage"], button[onclick*="movePage"]',
    'a[aria-label], button[aria-label]'
  ];

  const PREVIOUS_PAGE_PATTERN = /prev|previous|back|left|이전|앞/i;
  const NEXT_PAGE_PATTERN = /next|forward|right|다음|뒤/i;

  const SELECTED_ROW_CLASS = 'onmail-keynav-selected';
  const KEYNAV_STYLE_ID = 'onmail-keynav-style';

  let selectedMailId = null;
  let viewFrameObserver = null;
  let applyTimer = null;

  // ==============================
  // 🟨 화면 보정 및 단축키 설정(!!화면변경시 적용하는코드!!)
  // ==============================

    /** 현재 화면에 온메일 보정 기능을 적용합니다. */
    function applyEnhancements() {
        // * 옵션과 관련된 부분
        // 수신자 목록은 기본적으로 접힌 상태로 표시합니다.
        // 펼쳐짐 주석처리
        //document.querySelector(RECEIVER_LIST_SELECTOR)?.classList.add('expand');
        // 제목은 한 줄로 표시하고, 전체 내용은 마우스 툴팁으로 보여줍니다.
        applyViewTitleTooltip();
        installSelectedRowStyle();
        restoreSelectedMail();
    }

  /** 선택된 메일을 표시할 CSS를 한 번만 추가합니다. */
  function installSelectedRowStyle() {
    if (document.getElementById(KEYNAV_STYLE_ID)) {
      return;
    }

    const style = document.createElement('style');
    style.id = KEYNAV_STYLE_ID;
    style.textContent = `
      .${SELECTED_ROW_CLASS} {
        background-color: beige !important;
      }

      /* 마우스로 클릭한 메일 링크에 남는 검은 포커스 테두리를 제거합니다. */
      ${MAIL_LIST_SELECTOR} :focus:not(:focus-visible) {
        outline: none !important;
        box-shadow: none !important;
      }

      /* MutationObserver가 #view_frame에 포커스를 옮겨도 검은 테두리를 표시하지 않습니다. */
      #view_frame:focus,
      #view_frame:focus-visible {
        outline: none !important;
        box-shadow: none !important;
      }

      /* 긴 메일 제목은 한 줄로 줄이고 뒤쪽을 ...으로 표시합니다. */
      .onmail-view-title-tooltip {
        display: block !important;
        max-width: 100%;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    `;

    (document.head || document.documentElement).appendChild(style);
  }

  /** 메일 제목의 전체 내용을 title 툴팁에 넣고 한 줄로 줄입니다. */
  function applyViewTitleTooltip() {
    const titleElement = document.querySelector(VIEW_TITLE_SELECTOR);
    if (!titleElement) {
      return;
    }

    titleElement.title = titleElement.textContent.trim();
    titleElement.classList.add('onmail-view-title-tooltip');
  }

  // ==============================
  // 메일 목록 선택 및 열기
  // ==============================

  /** 현재 DOM에 표시된 메일 행만 가져옵니다. */
  function getMailRows() {
    return Array.from(document.querySelectorAll(MAIL_ROW_SELECTOR)).filter(isVisible);
  }

  /** 요소가 화면에 표시되는지 확인합니다. */
  function isVisible(element) {
    return element.offsetParent !== null || element.getClientRects().length > 0;
  }

  /** 메일 행의 고유 번호를 가져옵니다. */
  function getMailId(row) {
    return row?.dataset.mailIdx || row?.id?.replace(/^li_/, '') || null;
  }

  /** 선택 표시를 모두 지우고 선택 상태도 초기화합니다. */
  function clearMailSelection() {
    getMailRows().forEach((row) => row.classList.remove(SELECTED_ROW_CLASS));
    selectedMailId = null;
  }

  /** 메일 한 건을 선택하고 필요하면 화면 안으로 스크롤합니다. */
  function selectMailRow(row) {
    // 마우스로 클릭했던 링크에 남아 있는 포커스를 제거합니다.
    const focusedElement = document.activeElement;
    if (focusedElement instanceof HTMLElement && focusedElement.closest(MAIL_LIST_SELECTOR)) {
      focusedElement.blur();
    }

    getMailRows().forEach((mailRow) => {
      mailRow.classList.toggle(SELECTED_ROW_CLASS, mailRow === row);
    });

    selectedMailId = getMailId(row);
    row.scrollIntoView({ block: 'nearest' });
  }

  /** 메일 목록이 다시 그려진 뒤 기존 선택을 복원합니다. */
  function restoreSelectedMail() {
    if (!selectedMailId) {
      return;
    }

    const selectedRow = getMailRows().find((row) => getMailId(row) === selectedMailId);
    if (selectedRow) {
      selectedRow.classList.add(SELECTED_ROW_CLASS);
    } else {
      selectedMailId = null;
    }
  }

  /** 방향에 맞는 다음 메일 행을 찾습니다. 목록 끝에서는 반대쪽으로 순환합니다. */
  function getAdjacentMailRow(direction) {
    const rows = getMailRows();
    if (!rows.length) {
      return null;
    }

    let currentIndex = rows.findIndex((row) => getMailId(row) === selectedMailId);

    // 처음 누른 키가 아래쪽이면 첫 메일, 위쪽이면 마지막 메일을 선택합니다.
    if (currentIndex === -1) {
      currentIndex = direction > 0 ? -1 : rows.length;
    }

    // 목록 끝에서 더 이동하면 반대쪽 끝으로 순환합니다.
    const nextIndex = (currentIndex + direction + rows.length) % rows.length;
    return rows[nextIndex];
  }

  /** 위/아래 방향키로 메일 목록의 선택 위치를 이동합니다. */
  function moveMailSelection(direction) {
    const nextRow = getAdjacentMailRow(direction);
    if (!nextRow) {
      return false;
    }

    selectMailRow(nextRow);
    return true;
  }

  /** Enter 키로 현재 선택된 메일을 엽니다. */
  function openSelectedMail() {
    const selectedRow = getMailRows().find((row) => getMailId(row) === selectedMailId);
    const subjectLink = selectedRow?.querySelector(SUBJECT_LINK_SELECTOR);

    if (!subjectLink) {
      return false;
    }

    subjectLink.click();
    return true;
  }

  // ==============================
  // 보낸사람 이름으로 검색
  // ==============================

  /** 화면에 보이는 온메일 검색 입력창을 찾습니다. */
  function findMailSearchInput() {
    const searchInputs = new Set();

    SEARCH_INPUT_SELECTORS.forEach((selector) => {
      document.querySelectorAll(selector).forEach((input) => {
        if (isVisible(input)) {
          searchInputs.add(input);
        }
      });
    });

    // 명시적인 검색 선택자를 못 찾으면 검색 관련 속성이 있는 입력창을 찾습니다.
    if (!searchInputs.size) {
      document.querySelectorAll('input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"])')
        .forEach((input) => {
          if (isVisible(input) && !input.closest(MAIL_LIST_SELECTOR)) {
            const hint = [
              input.id,
              input.name,
              input.placeholder,
              input.title,
              input.getAttribute('aria-label'),
              input.className
            ]
              .filter(Boolean)
              .join(' ');

            if (/검색|search|keyword|query/i.test(hint)) {
              searchInputs.add(input);
            }
          }
        });
    }

    return searchInputs.values().next().value || null;
  }

  /** 입력창 주변에서 검색 버튼을 찾습니다. */
  function findSearchButton(searchInput) {
    const searchArea = searchInput.closest('form, [class*="search"], [id*="search"]');
    if (!searchArea) {
      return null;
    }

    return Array.from(
      searchArea.querySelectorAll('button, input[type="submit"], a')
    ).find((button) => {
      const label = [
        button.textContent,
        button.value,
        button.title,
        button.getAttribute('aria-label'),
        button.className,
        button.id
      ]
        .filter(Boolean)
        .join(' ');

      return isVisible(button) && /검색|search/i.test(label);
    }) || null;
  }

  /** 검색 입력창에 이름을 넣고 Enter와 같은 검색 동작을 실행합니다. */
  function searchByPersonName(personName) {
    const searchInput = findMailSearchInput();
    if (!searchInput) {
      return false;
    }

    searchInput.focus({ preventScroll: true });
    searchInput.value = personName;
    searchInput.dispatchEvent(new Event('input', { bubbles: true }));
    searchInput.dispatchEvent(new Event('change', { bubbles: true }));

    // 온메일이 keydown으로 검색을 처리하는 경우를 먼저 실행합니다.
    const enterEvent = new KeyboardEvent('keydown', {
      key: 'Enter',
      code: 'Enter',
      keyCode: 13,
      which: 13,
      bubbles: true,
      cancelable: true
    });
    const wasHandled = !searchInput.dispatchEvent(enterEvent) || enterEvent.defaultPrevented;

    // 일반 form 검색창이면 Enter 이벤트가 처리되지 않은 경우 직접 제출합니다.
    if (!wasHandled && searchInput.form) {
      if (typeof searchInput.form.requestSubmit === 'function') {
        searchInput.form.requestSubmit();
      } else {
        searchInput.form.submit();
      }
    } else if (!wasHandled) {
      findSearchButton(searchInput)?.click();
    }

    return true;
  }

  /** 메일 목록의 보낸사람 이름을 클릭했을 때 이름 검색을 실행합니다. */
  function handlePersonNameClick(event) {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    const personLink = target.closest(PERSON_NAME_SELECTOR);
    if (!personLink) {
      return;
    }

    const nameElement = personLink.querySelector('[data-name]');
    const personName = (nameElement?.getAttribute('data-name') || personLink.textContent || '').trim();
    if (!personName || !searchByPersonName(personName)) {
      return;
    }

    // 검색창을 찾은 경우에는 기존 이름 팝업 동작 대신 검색을 사용합니다.
    event.preventDefault();
    event.stopPropagation();
  }

  /** n/p 키로 다음 또는 이전 메일을 선택하고 바로 엽니다. */
  function moveAndOpenAdjacentMail(direction) {
    const nextRow = getAdjacentMailRow(direction);
    if (!nextRow) {
      return false;
    }

    // 방향키로 이동한 것과 같은 방식으로 선택 상태를 먼저 갱신합니다.
    selectMailRow(nextRow);
    return openSelectedMail();
  }

  // ==============================
  // 좌우 방향키 페이지 이동
  // ==============================

  /** 화면에 보이는 페이지 이동 버튼을 중복 없이 가져옵니다. */
  function getPageControls() {
    const controls = new Set();

    PAGE_CONTROL_SELECTORS.forEach((selector) => {
      document.querySelectorAll(selector).forEach((element) => {
        if (isVisible(element)) {
          controls.add(element);
        }
      });
    });

    return Array.from(controls);
  }

  /** 버튼의 글자, title, class 등을 합쳐 페이지 버튼의 의미를 판단합니다. */
  function getPageControlLabel(control) {
    return [
      control.textContent,
      control.getAttribute('aria-label'),
      control.getAttribute('title'),
      control.className,
      control.id,
      control.getAttribute('onclick'),
      control.getAttribute('href')
    ]
      .filter(Boolean)
      .join(' ')
      .trim();
  }

  /** 비활성화된 페이지 버튼인지 확인합니다. */
  function isDisabledPageControl(control) {
    const className = String(control.className || '');

    return (
      control.hasAttribute('disabled') ||
      control.getAttribute('aria-disabled') === 'true' ||
      /(^|\s)(disabled|off)(\s|$)/i.test(className)
    );
  }

  /**
   * direction이 -1이면 이전 페이지, 1이면 다음 페이지 버튼을 찾습니다.
   * 문구가 없으면 활성화된 숫자 페이지의 앞뒤 번호를 사용합니다.
   */
  function findPageControl(direction) {
    const controls = getPageControls().filter(
      (control) => !isDisabledPageControl(control)
    );
    const directionPattern = direction < 0 ? PREVIOUS_PAGE_PATTERN : NEXT_PAGE_PATTERN;
    const arrowPattern = direction < 0 ? /[‹«←]/ : /[›»→]/;

    const directControl = controls.find((control) => {
      const label = getPageControlLabel(control);
      return directionPattern.test(label) || arrowPattern.test(label);
    });

    if (directControl) {
      return directControl;
    }

    // "이전/다음" 버튼이 없고 숫자 페이지만 있는 경우의 대체 처리입니다.
    const numberedControls = controls.filter((control) => /^\d+$/.test(control.textContent.trim()));
    const currentIndex = numberedControls.findIndex((control) => {
      return (
        control.getAttribute('aria-current') === 'page' ||
        control.matches('.active, .on, .current') ||
        control.parentElement?.matches('.active, .on, .current')
      );
    });

    if (currentIndex === -1) {
      return null;
    }

    return numberedControls[currentIndex + direction] || null;
  }

  /** 페이지 버튼을 클릭합니다. 버튼을 찾지 못하면 기본 동작을 유지합니다. */
  function moveMailPage(direction) {
    const pageControl = findPageControl(direction);
    if (!pageControl) {
      return false;
    }

    clearMailSelection();
    pageControl.click();
    return true;
  }

  // ==============================
  // 키보드 이벤트
  // ==============================

  /** 입력창이나 버튼 안에서는 온메일의 원래 키보드 동작을 유지합니다. */
  function shouldIgnoreKeyboardEvent(event) {
    const target = event.target;
    if (!(target instanceof Element)) {
      return false;
    }

    return Boolean(
      target.closest('input, textarea, select, button, [contenteditable="true"]')
    );
  }

  /** 온메일 키보드 단축키를 처리합니다. */
  function handleKeyboard(event) {
    // 조합키는 브라우저나 온메일의 기존 단축키일 수 있으므로 건드리지 않습니다.
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
      return;
    }

    if (shouldIgnoreKeyboardEvent(event)) {
      return;
    }

    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      const direction = event.key === 'ArrowUp' ? -1 : 1;
      if (moveMailSelection(direction)) {
        event.preventDefault();
        event.stopPropagation();
      }
      return;
    }

    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      const direction = event.key === 'ArrowLeft' ? -1 : 1;
      if (moveMailPage(direction)) {
        event.preventDefault();
        event.stopPropagation();
      }
      return;
    }

    if (event.key === '.' || event.key === ',') {
      const direction = event.key === '.' ? 1 : -1;
      if (moveAndOpenAdjacentMail(direction)) {
        event.preventDefault();
        event.stopPropagation();
      }
      return;
    }

    if (event.key === 'Enter' && selectedMailId && openSelectedMail()) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    // Space: 수신자 목록 접기/펼치기
    if (event.key === ' ') {
      const receiverList = document.querySelector(RECEIVER_LIST_SELECTOR);
      if (receiverList) {
        event.preventDefault();
        receiverList.classList.toggle('expand');
      }
    }
  }

  /** 전체 다운로드와 첨부파일 단축키를 처리합니다. */
  function handleDownloadKeyboard(event) {
    if (
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey ||
      shouldIgnoreKeyboardEvent(event)
    ) {
      return;
    }

    let number;
    if (event.altKey) {
      const match = event.code.match(/^Digit([1-6]|9)$/);
      number = match ? Number(match[1]) : null;
    } else {
      const match = event.code.match(/^Numpad([1-6]|9)$/);
      number = match ? Number(match[1]) : null;
    }

    if (!number) {
      return;
    }

    event.preventDefault();
    if (number === 9) {
      document.querySelector('#downloadAllBtn')?.click();
      return;
    }

    const link = document.querySelectorAll('.down_file a')[number - 1];
    link?.focus();
    link?.click();
  }

  // ==============================
  // 온메일 화면 변화 감시
  // ==============================

  /** 짧은 시간 안에 발생한 여러 DOM 변경을 한 번만 처리합니다. */
  function scheduleApply() {
    clearTimeout(applyTimer);
    applyTimer = setTimeout(applyEnhancements, 100);
  }

  /** 메일 화면이 다시 그려질 때 보정 기능을 재적용합니다. */
  function observeViewFrame(viewFrame) {
    viewFrameObserver?.disconnect();

    viewFrameObserver = new MutationObserver(() => {
      // 메일 화면이 바뀌면 기존 보정 기능을 다시 예약합니다.
      scheduleApply();

      // MutationObserver 처리 마지막에 메일 프레임으로 포커스를 돌립니다.
      document.querySelector('#view_frame')?.focus({ preventScroll: true });
    });
    viewFrameObserver.observe(viewFrame, {
      childList: true,
      characterData: true,
      subtree: true
    });

    applyEnhancements();
  }

  /** 초기 로딩 시 #view_frame이 늦게 만들어지는 경우까지 처리합니다. */
  function startViewFrameObserver() {
    const viewFrame = document.querySelector(VIEW_FRAME_SELECTOR);
    if (viewFrame) {
      observeViewFrame(viewFrame);
      return;
    }

    if (!document.body) {
      return;
    }

    const pageObserver = new MutationObserver(() => {
      const loadedViewFrame = document.querySelector(VIEW_FRAME_SELECTOR);
      if (loadedViewFrame) {
        pageObserver.disconnect();
        observeViewFrame(loadedViewFrame);
      }
    });

    pageObserver.observe(document.body, { childList: true, subtree: true });
  }

  startViewFrameObserver();

  // 온메일 자체 이벤트보다 먼저 키를 받아 방향키와 n/p 탐색을 처리합니다.
  window.addEventListener('keydown', handleKeyboard, true);
  window.addEventListener('keydown', handleDownloadKeyboard, true);
  window.addEventListener('click', handlePersonNameClick, true);
})();
