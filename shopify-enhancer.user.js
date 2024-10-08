// ==UserScript==
// @name         Shopify Enhancer
// @namespace    https://github.com/sparanoid/userscript
// @supportURL   https://github.com/sparanoid/userscript/issues
// @version      2024-10-03
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

  const wrapperObserver = new MutationObserver((mutationsList, observer) => {

    for (const mutation of mutationsList) {

      if (mutation.type === 'childList') {

        [...mutation.addedNodes].map(item => {
          // console.log('mutation wrapper added', item);

          // Main wrapper
          if (item.classList?.contains('Polaris-Page') || item?.id === 'AppFrame') {
            console.log('Main wrapper detected', item);

            const telElement = item?.querySelector('a[href^="tel:"]');
            const telStr = telElement?.textContent?.replaceAll(' ', '').replaceAll('+86', '').replace('tel:', '');

            if (telElement && telStr) {
              const link = document.createElement('a');
              link.setAttribute('href', `https://rouzao.com/orders/list?mobile=${telStr}`);
              link.setAttribute('target', '_blank');
              link.textContent = 'Search in Rouzao';

              telElement.parentElement.appendChild(link);
            }
          }
        })
      }
    }
  });
  wrapperObserver.observe(document.body, { attributes: false, childList: true, subtree: true });

})();
