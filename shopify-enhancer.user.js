// ==UserScript==
// @name         Shopify Enhancer
// @namespace    https://github.com/sparanoid/userscript
// @supportURL   https://github.com/sparanoid/userscript/issues
// @version      2024-07-24
// @description  Enhance Shopify admin dashboard with third-party providers support
// @author       Sparanoid
// @license      AGPL
// @compatible   chrome 80 or later
// @compatible   edge 80 or later
// @compatible   firefox 74 or later
// @compatible   safari 13.1 or later
// @match        https://admin.shopify.com/store/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=shopify.com
// @grant        none
// @downloadURL https://update.greasyfork.org/scripts/501654/Shopify%20Enhancer.user.js
// @updateURL https://update.greasyfork.org/scripts/501654/Shopify%20Enhancer.meta.js
// ==/UserScript==

(function() {
  'use strict';

  const WRAP_CLASSNAME = 'Polaris-Page'
  const ANCHOR_EL = 'div[class^=_addressWrapper]'

  const wrapperObserver = new MutationObserver((mutationsList, observer) => {

    for (const mutation of mutationsList) {

      if (mutation.type === 'childList') {

        [...mutation.addedNodes].map(item => {
          // console.log('mutation wrapper added', item);

          // Main wrapper
          if (item.classList?.contains(WRAP_CLASSNAME)) {
            console.log('Main wrapper detected', item);

            const anchorEl = item.querySelector(ANCHOR_EL);
            const telStr = anchorEl?.querySelector('a[href^="tel:"]')?.href

            if (telStr) {
              const link = document.createElement('a');
              link.setAttribute('href', `https://rouzao.com/orders/list?mobile=${telStr.replace('tel:', '')}`);
              link.setAttribute('target', '_blank');
              link.textContent = 'Search in Rouzao';

              anchorEl.appendChild(link);
            }
          }
        })
      }
    }
  });
  wrapperObserver.observe(document.body, { attributes: false, childList: true, subtree: true });

})();
