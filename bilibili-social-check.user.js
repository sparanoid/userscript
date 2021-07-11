// ==UserScript==
// @name         bilibili 成分查询
// @namespace    https://github.com/sparanoid/userscript
// @supportURL   https://github.com/sparanoid/userscript/issues
// @version      0.1.4
// @description  bilibili 共同关注一键查询（自主查询版）
// @author       Sparanoid
// @match        https://*.bilibili.com/*
// @icon         https://experiments.sparanoid.net/favicons/v2/www.bilibili.com.ico
// @grant        none
// @run-at       document-start
// ==/UserScript==

window.addEventListener('load', () => {
  const DEBUG = true;
  const NAMESPACE = 'bilibili-social-check';
  const apiBase = 'https://api.bilibili.com';
  const feedbackUrl = 'https://t.bilibili.com/545085157213602473';

  console.log(`${NAMESPACE} loaded`);

  async function fetchResult(url = '', data = {}) {
    const response = await fetch(url, {
      credentials: 'include',
    });
    return response.json();
  }

  function debug(description = '', msg = '', force = false) {
    if (DEBUG || force) {
      console.log(`${NAMESPACE}: ${description}`, msg)
    }
  }

  function formatDate(timestamp) {
    let date = timestamp.toString().length === 10 ? new Date(+timestamp * 1000) : new Date(+timestamp);
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
  }

  function rateColor(percent) {
    return `hsl(${100 - percent}, 70%, 45%)`;
  }

  function percentDisplay(num) {
    return num.toFixed(2).replace('.00', '');
  }

  function attachEl(wrapper, output) {
    let content = document.createElement('div');
    content.innerHTML = output;

    wrapper.append(content);
  }

  function processFollowings(wrapper, id, output, iteration) {
    let outputlist = '';

    fetchResult(`${apiBase}/x/relation/same/followings?vmid=${id}&pn=${iteration}`).then(data => {
      debug('data returned', data);

      if (data.code !== 0) {
        outputlist = data.message;
        attachEl(wrapper, outputlist);
      } else {
        let result = data.data;
        let total = result.total;
        let items = result.list;

        if (items.length > 0) {
          items.map(item => {
            let name = item.uname;
            let uid = item.mid;
            let user_sign = item.sign;
            let avatar = item.face;
            let tag = item.tag;
            let verify = item.official_verify;
            let vip = item.vip;
            let linkColor = '#000';

            if (vip?.vipType === 1 || vip?.vipType === 2) {
              linkColor = '#fb7299';
            }

            if (verify?.type === 0) {
              linkColor = '#ff8d00';
            } else if (verify?.type === 1) {
              linkColor = '#30a8fd';
            }

            outputlist += `<div>
<a href="https://space.bilibili.com/${uid}" target="_blank" style="display: flex; align-items: center; margin-bottom: 5px; color: ${linkColor};">
  <img src="${avatar}" style="width: 24px; height: 24px; border-radius: 2px; margin-right: 5px;" />
${name}
</a></div>`;
          });

          debug('try next page', iteration + 1);

          setTimeout(() => {
            processFollowings(wrapper, id, output, iteration + 1);
          }, 200);
        } else {
          debug('loop finished');
        }

        attachEl(wrapper, outputlist);
      }
    });
  }

  function observeCard(wrapper) {
    let iteration = 1;
    let resultContent = '';
    let id = wrapper.querySelector('.face')?.href.match(/\/\/space\.bilibili\.com\/(\d+)/)[1];

    // ensure user id exists
    debug('wrapper', wrapper.querySelector('.face'));
    debug('current uid', id);

    if (id) {
      // Create output wrapper and limit height
      let injectWrap = wrapper;
      let contentWrap = document.createElement('div');

      contentWrap.classList.add(`${NAMESPACE}-wrap`);
      contentWrap.style.overflowY = 'auto';
      contentWrap.style.maxHeight = '300px';
      contentWrap.style.paddingTop = '.5rem';
      contentWrap.style.marginTop = '1rem';
      contentWrap.style.borderTop = '1px solid #eee';

      let banner = document.createElement('div');
      banner.style.paddingBottom = '.5rem';
      banner.style.marginBottom = '.5rem';
      banner.style.borderBottom = '1px solid #eee';
      banner.style.whiteSpace = 'pre';
      banner.innerHTML = `成分查询（<a href="${feedbackUrl}" target="_blank">问题反馈</a>）\n查询时间：${formatDate(Date.now())} <button>刷新查询</button>\n哇哇哇，查大成分了💃💃💃💃happy`;
      contentWrap.append(banner);

      // Inject prepared wrapper
      injectWrap.append(contentWrap);

      processFollowings(contentWrap, id, resultContent, iteration);
    }
  }

  // .user-card loads dynamcially. So observe it first
  const wrapperObserver = new MutationObserver((mutationsList, observer) => {

    for (const mutation of mutationsList) {

      if (mutation.type === 'childList') {

        [...mutation.addedNodes].map(item => {
          debug('mutation wrapper added', item);

          // normal card, global, comments avatar, comment mentions, and etc.
          if (item.classList?.contains('user-card')) {
            debug('mutation wrapper added (found target)', item);
            observeCard(item);
          }

          // card in dongtai mentions
          if (item.classList?.contains('face')) {
            let parent = item.parentNode;

            if (parent.classList?.contains('userinfo-content')) {
              debug('mutation face item added (found target)', item);
              observeCard(parent);
            }
          }
        })
      }
    }
  });
  wrapperObserver.observe(document.body, { attributes: false, childList: true, subtree: true });

}, false);

