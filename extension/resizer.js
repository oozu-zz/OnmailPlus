// ==UserScript==
// @name         온메일 분할 리사이저 위치 보정
// @namespace    https://www.onmail.go.kr/
// @version      2026-09-01
// @description  좌측 메뉴 축소 시 메일 분할 드래그바의 위치와 제한값을 보정합니다.
// @match        https://www.onmail.go.kr/maillist.ds*
// @grant        none
// @run-at       document-end
// ==/UserScript==

(() => {
  'use strict';

  const $ = window.jQuery;
  if (typeof $ !== 'function') {
    console.warn('[온메일] jQuery를 찾지 못해 리사이저 보정을 건너뜁니다.');
    return;
  }

  const timer = setInterval(() => {
    if (!$('.x_bar').length || !$('.fn_gm_cont_wrap').length) {
      return;
    }

    clearInterval(timer);
    installResizeHandler();
  }, 500);

  function setTextSelection(enabled) {
    $('html')
      .attr('onselectstart', `return ${enabled};`)
      .attr('ondragstart', `return ${enabled};`);
  }

  function installResizeHandler() {
    $('.x_bar').off('mousedown').on('mousedown', () => {
      setTextSelection(false);

      const containerLeft = $('.fn_gm_cont_wrap').offset()?.left || 0;
      const windowWidth = $(window).width();
      const maxWidth = windowWidth - containerLeft;
      const headerHeight = $('.gm_header').outerHeight() || 0;
      const fixedHeaderHeight = $('.cont_fix_header').outerHeight() || 0;
      const buttonListHeight = $('.head_btns_list').outerHeight() || 0;
      const footerHeight = $('.gm_footer').outerHeight() || 0;
      const maxHeight = $(window).height() - (
        headerHeight + fixedHeaderHeight + buttonListHeight + footerHeight
      );

      $('.list_vertical')
        .off('mousemove.mailResize mouseup.mailResize')
        .on('mousemove.mailResize', (event) => {
          const listHeight = event.pageY - headerHeight - fixedHeaderHeight - buttonListHeight;
          if (listHeight > 200 && event.pageY < maxHeight) {
            $('.gm_div_list').height(listHeight);
            $('.gm_div_view').css('top', listHeight);
          }
        })
        .one('mouseup.mailResize', () => {
          const listHeight = $('.gm_div_list').height();
          $('.list_vertical').off('mousemove.mailResize mouseup.mailResize');
          setTextSelection(true);
          if (typeof window.setCookie === 'function') {
            window.setCookie('splitHeight', listHeight);
          }
        });

      $('.list_horizontal')
        .off('mousemove.mailResize mouseup.mailResize')
        .on('mousemove.mailResize', (event) => {
          const listWidth = event.pageX - containerLeft;
          if (listWidth > 200 && event.pageX < maxWidth) {
            $('.gm_div_list').width(listWidth);
            $('.mail_title_new').width(listWidth);
            $('.gm_div_view').css('left', listWidth);
          }
        })
        .one('mouseup.mailResize', () => {
          const listWidth = $('.gm_div_list').width();
          $('.list_horizontal').off('mousemove.mailResize mouseup.mailResize');
          setTextSelection(true);
          if (typeof window.setCookie === 'function') {
            window.setCookie('splitListWidth', listWidth);
            window.setCookie('splitViewWidth', listWidth);
          }
        });
    });

    console.info('[온메일] 분할 리사이저 위치 보정 적용');
  }
})();
