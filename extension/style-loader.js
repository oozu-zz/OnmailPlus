(() => {
  'use strict';

  const STYLE_ID = 'onmailplus-style';
  if (document.getElementById(STYLE_ID)) {
    return;
  }

  fetch(chrome.runtime.getURL('style.css'))
    .then((response) => {
      if (!response.ok) {
        throw new Error(`CSS load failed: ${response.status}`);
      }
      return response.text();
    })
    .then((css) => {
      if (document.getElementById(STYLE_ID)) {
        return;
      }

      const style = document.createElement('style');
      style.id = STYLE_ID;
      style.textContent = css;
      (document.head || document.documentElement).appendChild(style);
    })
    .catch((error) => {
      console.warn('[온메일플러스] CSS를 불러오지 못했습니다.', error);
    });
})();
