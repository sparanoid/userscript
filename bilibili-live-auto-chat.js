// ==UserScript==
// @name         bilibili 直播间独轮车 LAPLACE ver.
// @namespace    https://greasyfork.org/users/9967
// @version      1.2.7
// @description  这是 bilibili 直播间简易版独轮车，基于 quiet/thusiant cmd 版本 https://greasyfork.org/scripts/421507 继续维护而来
// @author       sparanoid
// @license      AGPL
// @match        *://live.bilibili.com/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// ==/UserScript==

/** @type {string[]} */
const MsgTemplates = GM_getValue("MsgTemplates", []);
/** @type {number} */
let activeTemplateIndex = GM_getValue("activeTemplateIndex", 0);
/** @type {Object.<string, number|boolean>} */
const scriptInitVal = {
	msgSendInterval: 1,
	maxLength: 20,
	maxLogLines: 1000,
	randomColor: false,
	randomInterval: false,
	randomChar: false,
};
for (const initVal in scriptInitVal) {
	if (GM_getValue(initVal) === undefined)
		GM_setValue(initVal, scriptInitVal[initVal]);
}

/** @type {boolean} */
let sendMsg = false;

/**
 * Splits a string into grapheme clusters (user-perceived characters)
 * @param {string} str - The string to split into graphemes
 * @returns {string[]} An array of grapheme clusters
 */
function getGraphemes(str) {
	const segmenter = new Intl.Segmenter("zh", { granularity: "grapheme" });
	return Array.from(segmenter.segment(str), ({ segment }) => segment);
}

/**
 * Splits text into parts based on maximum grapheme length
 * @param {string} text - The text to split
 * @param {number} maxLength - Maximum number of graphemes per part
 * @returns {string[]} An array of text parts, each within the maxLength
 */
function trimText(text, maxLength) {
	if (!text) return [text];

	const graphemes = getGraphemes(text);
	if (graphemes.length <= maxLength) return [text];

	const parts = [];
	let currentPart = [];
	let currentLength = 0;

	for (const char of graphemes) {
		if (currentLength >= maxLength) {
			parts.push(currentPart.join(""));
			currentPart = [char];
			currentLength = 1;
		} else {
			currentPart.push(char);
			currentLength++;
		}
	}

	if (currentPart.length > 0) {
		parts.push(currentPart.join(""));
	}

	return parts;
}

/**
 * Appends a message to a textarea log with a maximum line limit
 * @param {HTMLTextAreaElement} logElement - The textarea element to append to
 * @param {string} message - The message to append
 * @param {number} maxLines - Maximum number of lines to keep in the log
 * @returns {void}
 */
function appendToLimitedLog(logElement, message, maxLines) {
	const lines = logElement.value.split("\n");
	if (lines.length >= maxLines) {
		// Keep only the last (maxLines - 1) lines and add the new message
		lines.splice(0, lines.length - maxLines + 1);
	}
	lines.push(message);
	logElement.value = lines.join("\n");
	logElement.scrollTop = logElement.scrollHeight;
}

/**
 * Extracts the room number from a Bilibili live room URL
 * @param {string} url - The URL to extract the room number from
 * @returns {string|undefined} The room number, or undefined if not found
 */
function extractRoomNumber(url) {
	const urlObj = new URL(url);
	const pathSegments = urlObj.pathname
		.split("/")
		.filter((segment) => segment !== "");
	const roomNumber = pathSegments.find((segment) =>
		Number.isInteger(Number(segment)),
	);
	return roomNumber;
}

/**
 * Adds a random soft hyphen character at a random position in the text
 * @param {string} text - The text to modify
 * @returns {string} The modified text with a random character inserted
 */
function addRandomCharacter(text) {
	if (!text || text.length === 0) return text;

	const graphemes = getGraphemes(text);
	const randomIndex = Math.floor(Math.random() * (graphemes.length + 1));
	graphemes.splice(randomIndex, 0, "­");
	return graphemes.join("");
}

/**
 * Processes messages by splitting lines, optionally adding random characters, and trimming to max length
 * @param {string} text - The text containing messages (one per line)
 * @param {number} maxLength - Maximum grapheme length per message
 * @param {boolean} [addRandomChar=false] - Whether to add random characters to each line
 * @returns {string[]} An array of processed message strings
 */
function processMessages(text, maxLength, addRandomChar = false) {
	return text
		.split("\n")
		.flatMap((line) => {
			// Add random character if enabled
			if (addRandomChar && line && line.trim()) {
				line = addRandomCharacter(line);
			}
			// Then trim based on maxLength
			return trimText(line, maxLength);
		})
		.filter((line) => line?.trim());
}

(() => {
	const check = setInterval(() => {
		/** @type {HTMLDivElement} */
		const toggleBtn = document.createElement("div");
		toggleBtn.id = "toggleBtn";
		toggleBtn.textContent = "独轮车面版";
		toggleBtn.style.cssText = `
      position: fixed;
      right: 14px;
      bottom: 14px;
      z-index: 2147483647;
      cursor: pointer;
      background: #777;
      color: white;
      padding: 6px 8px;
      border-radius: 4px;
      user-select: none;
    `;
		document.body.appendChild(toggleBtn);

		/** @type {HTMLDivElement} */
		const list = document.createElement("div");
		list.style.cssText = `
      position: fixed;
      right: 14px;
      bottom: calc(14px + 30px);
      z-index: 2147483647;
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
        <input id="msgSendInterval" style="width: 30px;" autocomplete="off" type="number" min="0" value="${GM_getValue("msgSendInterval")}" />
        <span>秒，</span>
        <span>超过</span>
        <input id="maxLength" style="width: 30px;" autocomplete="off" type="number" min="1" value="${GM_getValue("maxLength")}" />
        <span>字自动分段，</span>
        <span style="display: inline-flex; align-items: center; gap: .25em;">
          <input id="randomColor" type="checkbox" ${GM_getValue("randomColor") ? "checked" : ""} />
          <label for="randomColor">随机颜色</label>
        </span>
        <span style="display: inline-flex; align-items: center; gap: .25em;">
          <input id="randomInterval" type="checkbox" ${GM_getValue("randomInterval") ? "checked" : ""} />
          <label for="randomInterval">间隔增加随机性</label>
        </span>
        <span style="display: inline-flex; align-items: center; gap: .25em;">
          <input id="randomChar" type="checkbox" ${GM_getValue("randomChar") ? "checked" : ""} />
          <label for="randomChar">随机字符</label>
        </span>
      </div>
      <details style="margin-top: .5em;">
        <summary style="cursor: pointer; user-select: none; font-weight: bold; padding: .25em 0;">日志</summary>
        <textarea id="msgLogs" style="height: 80px; width: 100%; resize: none; margin-top: .5em;" placeholder="此处将输出日志（最多保留 ${GM_getValue("maxLogLines")} 条）" readonly></textarea>
      </details>
      </div>`;

		document.body.appendChild(list);

		/** @type {HTMLButtonElement} */
		const sendBtn = document.getElementById("sendBtn");
		/** @type {HTMLTextAreaElement} */
		const msgLogs = document.getElementById("msgLogs");
		/** @type {number} */
		const maxLogLines = GM_getValue("maxLogLines");

		sendBtn.addEventListener("click", () => {
			if (!sendMsg) {
				const currentTemplate = MsgTemplates[activeTemplateIndex] || "";
				if (!currentTemplate.trim()) {
					appendToLimitedLog(
						msgLogs,
						"⚠️ 当前模板为空，请先输入内容",
						maxLogLines,
					);
					return;
				}

				updateMessages();
				sendMsg = true;
				sendBtn.textContent = "关闭独轮车";
				toggleBtn.style.background = "rgb(0 186 143)";
			} else {
				sendMsg = false;
				sendBtn.textContent = "开启独轮车";
				toggleBtn.style.background = "rgb(166 166 166)";
			}
		});

		toggleBtn.addEventListener("click", () => {
			list.style.display = list.style.display === "none" ? "block" : "none";
		});

		/** @type {HTMLTextAreaElement} */
		const msgInput = document.getElementById("msgList");
		/** @type {HTMLSpanElement} */
		const msgCount = document.getElementById("msgCount");
		/** @type {HTMLInputElement} */
		const msgIntervalInput = document.getElementById("msgSendInterval");
		/** @type {HTMLInputElement} */
		const maxLengthInput = document.getElementById("maxLength");
		/** @type {HTMLInputElement} */
		const randomColorInput = document.getElementById("randomColor");
		/** @type {HTMLInputElement} */
		const randomIntervalInput = document.getElementById("randomInterval");
		/** @type {HTMLInputElement} */
		const randomCharInput = document.getElementById("randomChar");
		/** @type {HTMLSelectElement} */
		const templateSelect = document.getElementById("templateSelect");
		/** @type {HTMLButtonElement} */
		const addTemplateBtn = document.getElementById("addTemplateBtn");
		/** @type {HTMLButtonElement} */
		const removeTemplateBtn = document.getElementById("removeTemplateBtn");

		/**
		 * Updates the current template with input content and refreshes message count
		 * @returns {void}
		 */
		function updateMessages() {
			const maxLength = parseInt(maxLengthInput.value, 10) || 20;
			MsgTemplates[activeTemplateIndex] = msgInput.value;
			GM_setValue("MsgTemplates", MsgTemplates);
			const Msg = processMessages(msgInput.value, maxLength);
			msgCount.textContent = `${Msg.length || 0} 条，`;
		}

		/**
		 * Updates the template select dropdown with current templates
		 * @returns {void}
		 */
		function updateTemplateSelect() {
			templateSelect.innerHTML = "";
			MsgTemplates.forEach((_template, index) => {
				const option = document.createElement("option");
				option.value = index;
				option.textContent = `模板 ${index + 1}`;
				templateSelect.appendChild(option);
			});
			templateSelect.value = activeTemplateIndex;
			msgInput.value = MsgTemplates[activeTemplateIndex] || "";
			updateMessages();
		}

		templateSelect.addEventListener("change", () => {
			activeTemplateIndex = parseInt(templateSelect.value, 10);
			GM_setValue("activeTemplateIndex", activeTemplateIndex);
			msgInput.value = MsgTemplates[activeTemplateIndex] || "";
			updateMessages();
		});

		addTemplateBtn.addEventListener("click", () => {
			MsgTemplates.push("");
			activeTemplateIndex = MsgTemplates.length - 1;
			GM_setValue("MsgTemplates", MsgTemplates);
			GM_setValue("activeTemplateIndex", activeTemplateIndex);
			updateTemplateSelect();
		});

		removeTemplateBtn.addEventListener("click", () => {
			if (MsgTemplates.length > 1) {
				MsgTemplates.splice(activeTemplateIndex, 1);
				activeTemplateIndex = Math.max(0, activeTemplateIndex - 1);
				GM_setValue("MsgTemplates", MsgTemplates);
				GM_setValue("activeTemplateIndex", activeTemplateIndex);
				updateTemplateSelect();
			}
		});

		msgInput.addEventListener("input", () => {
			updateMessages();
		});

		msgIntervalInput.addEventListener("input", () => {
			if (!(parseInt(msgIntervalInput.value, 10) >= 0)) msgIntervalInput.value = 0;
			GM_setValue("msgSendInterval", msgIntervalInput.value);
		});

		randomColorInput.addEventListener("input", () => {
			GM_setValue("randomColor", randomColorInput.checked);
		});

		randomIntervalInput.addEventListener("input", () => {
			GM_setValue("randomInterval", randomIntervalInput.checked);
		});

		randomCharInput.addEventListener("input", () => {
			GM_setValue("randomChar", randomCharInput.checked);
		});

		maxLengthInput.addEventListener("input", () => {
			const value = parseInt(maxLengthInput.value, 10);
			if (value < 1) maxLengthInput.value = 1;
			GM_setValue("maxLength", maxLengthInput.value);
			updateMessages();
		});

		updateTemplateSelect();

		loop();
		clearInterval(check);
	}, 100);
})();

/**
 * Main loop function that handles sending messages to Bilibili live chat
 * Continuously checks if sendMsg is true and sends queued messages with configured intervals
 * @returns {Promise<void>}
 */
async function loop() {
	let count = 0;
	/** @type {HTMLTextAreaElement} */
	const msgLogs = document.getElementById("msgLogs");
	/** @type {number} */
	const maxLogLines = GM_getValue("maxLogLines");
	const shortUid = extractRoomNumber(window.location.href);

	const room = await fetch(
		`https://api.live.bilibili.com/room/v1/Room/room_init?id=${shortUid}`,
		{
			method: "GET",
			credentials: "include",
		},
	);

	/** @type {{data: {room_id: number}}} */
	const roomData = await room.json();
	const roomId = roomData.data.room_id;
	/** @type {string|undefined} */
	const csrfToken = document.cookie
		.split(";")
		.map((c) => c.trim())
		.find((c) => c.startsWith("bili_jct="))
		?.split("bili_jct=")[1];

	while (true) {
		if (sendMsg) {
			const currentTemplate = MsgTemplates[activeTemplateIndex] || "";
			if (!currentTemplate.trim()) {
				appendToLimitedLog(
					msgLogs,
					"⚠️ 当前模板为空，已自动停止运行",
					maxLogLines,
				);
				sendMsg = false;
				const sendBtn = document.getElementById("sendBtn");
				const toggleBtn = document.getElementById("toggleBtn");
				sendBtn.textContent = "开启独轮车";
				toggleBtn.style.background = "rgb(166 166 166)";
				continue;
			}

			/** @type {number} */
			const msgSendInterval = GM_getValue("msgSendInterval");
			/** @type {boolean} */
			const enableRandomColor = GM_getValue("randomColor");
			/** @type {boolean} */
			const enableRandomInterval = GM_getValue("randomInterval");
			/** @type {boolean} */
			const enableRandomChar = GM_getValue("randomChar");
			const Msg = processMessages(
				currentTemplate,
				GM_getValue("maxLength"),
				enableRandomChar,
			);

			for (const message of Msg) {
				if (sendMsg) {
					try {
						if (enableRandomColor) {
							const colorSet = [
								"0xe33fff",
								"0x54eed8",
								"0x58c1de",
								"0x455ff6",
								"0x975ef9",
								"0xc35986",
								"0xff8c21",
								"0x00fffc",
								"0x7eff00",
								"0xffed4f",
								"0xff9800",
							];
							const randomColor =
								colorSet[Math.floor(Math.random() * colorSet.length)];

							const configForm = new FormData();
							configForm.append("room_id", String(roomId));
							configForm.append("color", randomColor);
							configForm.append("csrf_token", csrfToken);
							configForm.append("csrf", csrfToken);
							configForm.append("visit_id", "");

							const _updateConfig = await fetch(
								"https://api.live.bilibili.com/xlive/web-room/v1/dM/AjaxSetConfig",
								{
									method: "POST",
									credentials: "include",
									body: configForm,
								},
							);
						}

						const form = new FormData();
						form.append("bubble", "2");
						form.append("msg", message);
						form.append("color", "16777215");
						form.append("mode", "1");
						form.append("room_type", "0");
						form.append("jumpfrom", "0");
						form.append("reply_mid", "0");
						form.append("reply_attr", "0");
						form.append("replay_dmid", "");
						form.append("statistics", '{"appId":100,"platform":5}');
						form.append("fontsize", "25");
						form.append("rnd", String(Math.floor(Date.now() / 1000)));
						form.append("roomid", String(roomId));
						form.append("csrf", csrfToken);
						form.append("csrf_token", csrfToken);

						const send = await fetch("https://api.live.bilibili.com/msg/send", {
							method: "POST",
							credentials: "include",
							body: form,
						});

						/** @type {{message?: string}} */
						const sendApiRes = await send.json();
						const logMessage = sendApiRes.message
							? `❌「${message}」，原因：${sendApiRes.message}。`
							: `✅「${message}」`;

						appendToLimitedLog(msgLogs, logMessage, maxLogLines);

						const resolvedRandomInterval = enableRandomInterval
							? Math.floor(Math.random() * 500)
							: 0;
						await new Promise((r) =>
							setTimeout(r, msgSendInterval * 1000 - resolvedRandomInterval),
						);
					} catch (error) {
						appendToLimitedLog(
							msgLogs,
							`🔴「${message}」失败，错误：${error.message}`,
							maxLogLines,
						);
					}
				}
			}

			count += 1;
			appendToLimitedLog(msgLogs, `🔵第 ${count} 轮发送完成`, maxLogLines);
		} else {
			count = 0;
			await new Promise((r) => setTimeout(r, 1000));
		}
	}
}
