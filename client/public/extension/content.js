// superBrain Chrome Extension - Content Script
// Runs on LinkedIn pages to enable saving posts

(function () {
  const APP_URL = "https://664e2351-08ab-4715-b2a8-1ca9453d14df-00-fqdv4clya93k.spock.replit.dev";

  function extractPostData(postElement) {
    const contentEl = postElement.querySelector(
      '.feed-shared-update-v2__description, .feed-shared-text, .update-components-text, [data-test-id="main-feed-activity-content"]'
    );
    const content = contentEl ? contentEl.innerText.trim() : "";

    const authorEl = postElement.querySelector(
      '.update-components-actor__name span[aria-hidden="true"], .feed-shared-actor__name span'
    );
    const authorName = authorEl ? authorEl.innerText.trim() : "";

    const authorLinkEl = postElement.querySelector(
      '.update-components-actor__container-link, .feed-shared-actor__container-link'
    );
    const authorUrl = authorLinkEl ? authorLinkEl.href : "";

    const timeEl = postElement.querySelector(
      '.update-components-actor__sub-description span[aria-hidden="true"], time'
    );
    const publishedAt = timeEl
      ? timeEl.getAttribute("datetime") || timeEl.innerText.trim()
      : "";

    let originalUrl = "";
    const urnEl = postElement.getAttribute("data-urn");
    if (urnEl) {
      const activityId = urnEl.split(":").pop();
      if (activityId) {
        originalUrl = `https://www.linkedin.com/feed/update/urn:li:activity:${activityId}/`;
      }
    }
    if (!originalUrl) {
      const linkEl = postElement.querySelector(
        'a[href*="/feed/update/"], a[data-test-id="feed-shared-social-action-see-more"]'
      );
      if (linkEl) {
        originalUrl = linkEl.href.split("?")[0];
      }
    }

    return { content, authorName, authorUrl, publishedAt, originalUrl };
  }

  function addSaveButtons() {
    const posts = document.querySelectorAll(
      '.feed-shared-update-v2, [data-id^="urn:li:activity"]'
    );

    posts.forEach((post) => {
      if (post.querySelector(".contenthub-save-btn")) return;

      const actionsBar = post.querySelector(
        ".feed-shared-social-action-bar, .social-details-social-activity"
      );
      if (!actionsBar) return;

      const btn = document.createElement("button");
      btn.className = "contenthub-save-btn";
      btn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/>
        </svg>
        <span>Save to superBrain</span>
      `;
      btn.title = "Save to superBrain";

      btn.addEventListener("click", async (e) => {
        e.preventDefault();
        e.stopPropagation();

        const data = extractPostData(post);
        if (!data.content) {
          btn.innerHTML = `<span style="color:#dc2626;">No content found</span>`;
          setTimeout(() => resetButton(btn), 2000);
          return;
        }

        btn.disabled = true;
        btn.innerHTML = `<span>Saving...</span>`;

        try {
          const response = await fetch(`${APP_URL}/api/posts/extension`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ posts: [data] }),
          });

          if (response.status === 401) {
            btn.innerHTML = `<span style="color:#dc2626;">Login to superBrain first</span>`;
            setTimeout(() => resetButton(btn), 3000);
            return;
          }

          const result = await response.json();
          if (result.imported > 0) {
            btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg><span style="color:#16a34a;">Saved!</span>`;
            btn.classList.add("contenthub-saved");
          } else {
            btn.innerHTML = `<span style="color:#f59e0b;">Already saved</span>`;
          }
          setTimeout(() => resetButton(btn), 3000);
        } catch (err) {
          btn.innerHTML = `<span style="color:#dc2626;">Error saving</span>`;
          setTimeout(() => resetButton(btn), 3000);
        }
        btn.disabled = false;
      });

      actionsBar.appendChild(btn);
    });
  }

  function resetButton(btn) {
    btn.classList.remove("contenthub-saved");
    btn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/>
      </svg>
      <span>Save to superBrain</span>
    `;
  }

  // Observe feed changes (infinite scroll)
  const observer = new MutationObserver(() => {
    addSaveButtons();
  });

  function init() {
    addSaveButtons();
    const feed = document.querySelector(".scaffold-finite-scroll, main");
    if (feed) {
      observer.observe(feed, { childList: true, subtree: true });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
