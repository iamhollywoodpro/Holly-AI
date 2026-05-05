const DEFAULT_SERVER = "https://holly.nexamusicgroup.com";
const CHAT_ENDPOINT = "/api/v1/chat";

chrome.runtime.onInstalled.addListener(function () {
  chrome.contextMenus.create({
    id: "ask-holly",
    title: "Ask HOLLY about this",
    contexts: ["selection"],
  });

  chrome.contextMenus.create({
    id: "ask-holly-page",
    title: "Ask HOLLY about this page",
    contexts: ["page"],
  });

  chrome.storage.sync.get(
    {
      serverUrl: DEFAULT_SERVER,
      apiKey: "",
      streaming: true,
    },
    function () {}
  );
});

chrome.contextMenus.onClicked.addListener(function (info, tab) {
  if (info.menuItemId === "ask-holly" && info.selectionText) {
    handleContextMenuSelection(info.selectionText, tab);
  } else if (info.menuItemId === "ask-holly-page" && tab) {
    const pageText = info.pageUrl || "";
    const prompt = "Tell me about this page: " + pageText;
    handleContextMenuSelection(prompt, tab);
  }
});

function handleContextMenuSelection(text, tab) {
  if (!tab || !tab.id) return;

  chrome.storage.sync.get(
    {
      serverUrl: DEFAULT_SERVER,
      apiKey: "",
      streaming: true,
    },
    function (settings) {
      if (!settings.apiKey) {
        chrome.action.openPopup();
        chrome.tabs.sendMessage(tab.id, {
          type: "HOLLY_NOTIFICATION",
          message: "Please configure your API key in the extension settings.",
          level: "error",
        });
        return;
      }

      chrome.action.openPopup();

      setTimeout(function () {
        chrome.runtime.sendMessage({
          type: "HOLLY_CONTEXT_QUERY",
          text: text,
        });
      }, 300);

      queryHollyInBackground(text, settings).then(function (response) {
        if (response) {
          chrome.action.setBadgeText({ text: "1" });
          chrome.action.setBadgeBackgroundColor({ color: "#00e5ff" });

          setTimeout(function () {
            chrome.action.setBadgeText({ text: "" });
          }, 5000);

          chrome.tabs.sendMessage(tab.id, {
            type: "HOLLY_RESPONSE",
            query: text,
            response: response,
          });
        }
      });
    }
  );
}

async function queryHollyInBackground(text, settings) {
  const url = (settings.serverUrl || DEFAULT_SERVER) + CHAT_ENDPOINT;

  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + settings.apiKey,
      },
      body: JSON.stringify({
        messages: [
          {
            role: "user",
            content: text,
          },
        ],
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!resp.ok) {
      const errText = await resp.text().catch(function () {
        return "Unknown error";
      });
      showNotification("HOLLY Error", "Request failed: " + resp.status + " - " + errText.slice(0, 100));
      return null;
    }

    const data = await resp.json();
    return extractMessage(data);
  } catch (e) {
    showNotification("HOLLY Error", "Connection failed: " + e.message);
    return null;
  }
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

function showNotification(title, message) {
  chrome.notifications.create({
    type: "basic",
    iconUrl: "icons/icon128.png",
    title: title,
    message: message.slice(0, 300),
    priority: 2,
  });
}

chrome.commands.onCommand.addListener(function (command) {
  if (command === "_execute_action") {
    return;
  }

  if (command === "quick_chat") {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, {
          type: "HOLLY_TOGGLE_WIDGET",
        });
      }
    });
  }
});

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.type === "HOLLY_SEND_MESSAGE") {
    chrome.storage.sync.get(
      {
        serverUrl: DEFAULT_SERVER,
        apiKey: "",
      },
      function (settings) {
        if (!settings.apiKey) {
          sendResponse({ error: "No API key configured" });
          return;
        }

        var url = (settings.serverUrl || DEFAULT_SERVER) + CHAT_ENDPOINT;

        fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + settings.apiKey,
          },
          body: JSON.stringify({
            messages: request.messages || [
              {
                role: "user",
                content: request.text || "",
              },
            ],
          }),
          signal: AbortSignal.timeout(30000),
        })
          .then(function (resp) {
            if (!resp.ok) throw new Error("Server error: " + resp.status);
            return resp.json();
          })
          .then(function (data) {
            sendResponse({ success: true, data: data, message: extractMessage(data) });
          })
          .catch(function (e) {
            sendResponse({ error: e.message });
          });
      }
    );
    return true;
  }

  if (request.type === "HOLLY_NOTIFY") {
    showNotification(request.title || "HOLLY AI", request.message || "");
    sendResponse({ ok: true });
    return true;
  }
});
