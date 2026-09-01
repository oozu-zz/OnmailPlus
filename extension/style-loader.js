(() => {
  'use strict';

  const STYLE_ID = 'onmailplus-style';
  if (document.getElementById(STYLE_ID)) {
    return;
  }

  const stylesheet = document.createElement('link');
  stylesheet.id = STYLE_ID;
  stylesheet.rel = 'stylesheet';
  stylesheet.href = chrome.runtime.getURL('style.css');
  stylesheet.addEventListener('error', () => {
    console.warn('[온메일플러스] CSS를 불러오지 못했습니다.');
  });

  (document.head || document.documentElement).appendChild(stylesheet);
})();
