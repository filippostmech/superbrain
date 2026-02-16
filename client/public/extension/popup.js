const APP_URL = "https://664e2351-08ab-4715-b2a8-1ca9453d14df-00-fqdv4clya93k.spock.replit.dev";

const statusDot = document.getElementById("statusDot");
const statusText = document.getElementById("statusText");
const scrapeBtn = document.getElementById("scrapeBtn");
const openAppBtn = document.getElementById("openAppBtn");
const results = document.getElementById("results");

async function checkConnection() {
  try {
    const res = await fetch(`${APP_URL}/api/auth/user`, {
      credentials: "include",
    });
    if (res.ok) {
      const user = await res.json();
      statusDot.classList.add("connected");
      statusText.textContent = `Connected as ${user.firstName || user.email || "User"}`;
      scrapeBtn.disabled = false;
    } else {
      statusText.textContent = "Not logged in - open superBrain first";
    }
  } catch (e) {
    statusText.textContent = "Cannot reach superBrain";
  }
}

scrapeBtn.addEventListener("click", async () => {
  scrapeBtn.disabled = true;
  scrapeBtn.textContent = "Scanning page...";
  results.textContent = "";
  results.className = "results";

  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    const response = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: scrapeSavedPosts,
    });

    const posts = response[0]?.result || [];

    if (posts.length === 0) {
      results.textContent =
        "No posts found on this page. Make sure you're on the LinkedIn Saved Posts page.";
      results.className = "results error";
      scrapeBtn.disabled = false;
      scrapeBtn.textContent = "Import Saved Posts from This Page";
      return;
    }

    scrapeBtn.textContent = `Sending ${posts.length} posts...`;

    const res = await fetch(`${APP_URL}/api/posts/extension`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ posts }),
    });

    if (res.status === 401) {
      results.textContent = "Please log in to superBrain first.";
      results.className = "results error";
    } else {
      const data = await res.json();
      results.textContent = `Imported ${data.imported} posts (${data.skipped} already saved)`;
      results.className = "results success";
    }
  } catch (e) {
    results.textContent = "Error: " + e.message;
    results.className = "results error";
  }

  scrapeBtn.disabled = false;
  scrapeBtn.textContent = "Import Saved Posts from This Page";
});

openAppBtn.addEventListener("click", () => {
  chrome.tabs.create({ url: APP_URL });
});

function scrapeSavedPosts() {
  const posts = [];
  const postElements = document.querySelectorAll(
    '.feed-shared-update-v2, [data-id^="urn:li:activity"], .reusable-search__result-container, .entity-result, [data-chameleon-result-urn]'
  );

  postElements.forEach((el) => {
    const contentEl = el.querySelector(
      '.feed-shared-update-v2__description, .feed-shared-text, .update-components-text, [data-test-id="main-feed-activity-content"], .feed-shared-inline-show-more-text'
    );
    const content = contentEl ? contentEl.innerText.trim() : "";
    if (!content) return;

    const authorEl = el.querySelector(
      '.update-components-actor__name span[aria-hidden="true"], .feed-shared-actor__name span, .entity-result__title-text a'
    );
    const authorName = authorEl ? authorEl.innerText.trim() : "";

    const authorLinkEl = el.querySelector(
      '.update-components-actor__container-link, .feed-shared-actor__container-link, .entity-result__title-text a'
    );
    const authorUrl = authorLinkEl ? authorLinkEl.href : "";

    let originalUrl = "";
    const urnAttr =
      el.getAttribute("data-urn") ||
      el.getAttribute("data-id") ||
      el.getAttribute("data-chameleon-result-urn");
    if (urnAttr) {
      const actId = urnAttr.split(":").pop();
      if (actId) {
        originalUrl = `https://www.linkedin.com/feed/update/urn:li:activity:${actId}/`;
      }
    }

    posts.push({ content, authorName, authorUrl, originalUrl });
  });

  return posts;
}

checkConnection();
