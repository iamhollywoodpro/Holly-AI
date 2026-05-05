(function () {
  var SHADOW_HOST_ID = "holly-ai-widget";
  var widgetInjected = false;
  var shadowRoot = null;
  var widgetVisible = false;
  var conversationHistory = [];
  var isStreaming = false;

  function injectWidget() {
    if (widgetInjected) return;

    var host = document.createElement("div");
    host.id = SHADOW_HOST_ID;
    document.body.appendChild(host);

    shadowRoot = host.attachShadow({ mode: "open" });

    var style = document.createElement("style");
    style.textContent = getWidgetCSS();
    shadowRoot.appendChild(style);

    var container = document.createElement("div");
    container.id = "holly-container";
    container.innerHTML = getWidgetHTML();
    shadowRoot.appendChild(container);

    widgetInjected = true;
    bindWidgetEvents(container);

    chrome.storage.sync.get(
      {
        serverUrl: "https://holly.nexamusicgroup.com",
        apiKey: "",
      },
      function () {}
    );
  }

  function getWidgetCSS() {
    return [
      ":host { all: initial; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }",
      "* { margin: 0; padding: 0; box-sizing: border-box; }",
      "#holly-container { position: fixed; bottom: 24px; right: 24px; z-index: 2147483647; font-size: 14px; }",
      "#holly-toggle { width: 56px; height: 56px; border-radius: 50%; border: none; cursor: pointer;",
      "  background: linear-gradient(135deg, #00e5ff, #b388ff);",
      "  box-shadow: 0 4px 20px rgba(0, 229, 255, 0.3), 0 0 0 0 rgba(0, 229, 255, 0.2);",
      "  display: flex; align-items: center; justify-content: center;",
      "  transition: transform 0.2s ease, box-shadow 0.2s ease;",
      "  position: relative; z-index: 2;",
      "}",
      "#holly-toggle:hover { transform: scale(1.08); box-shadow: 0 6px 28px rgba(0, 229, 255, 0.4); }",
      "#holly-toggle svg { color: #0a060e; }",
      "#holly-toggle .toggle-badge { position: absolute; top: -4px; right: -4px; width: 18px; height: 18px;",
      "  border-radius: 50%; background: #ff4081; color: white; font-size: 10px; font-weight: 700;",
      "  display: none; align-items: center; justify-content: center; }",
      "#holly-toggle .toggle-badge.visible { display: flex; }",
      "#holly-panel { position: absolute; bottom: 70px; right: 0; width: 380px; height: 500px;",
      "  background: rgba(10, 6, 14, 0.95); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);",
      "  border: 1px solid rgba(0, 229, 255, 0.15); border-radius: 16px;",
      "  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.05);",
      "  display: none; flex-direction: column; overflow: hidden;",
      "  transition: opacity 0.3s ease, transform 0.3s ease;",
      "}",
      "#holly-panel.open { display: flex; animation: holly-slide-up 0.3s ease forwards; }",
      "@keyframes holly-slide-up { from { opacity: 0; transform: translateY(12px) scale(0.97); }",
      "  to { opacity: 1; transform: translateY(0) scale(1); } }",
      ".holly-header { display: flex; align-items: center; justify-content: space-between;",
      "  padding: 14px 16px; background: rgba(18, 14, 26, 0.9); border-bottom: 1px solid rgba(42, 34, 64, 0.6);",
      "  cursor: move; user-select: none; flex-shrink: 0; }",
      ".holly-header-left { display: flex; align-items: center; gap: 10px; }",
      ".holly-logo { font-size: 14px; font-weight: 700; letter-spacing: 2px;",
      "  background: linear-gradient(135deg, #00e5ff, #b388ff); -webkit-background-clip: text;",
      "  -webkit-text-fill-color: transparent; background-clip: text; }",
      ".holly-status { width: 7px; height: 7px; border-radius: 50%; background: #00e676;",
      "  box-shadow: 0 0 6px rgba(0, 230, 118, 0.4); }",
      ".holly-close { background: none; border: none; color: #a89cc0; cursor: pointer;",
      "  padding: 4px; border-radius: 6px; display: flex; transition: 0.2s; }",
      ".holly-close:hover { color: #ff5252; background: rgba(255, 82, 82, 0.1); }",
      ".holly-messages { flex: 1; overflow-y: auto; padding: 14px; display: flex;",
      "  flex-direction: column; gap: 10px; }",
      ".holly-messages::-webkit-scrollbar { width: 3px; }",
      ".holly-messages::-webkit-scrollbar-track { background: transparent; }",
      ".holly-messages::-webkit-scrollbar-thumb { background: #2a2240; border-radius: 2px; }",
      ".holly-welcome { display: flex; flex-direction: column; align-items: center;",
      "  justify-content: center; flex: 1; opacity: 0.6; text-align: center; }",
      ".holly-welcome-icon { font-size: 36px; background: linear-gradient(135deg, #00e5ff, #b388ff);",
      "  -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;",
      "  margin-bottom: 12px; }",
      ".holly-welcome h3 { font-size: 18px; letter-spacing: 3px;",
      "  background: linear-gradient(135deg, #00e5ff, #b388ff); -webkit-background-clip: text;",
      "  -webkit-text-fill-color: transparent; background-clip: text; margin-bottom: 6px; }",
      ".holly-welcome p { font-size: 12px; color: #6b5f80; }",
      ".holly-msg { display: flex; gap: 8px; animation: holly-fade 0.3s ease; max-width: 100%; }",
      "@keyframes holly-fade { from { opacity: 0; transform: translateY(6px); }",
      "  to { opacity: 1; transform: translateY(0); } }",
      ".holly-msg.user { flex-direction: row-reverse; }",
      ".holly-msg-avatar { width: 26px; height: 26px; border-radius: 50%;",
      "  display: flex; align-items: center; justify-content: center;",
      "  font-size: 11px; font-weight: 700; flex-shrink: 0; }",
      ".holly-msg.holly .holly-msg-avatar { background: linear-gradient(135deg, #00e5ff, #b388ff); color: #0a060e; }",
      ".holly-msg.user .holly-msg-avatar { background: #1a1424; color: #a89cc0; }",
      ".holly-msg-bubble { padding: 9px 13px; border-radius: 12px; font-size: 13px;",
      "  line-height: 1.5; word-wrap: break-word; overflow-wrap: break-word;",
      "  max-width: calc(100% - 42px); color: #e8e0f0; }",
      ".holly-msg.holly .holly-msg-bubble { background: rgba(22, 18, 42, 0.8);",
      "  border: 1px solid rgba(42, 34, 64, 0.6); }",
      ".holly-msg.user .holly-msg-bubble { background: rgba(26, 14, 46, 0.8);",
      "  border: 1px solid rgba(179, 136, 255, 0.15); }",
      ".holly-msg-bubble pre { background: rgba(10, 6, 14, 0.8); padding: 8px 10px;",
      "  border-radius: 8px; overflow-x: auto; margin: 6px 0; font-size: 12px;",
      "  border: 1px solid rgba(42, 34, 64, 0.6); }",
      ".holly-msg-bubble code { font-family: 'SF Mono', 'Fira Code', monospace; font-size: 12px; }",
      ".holly-msg-bubble a { color: #00e5ff; text-decoration: none; }",
      ".holly-msg-bubble a:hover { text-decoration: underline; }",
      ".holly-error { color: #ff5252; font-size: 12px; padding: 8px 12px;",
      "  background: rgba(255, 82, 82, 0.1); border-radius: 8px;",
      "  border: 1px solid rgba(255, 82, 82, 0.2); }",
      ".holly-typing { display: flex; align-items: center; gap: 4px; padding: 0 14px 8px; }",
      ".holly-typing.hidden { display: none; }",
      ".holly-typing-dot { width: 5px; height: 5px; background: #00e5ff;",
      "  border-radius: 50%; animation: holly-typing 1.4s infinite ease-in-out both; }",
      ".holly-typing-dot:nth-child(1) { animation-delay: -0.32s; }",
      ".holly-typing-dot:nth-child(2) { animation-delay: -0.16s; }",
      "@keyframes holly-typing { 0%, 80%, 100% { transform: scale(0.4); opacity: 0.4; }",
      "  40% { transform: scale(1); opacity: 1; } }",
      ".holly-input-area { padding: 12px 14px; background: rgba(18, 14, 26, 0.9);",
      "  border-top: 1px solid rgba(42, 34, 64, 0.6); flex-shrink: 0; }",
      ".holly-input-wrap { display: flex; align-items: flex-end; background: rgba(30, 24, 48, 0.9);",
      "  border: 1px solid rgba(42, 34, 64, 0.6); border-radius: 12px; padding: 4px;",
      "  transition: 0.2s; }",
      ".holly-input-wrap:focus-within { border-color: rgba(0, 229, 255, 0.4);",
      "  box-shadow: 0 0 0 2px rgba(0, 229, 255, 0.1); }",
      ".holly-input { flex: 1; background: transparent; border: none; color: #e8e0f0;",
      "  font-size: 13px; line-height: 1.5; padding: 6px 10px; resize: none;",
      "  outline: none; max-height: 80px; font-family: inherit; }",
      ".holly-input::placeholder { color: #6b5f80; }",
      ".holly-send { background: linear-gradient(135deg, #00e5ff, #b388ff); border: none;",
      "  color: #0a060e; cursor: pointer; padding: 7px; border-radius: 8px;",
      "  display: flex; align-items: center; justify-content: center; transition: 0.2s; }",
      ".holly-send:hover { opacity: 0.85; transform: scale(1.05); }",
      ".holly-send:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }",
      ".holly-hint { font-size: 10px; color: #6b5f80; text-align: center; margin-top: 5px; }",
    ].join("\n");
  }

  function getWidgetHTML() {
    return [
      '<button id="holly-toggle" title="HOLLY AI">',
      '  <span class="toggle-badge" id="holly-badge"></span>',
      '  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">',
      '    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
      "  </svg>",
      "</button>",
      '<div id="holly-panel">',
      '  <div class="holly-header" id="holly-drag-handle">',
      '    <div class="holly-header-left">',
      '      <span class="holly-logo">HOLLY</span>',
      '      <span class="holly-status"></span>',
      "    </div>",
      '    <button class="holly-close" id="holly-close-btn">',
      '      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">',
      '        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
      "      </svg>",
      "    </button>",
      "  </div>",
      '  <div class="holly-messages" id="holly-messages">',
      '    <div class="holly-welcome">',
      '      <div class="holly-welcome-icon">&#9670;</div>',
      "      <h3>HOLLY</h3>",
      "      <p>Self-Evolving Intelligence</p>",
      "    </div>",
      "  </div>",
      '  <div class="holly-typing hidden" id="holly-typing">',
      '    <span class="holly-typing-dot"></span>',
      '    <span class="holly-typing-dot"></span>',
      '    <span class="holly-typing-dot"></span>',
      "  </div>",
      '  <div class="holly-input-area">',
      '    <div class="holly-input-wrap">',
      '      <textarea class="holly-input" id="holly-input" placeholder="Ask HOLLY anything..." rows="1"></textarea>',
      '      <button class="holly-send" id="holly-send-btn">',
      '        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">',
      '          <line x1="22" y1="2" x2="11" y2="13"/>',
      '          <polygon points="22 2 15 22 11 13 2 9 22 2"/>',
      "        </svg>",
      "      </button>",
      "    </div>",
      '    <div class="holly-hint">Enter to send</div>',
      "  </div>",
      "</div>",
    ].join("\n");
  }

  function bindWidgetEvents(container) {
    var toggle = container.querySelector("#holly-toggle");
    var panel = container.querySelector("#holly-panel");
    var closeBtn = container.querySelector("#holly-close-btn");
    var input = container.querySelector("#holly-input");
    var sendBtn = container.querySelector("#holly-send-btn");
    var messagesEl = container.querySelector("#holly-messages");
    var typingEl = container.querySelector("#holly-typing");
    var badge = container.querySelector("#holly-badge");
    var dragHandle = container.querySelector("#holly-drag-handle");

    toggle.addEventListener("click", function () {
      widgetVisible = !widgetVisible;
      if (widgetVisible) {
        panel.classList.add("open");
        badge.classList.remove("visible");
        input.focus();
      } else {
        panel.classList.remove("open");
      }
    });

    closeBtn.addEventListener("click", function () {
      widgetVisible = false;
      panel.classList.remove("open");
    });

    sendBtn.addEventListener("click", function () {
      var text = input.value.trim();
      if (text) sendWidgetMessage(text, messagesEl, input, sendBtn, typingEl);
    });

    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        var text = input.value.trim();
        if (text) sendWidgetMessage(text, messagesEl, input, sendBtn, typingEl);
      }
    });

    input.addEventListener("input", function () {
      input.style.height = "auto";
      input.style.height = Math.min(input.scrollHeight, 80) + "px";
    });

    makeDraggable(container, dragHandle, panel);

    chrome.runtime.onMessage.addListener(function (request) {
      if (request.type === "HOLLY_TOGGLE_WIDGET") {
        widgetVisible = !widgetVisible;
        if (widgetVisible) {
          panel.classList.add("open");
          input.focus();
        } else {
          panel.classList.remove("open");
        }
      }
      if (request.type === "HOLLY_RESPONSE" && !widgetVisible) {
        badge.classList.add("visible");
      }
      if (request.type === "HOLLY_NOTIFICATION") {
        addWidgetMessage(messagesEl, "holly", request.message);
        if (!widgetVisible) badge.classList.add("visible");
      }
    });
  }

  function makeDraggable(container, handle, panel) {
    var isDragging = false;
    var offsetX = 0;
    var offsetY = 0;

    handle.addEventListener("mousedown", function (e) {
      isDragging = true;
      var rect = panel.getBoundingClientRect();
      offsetX = e.clientX - rect.left;
      offsetY = e.clientY - rect.top;
      e.preventDefault();
    });

    document.addEventListener("mousemove", function (e) {
      if (!isDragging) return;
      var x = e.clientX - offsetX;
      var y = e.clientY - offsetY;
      x = Math.max(0, Math.min(x, window.innerWidth - 380));
      y = Math.max(0, Math.min(y, window.innerHeight - 500));
      panel.style.position = "fixed";
      panel.style.left = x + "px";
      panel.style.top = y + "px";
      panel.style.bottom = "auto";
      panel.style.right = "auto";
    });

    document.addEventListener("mouseup", function () {
      isDragging = false;
    });
  }

  function escapeHtml(text) {
    var div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  function formatMessage(text) {
    var html = escapeHtml(text);
    html = html.replace(/```(\w*)\n([\s\S]*?)```/g, "<pre><code>$2</code></pre>");
    html = html.replace(/`([^`]+)`/g, "<code>$1</code>");
    html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");
    html = html.replace(
      /(https?:\/\/[^\s<>"')\]]+)/g,
      '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>'
    );
    html = html.replace(/\n/g, "<br>");
    return html;
  }

  function addWidgetMessage(messagesEl, role, content) {
    var welcome = messagesEl.querySelector(".holly-welcome");
    if (welcome) welcome.remove();

    var msg = document.createElement("div");
    msg.className = "holly-msg " + role;

    var avatar = document.createElement("div");
    avatar.className = "holly-msg-avatar";
    avatar.textContent = role === "holly" ? "H" : "U";

    var bubble = document.createElement("div");
    bubble.className = "holly-msg-bubble";
    bubble.innerHTML = formatMessage(content);

    msg.appendChild(avatar);
    msg.appendChild(bubble);
    messagesEl.appendChild(msg);
    messagesEl.scrollTop = messagesEl.scrollHeight;

    return bubble;
  }

  function addWidgetError(messagesEl, content) {
    var welcome = messagesEl.querySelector(".holly-welcome");
    if (welcome) welcome.remove();

    var el = document.createElement("div");
    el.className = "holly-error";
    el.textContent = content;
    messagesEl.appendChild(el);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function extractMessage(data) {
    if (typeof data === "string") return data;
    if (data.choices && data.choices[0]) {
      var choice = data.choices[0];
      if (choice.message && choice.message.content) return choice.message.content;
      if (choice.text) return choice.text;
    }
    if (data.message) {
      if (typeof data.message === "string") return data.message;
      if (data.message.content) return data.message.content;
    }
    if (data.response) return data.response;
    if (data.content) return data.content;
    if (data.answer) return data.answer;
    if (data.result) return data.result;
    return JSON.stringify(data);
  }

  function sendWidgetMessage(text, messagesEl, input, sendBtn, typingEl) {
    if (isStreaming) return;

    input.value = "";
    input.style.height = "auto";

    conversationHistory.push({ role: "user", content: text });
    addWidgetMessage(messagesEl, "user", text);

    isStreaming = true;
    sendBtn.disabled = true;
    typingEl.classList.remove("hidden");
    messagesEl.scrollTop = messagesEl.scrollHeight;

    chrome.runtime.sendMessage(
      {
        type: "HOLLY_SEND_MESSAGE",
        messages: conversationHistory.slice(-20),
      },
      function (response) {
        typingEl.classList.add("hidden");
        isStreaming = false;
        sendBtn.disabled = false;

        if (chrome.runtime.lastError) {
          addWidgetError(messagesEl, "Extension error: " + chrome.runtime.lastError.message);
          return;
        }

        if (response && response.error) {
          addWidgetError(messagesEl, response.error);
          return;
        }

        if (response && response.message) {
          conversationHistory.push({ role: "assistant", content: response.message });
          addWidgetMessage(messagesEl, "holly", response.message);
        } else if (response && response.data) {
          var msg = extractMessage(response.data);
          conversationHistory.push({ role: "assistant", content: msg });
          addWidgetMessage(messagesEl, "holly", msg);
        }
      }
    );
  }

  function getSelectedText() {
    var text = "";
    if (window.getSelection) {
      text = window.getSelection().toString();
    } else if (document.selection && document.selection.type !== "Control") {
      text = document.selection.createRange().text;
    }
    return text;
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      setTimeout(injectWidget, 500);
    });
  } else {
    setTimeout(injectWidget, 500);
  }

  chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    if (request.type === "HOLLY_GET_SELECTION") {
      sendResponse({ text: getSelectedText() });
      return true;
    }
    if (request.type === "HOLLY_INJECT_QUERY") {
      var panel = shadowRoot && shadowRoot.querySelector("#holly-panel");
      var input = shadowRoot && shadowRoot.querySelector("#holly-input");
      if (panel && input) {
        panel.classList.add("open");
        widgetVisible = true;
        input.value = request.text || "";
        input.focus();
      }
      sendResponse({ ok: true });
      return true;
    }
  });
})();
