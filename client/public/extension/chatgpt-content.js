(function () {
  const APP_URL = "https://664e2351-08ab-4715-b2a8-1ca9453d14df-00-fqdv4clya93k.spock.replit.dev";

  function isSharePage() {
    return window.location.pathname.startsWith("/share/");
  }

  function isConversationPage() {
    return window.location.pathname.startsWith("/c/");
  }

  function extractConversationData() {
    const title = document.title.replace(" | ChatGPT", "").replace(" - ChatGPT", "").trim() || "ChatGPT Conversation";

    const messages = [];
    const turnElements = document.querySelectorAll('[data-message-author-role]');

    if (turnElements.length > 0) {
      turnElements.forEach((el) => {
        const role = el.getAttribute("data-message-author-role");
        if (role === "system") return;

        const textEl = el.querySelector(".markdown, .whitespace-pre-wrap");
        const text = textEl ? textEl.innerText.trim() : el.innerText.trim();
        if (!text) return;

        const label = role === "user" ? "User" : "ChatGPT";
        messages.push("**" + label + ":** " + text);
      });
    }

    if (messages.length === 0) {
      const articleEls = document.querySelectorAll("article, [data-testid*='conversation-turn']");
      articleEls.forEach((article) => {
        const text = article.innerText.trim();
        if (!text) return;
        messages.push(text);
      });
    }

    if (messages.length === 0) {
      const mainContent = document.querySelector("main");
      if (mainContent) {
        const text = mainContent.innerText.trim();
        if (text.length > 50) {
          messages.push(text);
        }
      }
    }

    const content = messages.join("\n\n---\n\n");
    const originalUrl = window.location.href.split("?")[0];

    return {
      content: content || "",
      authorName: "ChatGPT conversation",
      authorUrl: "",
      publishedAt: "",
      originalUrl: originalUrl,
      platform: "chatgpt",
      summary: title,
    };
  }

  function createSaveButton() {
    if (document.querySelector(".superbrain-chatgpt-save")) return;

    const btn = document.createElement("button");
    btn.className = "superbrain-chatgpt-save contenthub-save-btn";
    btn.style.cssText = "position:fixed;bottom:24px;right:24px;z-index:10000;padding:10px 18px;border-radius:24px;font-size:14px;font-weight:600;border:1px solid #10a37f;color:#10a37f;background:white;cursor:pointer;box-shadow:0 2px 12px rgba(0,0,0,0.15);transition:all 0.2s ease;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;display:flex;align-items:center;gap:8px;";
    btn.innerHTML =
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/></svg>' +
      '<span>Save to superBrain</span>';
    btn.title = "Save this conversation to superBrain";

    btn.addEventListener("mouseenter", () => {
      btn.style.background = "#10a37f";
      btn.style.color = "#fff";
    });
    btn.addEventListener("mouseleave", () => {
      if (!btn.classList.contains("superbrain-saved")) {
        btn.style.background = "white";
        btn.style.color = "#10a37f";
      }
    });

    btn.addEventListener("click", async (e) => {
      e.preventDefault();
      e.stopPropagation();

      const data = extractConversationData();
      if (!data.content) {
        btn.querySelector("span").textContent = "No content found";
        btn.style.borderColor = "#dc2626";
        btn.style.color = "#dc2626";
        setTimeout(() => resetChatGPTButton(btn), 2000);
        return;
      }

      btn.disabled = true;
      btn.querySelector("span").textContent = "Saving...";

      try {
        const response = await fetch(APP_URL + "/api/posts/extension", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ posts: [data] }),
        });

        if (response.status === 401) {
          btn.querySelector("span").textContent = "Login to superBrain first";
          btn.style.borderColor = "#dc2626";
          btn.style.color = "#dc2626";
          setTimeout(() => resetChatGPTButton(btn), 3000);
          btn.disabled = false;
          return;
        }

        const result = await response.json();
        if (result.imported > 0) {
          btn.querySelector("span").textContent = "Saved!";
          btn.style.borderColor = "#16a34a";
          btn.style.color = "#fff";
          btn.style.background = "#16a34a";
          btn.classList.add("superbrain-saved");
        } else {
          btn.querySelector("span").textContent = "Already saved";
          btn.style.borderColor = "#f59e0b";
          btn.style.color = "#f59e0b";
        }
        setTimeout(() => resetChatGPTButton(btn), 3000);
      } catch (err) {
        btn.querySelector("span").textContent = "Error saving";
        btn.style.borderColor = "#dc2626";
        btn.style.color = "#dc2626";
        setTimeout(() => resetChatGPTButton(btn), 3000);
      }
      btn.disabled = false;
    });

    document.body.appendChild(btn);
  }

  function resetChatGPTButton(btn) {
    btn.classList.remove("superbrain-saved");
    btn.style.borderColor = "#10a37f";
    btn.style.color = "#10a37f";
    btn.style.background = "white";
    btn.innerHTML =
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/></svg>' +
      '<span>Save to superBrain</span>';
  }

  function init() {
    if (isSharePage() || isConversationPage()) {
      setTimeout(() => createSaveButton(), 1500);
    }
  }

  const pageObserver = new MutationObserver(() => {
    if (isSharePage() || isConversationPage()) {
      createSaveButton();
    }
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  pageObserver.observe(document.body || document.documentElement, {
    childList: true,
    subtree: true,
  });

  let lastUrl = window.location.href;
  setInterval(() => {
    if (window.location.href !== lastUrl) {
      lastUrl = window.location.href;
      const existing = document.querySelector(".superbrain-chatgpt-save");
      if (existing) existing.remove();
      if (isSharePage() || isConversationPage()) {
        setTimeout(() => createSaveButton(), 1500);
      }
    }
  }, 1000);
})();
