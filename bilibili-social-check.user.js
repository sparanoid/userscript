// ==UserScript==
// @name         bilibili 成分查询
// @namespace    https://github.com/sparanoid/userscript
// @supportURL   https://github.com/sparanoid/userscript/issues
// @version      0.1.8
// @description  bilibili 共同关注一键查询（本地查询版）
// @author       Sparanoid
// @license      AGPL
// @compatible   chrome 80 or later
// @compatible   edge 80 or later
// @compatible   firefox 74 or later
// @compatible   safari 13.1 or later
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

  function sanitize(string) {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
      "/": '&#x2F;',
    };
    const reg = /[&<>"'/]/ig;
    return string.replace(reg, match => map[match]);
  }

  function insertAfter(referenceNode, newNode) {
    referenceNode.parentNode.insertBefore(newNode, referenceNode.nextSibling);
  }

  function attachEl(wrapper, output) {
    let content = document.createElement('div');
    content.innerHTML = output;

    wrapper.append(content);
  }

  function processFollowings(wrapper, id, output, iteration, following) {
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
            let status = item.attribute;
            let uid = item.mid;
            let userSince = item.mtime;
            let userSign = item.sign;
            let avatar = item.face;
            let tag = item.tag;
            let verify = item.official_verify;
            let verifyColor = '#000';
            let vip = item.vip;
            let desc = `我的关注时间：${formatDate(userSince)}\n`;

            if (verify?.type === 0) {
              verifyColor = '#ff8d00';
            } else if (verify?.type === 1) {
              verifyColor = '#30a8fd';
            }

            if (verify?.type !== -1) {
              desc += `认证：${verify.desc}\n`
            }

            outputlist += `<div>
<a href="https://space.bilibili.com/${uid}" target="_blank" style="display: flex; align-items: center; margin-bottom: 5px; gap: 5px; color: inherit;">
  <img src="${avatar}" style="width: 24px; height: 24px; border-radius: 2px;" />
  <span style="color: ${verifyColor};" title="${desc}">${name}</span>
  ${item.attribute === 6 ? `<span style="border-radius: 2px; background: #5963d6; color: #fff; width: 12px; height: 12px; font-size: 10px; font-weight: bold; text-align: center; line-height: 1;" title="已互粉">⇄</span>` : ''}
  ${vip?.vipType !== 0 && vip?.vipStatus === 1 ? `<span title="${vip.label.text}\n会员有效期：${formatDate(vip.vipDueDate)}"><img src="${vip.avatar_subscript_url}" style="display: block; width: 12px; height: 12px;" /></span>` : ''}
  <span style="opacity: .6; overflow: hidden; text-overflow: ellipsis; white-space: pre; flex: 1;" title="${sanitize(userSign)}" >${sanitize(userSign.replace(/(?:\r\n|\r|\n)/g, ''))}</span>
</a></div>`;
          });

          debug('try next page', iteration + 1);

          let nextPageRequest = setTimeout(() => {
            processFollowings(wrapper, id, output, iteration + 1, following);
          }, 800 + Math.floor(Math.random() * 600));
        } else {
          debug('loop finished');
          // Attach stats
          attachEl(wrapper.querySelector('div'), `共同关注：${total}，相似比：${percentDisplay(total / following * 100)}%`);
        }

        attachEl(wrapper, outputlist);
      }
    });
  }

  function processCard(wrapper) {
    let iteration = 1;
    let resultContent = '';
    let idEl = wrapper.querySelector('.face') || wrapper.querySelector('.idc-avatar-container');
    let followingEl = wrapper.querySelector('.info .social .like') || wrapper.querySelector('.idc-content .idc-meta .idc-meta-item');
    let id = '';
    let wrapPadding = '0px';

    // following/follower list
    if (wrapper.querySelector('.idc-avatar-container')) {
      wrapPadding = '1rem'
    }

    if (idEl) {
      id = idEl.href.match(/\/\/space\.bilibili\.com\/(\d+)/)[1];
    }

    // ensure user id exists
    debug('passed wrapper', wrapper);
    debug('current uid', id);

    if (id) {
      // Create output wrapper and limit height
      let injectWrap = wrapper;
      let contentWrap = document.createElement('div');

      contentWrap.classList.add(`${NAMESPACE}-wrap`);
      contentWrap.style.overflowY = 'auto';
      contentWrap.style.maxHeight = '300px';
      contentWrap.style.padding = wrapPadding;
      contentWrap.style.paddingTop = '.5rem';
      contentWrap.style.marginTop = '1rem';
      contentWrap.style.borderTop = '1px solid #eee';

      let banner = document.createElement('div');
      banner.style.paddingBottom = '.5rem';
      banner.style.marginBottom = '.5rem';
      banner.style.borderBottom = '1px solid #eee';
      banner.style.whiteSpace = 'pre';
      banner.innerHTML = `成分查询-本地查询版（<a href="${feedbackUrl}" target="_blank">问题反馈</a>）\n查询时间：${formatDate(Date.now())}`;
      contentWrap.append(banner);

      // Process followingSum when id is available
      let totalFollowing = followingEl.innerText.match(/(\d+)/)[1];
      debug('following element', followingEl);

      // Inject prepared wrapper
      injectWrap.append(contentWrap);

      processFollowings(contentWrap, id, resultContent, iteration, totalFollowing);
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
            processCard(item);
          }

          // following/follower list
          if (item.classList?.contains('idc-info')) {
            let parent = item.parentNode;

            if (parent.getAttribute('id') === 'id-card') {
              debug('mutation id wrapper added (found target)', item);
              processCard(parent);
            }
          }

          // card in dongtai mentions
          if (item.classList?.contains('face')) {
            let parent = item.parentNode;

            if (parent.classList?.contains('userinfo-content')) {
              debug('mutation face item added (found target)', item);
              processCard(parent);
            }
          }
        })
      }
    }
  });
  wrapperObserver.observe(document.body, { attributes: false, childList: true, subtree: true });

}, false);

