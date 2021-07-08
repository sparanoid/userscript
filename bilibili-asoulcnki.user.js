// ==UserScript==
// @name         bilibili asoulcnki
// @namespace    https://github.com/sparanoid
// @version      0.1.0
// @description  枝网查重 bilibili 版
// @author       Sparanoid
// @match        https://*.bilibili.com/*
// @icon         https://external-content.duckduckgo.com/ip3/www.bilibili.com.ico
// @grant        none
// @run-at       document-start
// ==/UserScript==

window.addEventListener('load', () => {
  console.log('bilibili asoulcnki loaded');

  const apiBase = 'https://asoulcnki.asia';
  const feedbackUrl = 'https://space.bilibili.com/2763';

  async function fetchResult(url = '', data = {}) {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    return response.json();
  }

  function formatDate(timestamp) {
    let date = timestamp.toString().length === 10 ? new Date(+timestamp * 1000) : new Date(+timestamp);
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
  }

  function rateColor(percent) {
    return `hsl(${100 - percent}, 70%, 50%)`;
  }

  function attachEl(item) {
    let injectWrap = item.querySelector('.con .info');

    // .text - comment content
    // .text-con - reply content
    let content = item.querySelector('.con .text') || item.querySelector('.reply-con .text-con');
    let id = item.dataset.id;

    // simple way to attach element on replies initially loaded with comment
    // which wouldn't trigger mutation inside observeComments
    let replies = item.querySelectorAll('.con .reply-box .reply-item');
    if (replies.length > 0) {
      [...replies].map(reply => {
        attachEl(reply);
      });
    }

    if (injectWrap.querySelector('.asoulcnki')) {
      console.log('asoulcnki already loaded for this comment');
    } else {
      // Insert asoulcnki check button
      let asoulcnkiEl = document.createElement('span');

      asoulcnkiEl.classList.add('asoulcnki', 'btn-hover', 'btn-highlight');
      asoulcnkiEl.innerHTML = '狠狠的查';
      asoulcnkiEl.addEventListener('click', e => {
        // Need regex to stripe `回复 @username  :`
        let contentProcessed = content.innerText.replace(/回复 @.*:/, '');
        console.log('content processed', contentProcessed);

        fetchResult(`${apiBase}/v1/api/check`, {
          text: contentProcessed
        })
        .then(data => {
          console.log(data);

          let resultContent = '';

          if (data.code !== 0) {
            resultContent = `返回结果错误，可能是文本内容过短，或请访问 <a href="${apiBase}/" target="_blank">枝网</a> 查看服务是否正常`;
          } else {
            let result = data.data;
            let startTime = result.start_time;
            let endTime = result.end_time;
            let rate = result.rate * 100;
            let relatedItems = result.related;

            if (relatedItems.length === 0) {
              resultContent = `<a href="${apiBase}" target="_blank">枝网</a>文本复制检测报告（Chrome 脚本版/<a href="${feedbackUrl}" target="_blank">反馈</a>）
查重时间：${formatDate(Date.now())}
数据范围：${formatDate(startTime)} - ${formatDate(endTime)}
总文字复制比：<b style="color: ${rateColor(rate)}">${rate}%</b>
结果：一眼原创，再偷必究（查重结果仅作娱乐参考）`;
            } else {
              let fisrtRelatedItem = relatedItems[0];
              console.log('rpid', fisrtRelatedItem[1].rpid);
              console.log('id', id);
              let selfOriginal = +fisrtRelatedItem[1].rpid === +id ? `（<span style="color: blue;">本文原创，已收录</span>）` : '';

              resultContent = `<a href="${apiBase}" target="_blank">枝网</a>文本复制检测报告（Chrome 脚本版/<a href="${feedbackUrl}" target="_blank">反馈</a>）
查重时间：${formatDate(Date.now())}
数据范围：${formatDate(startTime)} - ${formatDate(endTime)}
总文字复制比：<b style="color: ${rateColor(rate)}">${rate}%</b>
重复次数：${relatedItems.length}${selfOriginal}
相似小作文：<a href="${fisrtRelatedItem[2].trim()}" title="${fisrtRelatedItem[1].content}" target="_blank">${fisrtRelatedItem[2].trim()}</a>
作者：${fisrtRelatedItem[1].m_name}（UID <a href="https://space.bilibili.com/${fisrtRelatedItem[1].mid}" target="_blank">${fisrtRelatedItem[1].mid}</a>）
发表时间：${formatDate(fisrtRelatedItem[1].ctime)}

查重结果仅作娱乐参考，请注意辨别是否为原创`;
            }
          }

          // Insert result
          let resultWrap = document.createElement('div');

          resultWrap.style.padding = '.5rem';
          resultWrap.style.margin = '.5rem 0';
          resultWrap.style.background = 'hsla(0, 0%, 50%, .1)';
          resultWrap.style.borderRadius = '4px';
          resultWrap.style.whiteSpace = 'pre';
          resultWrap.innerHTML = resultContent;

          injectWrap.append(resultWrap);
        });
      }, false);

      injectWrap.append(asoulcnkiEl);

      // Insert comment ID link
      let idLink = document.createElement('a');

      idLink.innerHTML = '#';
      idLink.setAttribute('title', '当前评论 ID: ' + id);
      idLink.setAttribute('href', '#reply' + id);
      idLink.style.marginRight = '.25em';

      injectWrap.prepend(idLink);
    }
  }

  function observeComments(wrapper) {
    // .comment-list - general list for video, zhuanlan, and dongtai
    // .reply-box - replies attached to specific comment
    let commentLists = wrapper ? wrapper.querySelectorAll('.comment-list, .reply-box') : document.querySelectorAll('.comment-list, .reply-box');

    if (commentLists) {

      [...commentLists].map(commentList => {

        // Directly attach elements for pure static server side rendered comments
        // and replies list. Used by zhuanlan posts with reply hash in URL.
        // TODO: need a better solution
        //[...commentList.querySelectorAll('.list-item, .reply-item')].map(item => {
        //  attachEl(item);
        //});

        const observer = new MutationObserver((mutationsList, observer) => {

          for (const mutation of mutationsList) {

            if (mutation.type === 'childList') {

              console.log('observed mutations', [...mutation.addedNodes].length);

              [...mutation.addedNodes].map(item => {
                attachEl(item);

                // Check if the comment has replies
                // I check replies here to make sure I can disable subtree option for
                // MutationObserver to get better performance.
                let replies = item.querySelectorAll('.con .reply-box .reply-item');

                if (replies.length > 0) {
                  observeComments(item)
                  console.log(item.dataset.id + ' has rendered reply(ies)', replies.length);
                }
              })
            }
          }
        });
        observer.observe(commentList, { attributes: false, childList: true, subtree: false });
      });
    }
  }

  // .bb-comment loads directly for zhuanlan post. So load it directly
  observeComments();

  // .bb-comment loads dynamcially for dontai and videos. So observe it first
  const wrapperObserver = new MutationObserver((mutationsList, observer) => {

    for (const mutation of mutationsList) {

      if (mutation.type === 'childList') {

        [...mutation.addedNodes].map(item => {
          console.log('mutation element added', item);

          if (item.classList?.contains('bb-comment')) {
            console.log('mutation element added (found target)', item);

            observeComments(item);

            // Stop observing
            wrapperObserver.disconnect();
          }
        })
      }
    }
  });
  wrapperObserver.observe(document.body, { attributes: false, childList: true, subtree: true });

}, false);
