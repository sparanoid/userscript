// ==UserScript==
// @name         Shopify Enhancer
// @namespace    https://github.com/sparanoid/userscript
// @supportURL   https://github.com/sparanoid/userscript/issues
// @version      2026-04-10
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

(() => {
  function processPhoneElements(root) {
    // Look for s-internal-text elements containing phone numbers
    const phoneEls = root?.querySelectorAll?.("s-internal-text") || [];

    phoneEls.forEach((el) => {
      const text = (
        el.shadowRoot?.textContent || el.textContent
      )?.trim();

      // Check if text starts with +86
      if (text?.startsWith?.("+86")) {
        // Check if we already added the link to this element
        if (
          !el.nextElementSibling ||
          !el.nextElementSibling.classList.contains("rouzao-link")
        ) {
          // Extract phone number
          const telStr = text
            .replaceAll(" ", "")
            .replaceAll("+86", "");

          // Create link
          const link = document.createElement("a");
          link.setAttribute(
            "href",
            `https://rouzao.com/orders/list?mobile=${telStr}`,
          );
          link.setAttribute("target", "_blank");
          link.setAttribute("class", "rouzao-link");
          link.textContent = "Search in Rouzao";
          link.style.marginLeft = "0.5em";

          // Insert link after the element
          el.parentElement.insertBefore(link, el.nextSibling);
        }
      }
    });
  }

  // Process any elements already on the page
  processPhoneElements(document.body);

  const wrapperObserver = new MutationObserver((mutationsList, _observer) => {
    for (const mutation of mutationsList) {
      if (mutation.type === "childList") {
        [...mutation.addedNodes].map((item) => {
          // console.log('mutation wrapper added', item);

          if (item.nodeType === Node.ELEMENT_NODE) {
            // Check the added node itself
            if (item.tagName?.toLowerCase() === "s-internal-text") {
              processPhoneElements(item.parentElement);
            } else {
              processPhoneElements(item);
            }
          }
        });
      }
    }
  });
  wrapperObserver.observe(document.body, {
    attributes: false,
    childList: true,
    subtree: true,
  });
})();
