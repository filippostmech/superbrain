import * as cheerio from "cheerio";
import dns from "dns/promises";

const BLOCKED_HOSTNAMES = new Set(["localhost", "localhost.localdomain"]);

function isPrivateIPv4(parts: number[]): boolean {
  if (parts[0] === 127) return true;
  if (parts[0] === 10) return true;
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
  if (parts[0] === 192 && parts[1] === 168) return true;
  if (parts[0] === 169 && parts[1] === 254) return true;
  if (parts[0] === 0) return true;
  return false;
}

function isPrivateIP(ip: string): boolean {
  if (ip === "::1" || ip === "::") return true;
  if (ip.startsWith("fc") || ip.startsWith("fd")) return true;
  if (ip.startsWith("fe80")) return true;

  const mappedMatch = ip.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
  if (mappedMatch) {
    const parts = mappedMatch[1].split(".").map(Number);
    if (parts.length === 4 && parts.every(p => !isNaN(p) && p >= 0 && p <= 255)) {
      return isPrivateIPv4(parts);
    }
  }

  const parts = ip.split(".").map(Number);
  if (parts.length === 4 && parts.every(p => !isNaN(p) && p >= 0 && p <= 255)) {
    return isPrivateIPv4(parts);
  }

  return false;
}

export async function validateUrl(url: string): Promise<{ valid: boolean; reason?: string }> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { valid: false, reason: "Invalid URL format" };
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { valid: false, reason: `Protocol not allowed: ${parsed.protocol}` };
  }

  const hostname = parsed.hostname;

  if (BLOCKED_HOSTNAMES.has(hostname) || hostname.endsWith(".local")) {
    return { valid: false, reason: "Hostname not allowed" };
  }

  try {
    const result = await dns.lookup(hostname, { all: true });
    for (const entry of result) {
      if (isPrivateIP(entry.address)) {
        return { valid: false, reason: "URL resolves to a private network address" };
      }
    }
  } catch {
    return { valid: false, reason: "Could not resolve hostname" };
  }

  return { valid: true };
}

export interface ScrapedData {
  content: string;
  imageUrl: string | null;
  authorName: string | null;
  authorUrl: string | null;
  title: string | null;
  description: string | null;
  platform?: string;
}

const USER_AGENTS = [
  "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
  "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
];

const MAX_REDIRECTS = 5;

async function fetchSafe(url: string, userAgent: string, signal: AbortSignal): Promise<string> {
  let currentUrl = url;

  for (let hops = 0; hops <= MAX_REDIRECTS; hops++) {
    const res = await fetch(currentUrl, {
      headers: {
        "User-Agent": userAgent,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Cache-Control": "no-cache",
      },
      redirect: "manual",
      signal,
    });

    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location");
      if (!location) throw new Error("Redirect with no Location header");
      const nextUrl = new URL(location, currentUrl).href;
      const check = await validateUrl(nextUrl);
      if (!check.valid) {
        throw new Error(`Redirect blocked: ${check.reason}`);
      }
      currentUrl = nextUrl;
      continue;
    }

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    return await res.text();
  }

  throw new Error("Too many redirects");
}

async function fetchWithRetry(url: string, maxRetries = 3): Promise<string> {
  let lastError: Error | null = null;

  for (let i = 0; i < maxRetries; i++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);

      const result = await fetchSafe(url, USER_AGENTS[i % USER_AGENTS.length], controller.signal);

      clearTimeout(timeout);
      return result;
    } catch (err: any) {
      if (err?.message?.startsWith("Redirect blocked:") || err?.message === "Too many redirects") throw err;
      lastError = err;
      if (i < maxRetries - 1) {
        await new Promise(r => setTimeout(r, 1000 * (i + 1)));
      }
    }
  }

  throw lastError || new Error("Failed to fetch URL");
}

function extractLinkedInImage(html: string, $: cheerio.CheerioAPI): string | null {
  const ogImage = $('meta[property="og:image"]').attr("content");
  if (ogImage && !ogImage.includes("static.licdn.com/aero")) {
    return ogImage;
  }

  const twitterImage = $('meta[name="twitter:image"]').attr("content");
  if (twitterImage && !twitterImage.includes("static.licdn.com/aero")) {
    return twitterImage;
  }

  const linkedInImage = $('meta[property="og:image:secure_url"]').attr("content");
  if (linkedInImage) return linkedInImage;

  const articleImages = $("article img, .feed-shared-image img, .update-components-image img");
  for (let i = 0; i < articleImages.length; i++) {
    const src = $(articleImages[i]).attr("src") || $(articleImages[i]).attr("data-delayed-url");
    if (src && !src.includes("profile-displayphoto") && !src.includes("static.licdn.com/aero")) {
      return src;
    }
  }

  return ogImage || null;
}

function cleanText(text: string): string {
  return text
    .replace(/\s+/g, " ")
    .replace(/\n\s*\n/g, "\n\n")
    .trim();
}

function stripSocialMetadata(text: string): string {
  const cutoffPatterns = [
    /\s*\d+\s+\d*\s*[Cc]omments?\s+[Ll]ike\s+[Cc]omment\s+[Ss]hare[\s\S]*/,
    /\s*[Ll]ike\s+[Cc]omment\s+[Ss]hare\s+[Cc]opy\s+[Ll]inked[Ii]n[\s\S]*/,
    /\s*[Ll]ike\s+[Cc]omment\s+[Ss]hare\s+[Cc]opy[\s\S]*/,
    /\s+[Tt]o view or add a comment[\s\S]*/,
    /\s+[Ss]ee more comments[\s\S]*/,
    /\s+[Rr]eport this comment[\s\S]*/,
  ];

  let result = text;
  for (const pattern of cutoffPatterns) {
    const cleaned = result.replace(pattern, "");
    if (cleaned.length > 20 && cleaned.length < result.length) {
      result = cleaned;
      break;
    }
  }

  result = result.replace(/\s+[Ll]ike\s+[Rr]eply\s+\d+\s+[Rr]eactions?[\s\S]*$/, "");

  return result.trim();
}

function stripAuthorBio(text: string): string {
  const patterns = [
    /^[\s\S]{0,500}?Report this post\s*/,
    /^[\s\S]{0,500}?report this post\s*/i,
    /^[A-Z][a-z]+(?:\s[A-Z]\.?)?\s[A-Z][a-z]+\s[\s\S]{0,300}?\d+[dhm]\s*/,
  ];

  for (const pattern of patterns) {
    const stripped = text.replace(pattern, "");
    if (stripped.length > 20 && stripped.length < text.length) {
      return stripped;
    }
  }
  return text;
}

function extractAuthorFromContent(text: string): string | null {
  const match = text.match(/^([A-Z][a-z]+(?:\s[A-Z]\.?)?\s[A-Z][a-z]+(?:\s[A-Z][a-z]+)?)\s/);
  if (match && match[1].length < 50) {
    return match[1];
  }
  return null;
}

function extractContent($: cheerio.CheerioAPI): string {
  const ogDescription = $('meta[property="og:description"]').attr("content")?.trim();
  const metaDescription = $('meta[name="description"]').attr("content")?.trim();

  const articleText = $(".feed-shared-update-v2__description, .feed-shared-text, .update-components-text, article").first().text().trim();

  let content = "";

  if (articleText && articleText.length > 50 && articleText.length < 5000) {
    content = stripAuthorBio(articleText);
    content = stripSocialMetadata(content);
  } else if (ogDescription && ogDescription.length > 20) {
    content = ogDescription;
  } else if (metaDescription && metaDescription.length > 20) {
    content = metaDescription;
  } else if (articleText && articleText.length > 50) {
    content = stripAuthorBio(articleText);
    content = stripSocialMetadata(content);
    if (content.length > 3000) {
      content = content.substring(0, 3000) + "...";
    }
  } else {
    content = ogDescription || metaDescription || articleText || "";
  }

  return cleanText(content);
}

function extractAuthor($: cheerio.CheerioAPI, rawArticleText?: string): { name: string | null; url: string | null } {
  let url: string | null = null;
  const profileLink = $('a[href*="/in/"]').first().attr("href");
  if (profileLink) {
    url = profileLink.startsWith("http") ? profileLink : `https://www.linkedin.com${profileLink}`;
  }

  const authorMeta = $('meta[name="author"]').attr("content");
  if (authorMeta && authorMeta.length < 80 && !authorMeta.includes("|")) {
    return { name: authorMeta.trim(), url };
  }

  let name: string | null = null;
  const ogTitle = $('meta[property="og:title"]').attr("content") || null;
  if (ogTitle) {
    const onLinkedIn = ogTitle.indexOf(" on LinkedIn");
    if (onLinkedIn > 0) {
      name = ogTitle.substring(0, onLinkedIn).trim();
    } else if (ogTitle.includes(" | ")) {
      const parts = ogTitle.split(" | ");
      if (parts.length >= 2) {
        const lastPart = parts[parts.length - 1].trim();
        const hasComments = /^\d+\s+comment/.test(lastPart);
        const candidate = hasComments
          ? parts[parts.length - 2].trim()
          : parts[parts.length - 1].trim();
        if (candidate.length < 80 && !candidate.includes("\n") && !/^\d/.test(candidate)) {
          name = candidate;
        }
      }
    }

    if (!name) {
      const posted = ogTitle.indexOf(" posted");
      if (posted > 0) {
        const raw = ogTitle.substring(0, posted).trim();
        if (raw.length < 80) name = raw;
      }
    }
  }

  if (!name && rawArticleText) {
    name = extractAuthorFromContent(rawArticleText);
  }

  return { name, url };
}

export async function scrapeUrl(url: string): Promise<ScrapedData> {
  const html = await fetchWithRetry(url);
  const $ = cheerio.load(html);

  const imageUrl = extractLinkedInImage(html, $);
  const rawArticleText = $(".feed-shared-update-v2__description, .feed-shared-text, .update-components-text, article").first().text().trim();
  const content = extractContent($);
  const author = extractAuthor($, rawArticleText);
  const title = $('meta[property="og:title"]').attr("content") || $("title").text() || null;
  const description = $('meta[property="og:description"]').attr("content") || $('meta[name="description"]').attr("content") || null;

  return {
    content,
    imageUrl,
    authorName: author.name,
    authorUrl: author.url,
    title,
    description,
  };
}

function extractSubstackAuthor($: cheerio.CheerioAPI, url: string): string | null {
  const metaAuthor = $('meta[name="author"]').attr("content")?.trim() || null;
  if (metaAuthor && metaAuthor.toLowerCase() !== "substack") {
    return metaAuthor;
  }

  const bylineSelectors = [
    ".author-name",
    ".post-header .pencraft a",
    ".byline-content a",
    ".profile-hover-card-target a",
  ];
  for (const sel of bylineSelectors) {
    const text = $(sel).first().text().trim();
    if (text && text.toLowerCase() !== "substack" && text.length < 100) {
      return text;
    }
  }

  const ogSiteName = $('meta[property="og:site_name"]').attr("content")?.trim() || null;
  if (ogSiteName && ogSiteName.toLowerCase() !== "substack") {
    return ogSiteName;
  }

  const ogTitle = $('meta[property="og:title"]').attr("content") || "";
  const handleMatch = ogTitle.match(/^(.+?)\s*\(@\w+\)$/);
  if (handleMatch) {
    return handleMatch[1].trim();
  }
  if (ogTitle.includes("|")) {
    const parts = ogTitle.split("|").map((p: string) => p.trim()).filter((p: string) => p.toLowerCase() !== "substack" && p.length > 0);
    if (parts.length >= 2) {
      return parts[1];
    }
    if (parts.length === 1) {
      return parts[0];
    }
  }

  const urlHandleMatch = url.match(/substack\.com\/@([^/]+)/);
  if (urlHandleMatch) {
    return urlHandleMatch[1];
  }

  return null;
}

function scrapeSubstackFromHtml($: cheerio.CheerioAPI, html: string, url: string): ScrapedData {
  const ogImage = $('meta[property="og:image"]').attr("content") || null;
  const twitterImage = $('meta[name="twitter:image"]').attr("content") || null;
  const imageUrl = ogImage || twitterImage || null;

  const title = $('meta[property="og:title"]').attr("content") || $("title").text() || null;

  const authorName = extractSubstackAuthor($, url);

  let authorUrl: string | null = null;
  const substackAuthorLink = $(".author-name a, .post-header .pencraft a[href*='substack.com'], .profile-hover-card-target a").first().attr("href");
  if (substackAuthorLink) {
    authorUrl = substackAuthorLink.startsWith("http") ? substackAuthorLink : `https://${substackAuthorLink}`;
  }

  const articleBody = $(".body.markup, .post-content, .available-content, article .body").first();
  let content = "";

  if (articleBody.length) {
    const paragraphs: string[] = [];
    articleBody.find("p, h1, h2, h3, li").each((_, el) => {
      const text = $(el).text().trim();
      if (text.length > 0) {
        paragraphs.push(text);
      }
    });
    content = paragraphs.join("\n\n");
  }

  if (!content || content.length < 30) {
    const ogDescription = $('meta[property="og:description"]').attr("content") || "";
    const metaDescription = $('meta[name="description"]').attr("content") || "";
    content = ogDescription || metaDescription || "";
  }

  if (content.length > 3000) {
    content = content.substring(0, 3000) + "...";
  }

  const description = $('meta[property="og:description"]').attr("content") || $('meta[name="description"]').attr("content") || null;

  return {
    content: cleanText(content),
    imageUrl,
    authorName,
    authorUrl,
    title,
    description,
    platform: "substack",
  };
}

export async function scrapeSubstackUrl(url: string): Promise<ScrapedData> {
  const html = await fetchWithRetry(url);
  const $ = cheerio.load(html);
  return scrapeSubstackFromHtml($, html, url);
}

function scrapeGenericFromHtml(html: string, url: string): ScrapedData {
  const $ = cheerio.load(html);

  const ogImage = $('meta[property="og:image"]').attr("content") || null;
  const twitterImage = $('meta[name="twitter:image"]').attr("content") || null;
  const imageUrl = ogImage || twitterImage || null;

  const ogDescription = $('meta[property="og:description"]').attr("content") || "";
  const metaDescription = $('meta[name="description"]').attr("content") || "";
  const content = ogDescription || metaDescription || $("body").text().substring(0, 2000).trim();

  const title = $('meta[property="og:title"]').attr("content") || $("title").text() || null;
  const authorMeta = $('meta[name="author"]').attr("content") || null;

  return {
    content,
    imageUrl,
    authorName: authorMeta,
    authorUrl: null,
    title,
    description: ogDescription || metaDescription || null,
    platform: "other",
  };
}

export async function scrapeGenericUrl(url: string): Promise<ScrapedData> {
  const html = await fetchWithRetry(url);
  return scrapeGenericFromHtml(html, url);
}

export function detectPlatform(url: string): string {
  if (url.includes("linkedin.com")) return "linkedin";
  if (url.includes("substack.com") || url.includes(".substack.")) return "substack";
  return "other";
}

export function detectSubstackFromHtml(html: string): boolean {
  return html.includes("substackcdn.com") ||
    html.includes("substack-post-media") ||
    html.includes("class=\"post-content\"") ||
    html.includes("class=\"available-content\"") ||
    html.includes("substack.com/app") ||
    html.includes("Substack") && html.includes("class=\"body markup\"");
}

export async function scrapePost(url: string): Promise<ScrapedData> {
  const check = await validateUrl(url);
  if (!check.valid) {
    throw new Error(`URL not allowed: ${check.reason}`);
  }

  const platform = detectPlatform(url);
  if (platform === "linkedin") {
    const data = await scrapeUrl(url);
    return { ...data, platform: "linkedin" };
  }
  if (platform === "substack") {
    return scrapeSubstackUrl(url);
  }

  const html = await fetchWithRetry(url);
  if (detectSubstackFromHtml(html)) {
    const $ = cheerio.load(html);
    return scrapeSubstackFromHtml($, html, url);
  }

  return scrapeGenericFromHtml(html, url);
}
