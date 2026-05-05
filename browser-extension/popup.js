(function () {
  const DEFAULT_SERVER = "https://holly.nexamusicgroup.com";
  const CHAT_ENDPOINT = "/api/v1/chat";

  const $ = (sel) => document.querySelector(sel);

  const messagesEl = $("#messages");
  const messageInput = $("#message-input");
  const sendBtn = $("#send-btn");
  const micBtn = $("#mic-btn");
  const settingsBtn = $("#settings-btn");
  const clearBtn = $("#clear-btn");
  const settingsPanel = $("#settings-panel");
  const serverUrlInput = $("#server-url");
  const apiKeyInput = $("#api-key");
  const streamToggle = $("#stream-toggle");
  const saveSettingsBtn = $("#save-settings");
  const testConnectionBtn = $("#test-connection");
  const settingsStatusEl = $("#settings-status");
  const statusIndicator = $("#status-indicator");
  const typingIndicator = $("#typing-indicator");

  let conversationHistory = [];
  let isStreaming = false;
  let abortController = null;
  let settings = {
    serverUrl: DEFAULT_SERVER,
    apiKey: "",
    streaming: true,
  };

  function loadSettings() {
    return new Promise((resolve) => {
      chrome.storage.sync.get(
        {
          serverUrl: DEFAULT_SERVER,
          apiKey: "",
          streaming: true,
        },
        (items) => {
          settings = items;
          serverUrlInput.value = settings.serverUrl || DEFAULT_SERVER;
          apiKeyInput.value = settings.apiKey || "";
          streamToggle.checked = settings.streaming !== false;
          resolve();
        }
      );
    });
  }

  function saveSettings() {
    settings.serverUrl = serverUrlInput.value.trim().replace(/\/+$/, "") || DEFAULT_SERVER;
    settings.apiKey = apiKeyInput.value.trim();
    settings.streaming = streamToggle.checked;

    chrome.storage.sync.set(settings, () => {
      showSettingsStatus("Settings saved", "success");
      updateConnectionStatus();
    });
  }

  function showSettingsStatus(msg, type) {
    settingsStatusEl.textContent = msg;
    settingsStatusEl.className = "settings-status " + type;
    setTimeout(() => {
      settingsStatusEl.textContent = "";
      settingsStatusEl.className = "settings-status";
    }, 3000);
  }

  function setConnectionStatus(status) {
    statusIndicator.className = "status-dot " + status;
    if (status === "connected") {
      statusIndicator.title = "Connected to HOLLY";
    } else if (status === "connecting") {
      statusIndicator.title = "Connecting...";
    } else {
      statusIndicator.title = "Disconnected";
    }
  }

  async function updateConnectionStatus() {
    if (!settings.apiKey) {
      setConnectionStatus("disconnected");
      return;
    }
    setConnectionStatus("connecting");
    try {
      const url = settings.serverUrl + "/api/v1/health";
      const resp = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: "Bearer " + settings.apiKey,
        },
        signal: AbortSignal.timeout(5000),
      });
      if (resp.ok) {
        setConnectionStatus("connected");
      } else {
        setConnectionStatus("disconnected");
      }
    } catch {
      setConnectionStatus("disconnected");
    }
  }

  async function testConnection() {
    showSettingsStatus("Testing connection...", "");
    const url = (serverUrlInput.value.trim().replace(/\/+$/, "") || DEFAULT_SERVER) + "/api/v1/health";
    const key = apiKeyInput.value.trim();
    try {
      const resp = await fetch(url, {
        method: "GET",
        headers: key
          ? {
              Authorization: "Bearer " + key,
            }
          : {},
        signal: AbortSignal.timeout(8000),
      });
      if (resp.ok) {
        showSettingsStatus("Connection successful!", "success");
      } else {
        const text = await resp.text().catch(() => "");
        showSettingsStatus("Connection failed (" + resp.status + "): " + text.slice(0, 80), "error");
      }
    } catch (e) {
      showSettingsStatus("Connection error: " + e.message, "error");
    }
  }

  function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  function formatMessage(text) {
    let html = escapeHtml(text);

    html = html.replace(/```(\w*)\n([\s\S]*?)```/g, function (_, lang, code) {
      return '<pre><code class="lang-' + lang + '">' + code.trim() + "</code></pre>";
    });

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

  function addMessage(role, content) {
    const welcome = messagesEl.querySelector(".welcome-message");
    if (welcome) welcome.remove();

    const msgEl = document.createElement("div");
    msgEl.className = "message " + role;

    const avatar = document.createElement("div");
    avatar.className = "message-avatar";
    avatar.textContent = role === "holly" ? "H" : "U";

    const bubble = document.createElement("div");
    bubble.className = "message-bubble";
    bubble.innerHTML = formatMessage(content);

    msgEl.appendChild(avatar);
    msgEl.appendChild(bubble);
    messagesEl.appendChild(msgEl);
    scrollToBottom();

    return bubble;
  }

  function addErrorMessage(content) {
    const welcome = messagesEl.querySelector(".welcome-message");
    if (welcome) welcome.remove();

    const el = document.createElement("div");
    el.className = "error-text";
    el.textContent = content;
    messagesEl.appendChild(el);
    scrollToBottom();
  }

  function addSystemMessage(content) {
    const welcome = messagesEl.querySelector(".welcome-message");
    if (welcome) welcome.remove();

    const el = document.createElement("div");
    el.className = "system-message";
    el.textContent = content;
    messagesEl.appendChild(el);
    scrollToBottom();
  }

  function scrollToBottom() {
    requestAnimationFrame(() => {
      messagesEl.scrollTop = messagesEl.scrollHeight;
    });
  }

  function showTyping() {
    typingIndicator.classList.remove("hidden");
    scrollToBottom();
  }

  function hideTyping() {
    typingIndicator.classList.add("hidden");
  }

  function setInputState(disabled) {
    messageInput.disabled = disabled;
    sendBtn.disabled = disabled;
    if (disabled) {
      sendBtn.style.opacity = "0.4";
    } else {
      sendBtn.style.opacity = "";
    }
  }

  async function sendMessage(text) {
    if (!text || !text.trim()) return;
    if (isStreaming) return;

    text = text.trim();

    if (!settings.apiKey) {
      addErrorMessage("Please configure your API key in Settings.");
      settingsPanel.classList.remove("hidden");
      return;
    }

    conversationHistory.push({ role: "user", content: text });
    addMessage("user", text);
    messageInput.value = "";
    autoResizeInput();

    isStreaming = true;
    setInputState(true);
    showTyping();

    const url = (settings.serverUrl || DEFAULT_SERVER) + CHAT_ENDPOINT;

    abortController = new AbortController();

    try {
      const body = {
        messages: conversationHistory.slice(-20),
      };

      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + settings.apiKey,
        },
        body: JSON.stringify(body),
        signal: abortController.signal,
      });

      hideTyping();

      if (!resp.ok) {
        let errText = "";
        try {
          const errData = await resp.json();
          errText = errData.detail || errData.message || errData.error || JSON.stringify(errData);
        } catch {
          errText = await resp.text().catch(() => "Unknown error");
        }
        throw new Error("Server error (" + resp.status + "): " + errText);
      }

      if (settings.streaming && resp.body && typeof resp.body.getReader === "function") {
        await handleStreamResponse(resp);
      } else {
        const data = await resp.json();
        const assistantMessage = extractAssistantMessage(data);
        if (assistantMessage) {
          conversationHistory.push({ role: "assistant", content: assistantMessage });
          addMessage("holly", assistantMessage);
        }
      }
    } catch (e) {
      hideTyping();
      if (e.name === "AbortError") {
        addSystemMessage("Request cancelled.");
      } else {
        addErrorMessage(e.message);
      }
    } finally {
      isStreaming = false;
      abortController = null;
      setInputState(false);
      messageInput.focus();
    }
  }

  function extractAssistantMessage(data) {
    if (typeof data === "string") return data;
    if (data.choices && data.choices[0]) {
      const choice = data.choices[0];
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

  async function handleStreamResponse(resp) {
    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let accumulated = "";
    let bubble = null;
    let rawChunks = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      rawChunks += decoder.decode(value, { stream: true });

      const lines = rawChunks.split("\n");
      rawChunks = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        if (trimmed.startsWith("data: ")) {
          const payload = trimmed.slice(6);
          if (payload === "[DONE]") continue;

          let chunk;
          try {
            chunk = JSON.parse(payload);
          } catch {
            accumulated += payload;
            if (!bubble) {
              bubble = addMessage("holly", accumulated);
            } else {
              bubble.innerHTML = formatMessage(accumulated);
              scrollToBottom();
            }
            continue;
          }

          let content = "";
          if (chunk.choices && chunk.choices[0]) {
            const delta = chunk.choices[0].delta;
            if (delta && delta.content) content = delta.content;
            else if (chunk.choices[0].text) content = chunk.choices[0].text;
          } else if (chunk.content) {
            content = chunk.content;
          } else if (chunk.text) {
            content = chunk.text;
          } else if (typeof chunk === "string") {
            content = chunk;
          }

          if (content) {
            accumulated += content;
            if (!bubble) {
              bubble = addMessage("holly", accumulated);
            } else {
              bubble.innerHTML = formatMessage(accumulated);
              scrollToBottom();
            }
          }
        }
      }
    }

    if (accumulated) {
      conversationHistory.push({ role: "assistant", content: accumulated });
    }
  }

  function clearConversation() {
    conversationHistory = [];
    messagesEl.innerHTML =
      '<div class="welcome-message">' +
      '<div class="welcome-icon">&#9670;</div>' +
      "<h2>HOLLY AI</h2>" +
      "<p>Self-Evolving Intelligence</p>" +
      "</div>";
    addSystemMessage("Conversation cleared.");
  }

  function autoResizeInput() {
    messageInput.style.height = "auto";
    messageInput.style.height = Math.min(messageInput.scrollHeight, 100) + "px";
  }

  let recognition = null;
  let isRecording = false;

  function startVoiceInput() {
    if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
      addErrorMessage("Voice input is not supported in this browser.");
      return;
    }

    if (isRecording) {
      stopVoiceInput();
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onstart = function () {
      isRecording = true;
      micBtn.classList.add("recording");
    };

    recognition.onresult = function (event) {
      let transcript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      messageInput.value = transcript;
      autoResizeInput();
    };

    recognition.onerror = function () {
      stopVoiceInput();
    };

    recognition.onend = function () {
      stopVoiceInput();
    };

    recognition.start();
  }

  function stopVoiceInput() {
    if (recognition) {
      recognition.stop();
      recognition = null;
    }
    isRecording = false;
    micBtn.classList.remove("recording");
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      const text = messageInput.value;
      if (text.trim()) {
        sendMessage(text);
      }
    }
  }

  function toggleSettings() {
    settingsPanel.classList.toggle("hidden");
  }

  function handleIncomingMessage(request) {
    if (request && request.type === "HOLLY_QUICK_CHAT") {
      const text = request.text || request.message || "";
      if (text) {
        sendMessage(text);
      }
    }
    if (request && request.type === "HOLLY_CONTEXT_QUERY") {
      const text = request.text || request.selection || "";
      if (text) {
        const prompt = "Analyze the following text and provide insights:\n\n" + text;
        sendMessage(prompt);
      }
    }
  }

  chrome.runtime.onMessage.addListener(handleIncomingMessage);

  settingsBtn.addEventListener("click", toggleSettings);
  clearBtn.addEventListener("click", clearConversation);
  sendBtn.addEventListener("click", function () {
    sendMessage(messageInput.value);
  });
  messageInput.addEventListener("keydown", handleKeyDown);
  messageInput.addEventListener("input", autoResizeInput);
  micBtn.addEventListener("click", startVoiceInput);
  saveSettingsBtn.addEventListener("click", saveSettings);
  testConnectionBtn.addEventListener("click", testConnection);

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      if (!settingsPanel.classList.contains("hidden")) {
        settingsPanel.classList.add("hidden");
      }
    }
  });

  loadSettings().then(function () {
    updateConnectionStatus();
    messageInput.focus();
  });
})();
