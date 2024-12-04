// ==UserScript==
// @name         bilibili 直播间独轮车 LAPLACE ver.
// @namespace    https://greasyfork.org/users/9967
// @version      1.2.3
// @description  这是 bilibili 直播间简易版独轮车，基于 quiet/thusiant cmd 版本 https://greasyfork.org/scripts/421507 继续维护而来
// @author       sparanoid
// @license      AGPL
// @match        *://live.bilibili.com/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// ==/UserScript==

let MsgTemplates = GM_getValue('MsgTemplates', []);
let activeTemplateIndex = GM_getValue('activeTemplateIndex', 0);
const scriptInitVal = { msgSendInterval: 1, maxLength: 20, maxLogLines: 1000 };
for (let initVal in scriptInitVal) {
  if (GM_getValue(initVal) === undefined) GM_setValue(initVal, scriptInitVal[initVal]);
}

let sendMsg = false;

function getGraphemes(str) {
  const segmenter = new Intl.Segmenter('zh', { granularity: 'grapheme' });
  return Array.from(segmenter.segment(str), ({ segment }) => segment);
}

function trimText(text, maxLength) {
  if (!text) return [text];

  const graphemes = getGraphemes(text);
  if (graphemes.length <= maxLength) return [text];

  const parts = [];
  let currentPart = [];
  let currentLength = 0;

  for (const char of graphemes) {
    if (currentLength >= maxLength) {
      parts.push(currentPart.join(''));
      currentPart = [char];
      currentLength = 1;
    } else {
      currentPart.push(char);
      currentLength++;
    }
  }

  if (currentPart.length > 0) {
    parts.push(currentPart.join(''));
  }

  return parts;
}

function appendToLimitedLog(logElement, message, maxLines) {
  const lines = logElement.value.split('\n');
  if (lines.length >= maxLines) {
    // Keep only the last (maxLines - 1) lines and add the new message
    lines.splice(0, lines.length - maxLines + 1);
  }
  lines.push(message);
  logElement.value = lines.join('\n');
  logElement.scrollTop = logElement.scrollHeight;
}

function extractRoomNumber(url) {
  const urlObj = new URL(url);
  const pathSegments = urlObj.pathname.split('/').filter(segment => segment !== '');
  const roomNumber = pathSegments.find(segment => Number.isInteger(Number(segment)));
  return roomNumber;
}

function processMessages(text, maxLength) {
  return text
    .split('\n')
    .map(line => trimText(line, maxLength))
    .flat()
    .filter(line => line && line.trim());
}

(function () {
  const check = setInterval(() => {
    const toggleBtn = document.createElement('div');
    toggleBtn.id = 'toggleBtn';
    toggleBtn.textContent = '独轮车面版';
    toggleBtn.style.cssText = `
      position: fixed;
      right: 14px;
      bottom: 14px;
      z-index: 1000;
      cursor: pointer;
      background: #777;
      color: white;
      padding: 6px 8px;
      border-radius: 4px;
      user-select: none;
    `;
    document.body.appendChild(toggleBtn);

    const list = document.createElement('div');
    list.style.cssText = `
      position: fixed;
      right: 14px;
      bottom: calc(14px + 30px);
      z-index: 1000;
      background: white;
      display: none;
      padding: 14px;
      box-shadow: 0 0 0 1px rgba(0, 0, 0, .2);
      border-radius: 4px;
      min-width: 50px;
      width: 300px;
    `;

    list.innerHTML = `<div>
      <div style="font-weight: bold;">独轮车 LAPLACE ver.</div>
      <div style="margin: .5em 0; display: flex; align-items: center; flex-wrap: wrap; gap: .25em;">
        <button id="sendBtn">开启独轮车</button>
        <select id="templateSelect"></select>
        <button id="addTemplateBtn">新增</button>
        <button id="removeTemplateBtn">删除当前</button>
      </div>
      <textarea id="msgList" placeholder="在这输入弹幕，每行一句话，超过可发送字数的会自动进行分割" style="height: 100px; width: 100%; resize: none;"></textarea>
      <div style="margin: .5em 0;">
        <span id="msgCount"></span><span>间隔</span>
        <input id="msgSendInterval" style="width: 30px;" autocomplete="off" type="number" min="0" value="${GM_getValue('msgSendInterval')}">
        <span>秒，</span>
        <span>超过</span>
        <input id="maxLength" style="width: 30px;" autocomplete="off" type="number" min="1" value="${GM_getValue('maxLength')}">
        <span>字自动分段</span>
      </div>
      <textarea id="msgLogs" style="height: 80px; width: 100%; resize: none;" placeholder="此处将输出日志（最多保留 ${GM_getValue('maxLogLines')} 条）" readonly></textarea>
      </div>`;

    document.body.appendChild(list);

    const sendBtn = document.getElementById('sendBtn');
    const msgLogs = document.getElementById('msgLogs');
    const maxLogLines = GM_getValue('maxLogLines');

    sendBtn.addEventListener('click', () => {
      if (!sendMsg) {
        const currentTemplate = MsgTemplates[activeTemplateIndex] || '';
        if (!currentTemplate.trim()) {
          appendToLimitedLog(msgLogs, '⚠️ 当前模板为空，请先输入内容', maxLogLines);
          return;
        }

        updateMessages();
        sendMsg = true;
        sendBtn.textContent = '关闭独轮车';
        toggleBtn.style.background = 'rgb(0 186 143)';
      } else {
        sendMsg = false;
        sendBtn.textContent = '开启独轮车';
        toggleBtn.style.background = 'rgb(166 166 166)';
      }
    });

    toggleBtn.addEventListener('click', () => {
      list.style.display = list.style.display === 'none' ? 'block' : 'none';
    });

    const msgInput = document.getElementById('msgList');
    const msgCount = document.getElementById('msgCount');
    const msgIntervalInput = document.getElementById('msgSendInterval');
    const maxLengthInput = document.getElementById('maxLength');
    const templateSelect = document.getElementById('templateSelect');
    const addTemplateBtn = document.getElementById('addTemplateBtn');
    const removeTemplateBtn = document.getElementById('removeTemplateBtn');

    function updateMessages() {
      const maxLength = parseInt(maxLengthInput.value) || 20;
      MsgTemplates[activeTemplateIndex] = msgInput.value;
      GM_setValue('MsgTemplates', MsgTemplates);
      const Msg = processMessages(msgInput.value, maxLength);
      msgCount.textContent = `共 ${Msg.length || 0} 条，`;
    }

    function updateTemplateSelect() {
      templateSelect.innerHTML = '';
      MsgTemplates.forEach((template, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = `模板 ${index + 1}`;
        templateSelect.appendChild(option);
      });
      templateSelect.value = activeTemplateIndex;
      msgInput.value = MsgTemplates[activeTemplateIndex] || '';
      updateMessages();
    }

    templateSelect.addEventListener('change', () => {
      activeTemplateIndex = parseInt(templateSelect.value);
      GM_setValue('activeTemplateIndex', activeTemplateIndex);
      msgInput.value = MsgTemplates[activeTemplateIndex] || '';
      updateMessages();
    });

    addTemplateBtn.addEventListener('click', () => {
      MsgTemplates.push('');
      activeTemplateIndex = MsgTemplates.length - 1;
      GM_setValue('MsgTemplates', MsgTemplates);
      GM_setValue('activeTemplateIndex', activeTemplateIndex);
      updateTemplateSelect();
    });

    removeTemplateBtn.addEventListener('click', () => {
      if (MsgTemplates.length > 1) {
        MsgTemplates.splice(activeTemplateIndex, 1);
        activeTemplateIndex = Math.max(0, activeTemplateIndex - 1);
        GM_setValue('MsgTemplates', MsgTemplates);
        GM_setValue('activeTemplateIndex', activeTemplateIndex);
        updateTemplateSelect();
      }
    });

    msgInput.addEventListener('input', () => {
      updateMessages();
    });

    msgIntervalInput.addEventListener('input', () => {
      if (!(parseInt(msgIntervalInput.value) >= 0)) msgIntervalInput.value = 0;
      GM_setValue('msgSendInterval', msgIntervalInput.value);
    });

    maxLengthInput.addEventListener('input', () => {
      const value = parseInt(maxLengthInput.value);
      if (value < 1) maxLengthInput.value = 1;
      GM_setValue('maxLength', maxLengthInput.value);
      updateMessages();
    });

    updateTemplateSelect();

    loop();
    clearInterval(check);
  }, 100);
})();

async function loop() {
  let count = 0;
  const msgLogs = document.getElementById('msgLogs');
  const maxLogLines = GM_getValue('maxLogLines');
  const shortUid = extractRoomNumber(window.location.href);

  const room = await fetch(`https://api.live.bilibili.com/room/v1/Room/room_init?id=${shortUid}`, {
    method: 'GET',
    credentials: 'include'
  });

  const roomData = await room.json();
  const roomId = roomData.data.room_id;
  const csrfToken = document.cookie
    .split(';')
    .map(c => c.trim())
    .find(c => c.startsWith('bili_jct='))
    ?.split('bili_jct=')[1];

  while (true) {
    if (sendMsg) {
      const currentTemplate = MsgTemplates[activeTemplateIndex] || '';
      if (!currentTemplate.trim()) {
        appendToLimitedLog(msgLogs, '⚠️ 当前模板为空，已自动停止运行', maxLogLines);
        sendMsg = false;
        const sendBtn = document.getElementById('sendBtn');
        const toggleBtn = document.getElementById('toggleBtn');
        sendBtn.textContent = '开启独轮车';
        toggleBtn.style.background = 'rgb(166 166 166)';
        continue;
      }

      const msgSendInterval = GM_getValue('msgSendInterval');
      const Msg = processMessages(currentTemplate, GM_getValue('maxLength'));

      for (const message of Msg) {
        if (sendMsg) {
          try {
            const form = new FormData();
            form.append('bubble', '2');
            form.append('msg', message);
            form.append('color', '16777215');
            form.append('mode', '1');
            form.append('room_type', '0');
            form.append('jumpfrom', '0');
            form.append('reply_mid', '0');
            form.append('reply_attr', '0');
            form.append('replay_dmid', '');
            form.append('statistics', '{"appId":100,"platform":5}');
            form.append('fontsize', '25');
            form.append('rnd', String(Math.floor(Date.now() / 1000)));
            form.append('roomid', String(roomId));
            form.append('csrf', csrfToken);
            form.append('csrf_token', csrfToken);

            const send = await fetch('https://api.live.bilibili.com/msg/send', {
              method: 'POST',
              credentials: 'include',
              body: form
            });

            const sendApiRes = await send.json();
            const logMessage = sendApiRes.message
              ? `❌「${message}」，原因：${sendApiRes.message}。`
              : `✅「${message}」`;

            appendToLimitedLog(msgLogs, logMessage, maxLogLines);
            await new Promise(r => setTimeout(r, msgSendInterval * 1000));
          } catch (error) {
            appendToLimitedLog(msgLogs, `🔴「${message}」失败，错误：${error.message}`, maxLogLines);
          }
        }
      }

      count += 1;
      appendToLimitedLog(msgLogs, `🔵第 ${count} 轮发送完成`, maxLogLines);
    } else {
      count = 0;
      await new Promise(r => setTimeout(r, 1000));
    }
  }
}
