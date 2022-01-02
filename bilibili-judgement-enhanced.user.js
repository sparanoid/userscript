// ==UserScript==
// @name         bilibili 风纪委员增强
// @namespace    https://github.com/sparanoid/userscript
// @supportURL   https://github.com/sparanoid/userscript/issues
// @version      0.0.1
// @description  bilibili 风纪委员自动勾选表单，默认匿名发布
// @author       Sparanoid
// @license      AGPL
// @compatible   chrome 80 or later
// @compatible   edge 80 or later
// @compatible   firefox 74 or later
// @compatible   safari 13.1 or later
// @match        https://www.bilibili.com/judgement/case-detail/*
// @icon         https://experiments.sparanoid.net/favicons/v2/www.bilibili.com.ico
// @grant        none
// @run-at       document-start
// ==/UserScript==

window.addEventListener('load', () => {
  const DEBUG = true;
  const NAMESPACE = 'bilibili-judgement-enhanced';
  const apiBase = 'https://api.bilibili.com';
  const feedbackUrl = 'https://t.bilibili.com/545085157213602473';

  console.log(`${NAMESPACE} loaded`);

  function debug(description = '', msg = '', force = false) {
    if (DEBUG || force) {
      console.log(`${NAMESPACE}: ${description}`, msg)
    }
  }

  document.querySelector('.vote-btns .btn-group button:first-child')?.click();
  document.querySelector('.will-you-watch button:last-child')?.click();
  document.querySelector('.vote-anonymous > div')?.click();

}, false);
