import * as cheerio from "cheerio";

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

async function fetchWithRetry(url: string, maxRetries = 3): Promise<string> {
  let lastError: Error | null = null;

  for (let i = 0; i < maxRetries; i++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);

      const res = await fetch(url, {
        headers: {
          "User-Agent": USER_AGENTS[i % USER_AGENTS.length],
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
          "Cache-Control": "no-cache",
        },
        redirect: "follow",
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      return await res.text();
    } catch (err: any) {
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
