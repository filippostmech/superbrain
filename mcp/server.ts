#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const SUPERBRAIN_API_KEY = process.env.SUPERBRAIN_API_KEY;
const SUPERBRAIN_URL = process.env.SUPERBRAIN_URL || "https://www.super-brain.app";

if (!SUPERBRAIN_API_KEY) {
  console.error("Error: SUPERBRAIN_API_KEY environment variable is required.");
  console.error("Generate an API key at your superBrain dashboard → API Keys page.");
  process.exit(1);
}

const headers = {
  Authorization: `Bearer ${SUPERBRAIN_API_KEY}`,
  "Content-Type": "application/json",
};

async function apiCall(method: string, path: string, body?: unknown): Promise<unknown> {
  const url = `${SUPERBRAIN_URL}${path}`;
  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`API ${method} ${path} failed (${res.status}): ${errorBody}`);
  }

  return res.json();
}

const server = new McpServer({
  name: "superbrain",
  version: "1.0.0",
});

server.tool(
  "search_knowledge",
  "Search across your saved posts using natural language. Returns semantically relevant results from your superBrain library.",
  {
    query: z.string().describe("Natural language search query, e.g. 'articles about AI pricing models'"),
    limit: z.number().optional().describe("Max number of results to return (default 10)"),
  },
  async ({ query, limit }) => {
    const result = await apiCall("POST", "/api/v1/search", { query, limit: limit || 10 });
    return {
      content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
    };
  }
);

server.tool(
  "list_posts",
  "List posts from your superBrain library. Supports filtering by search text, tags, platform, and collection.",
  {
    search: z.string().optional().describe("Keyword search across content, author, tags, URL"),
    tags: z.string().optional().describe("Comma-separated tags to filter by, e.g. 'ai,pricing'"),
    platform: z.enum(["linkedin", "substack", "other"]).optional().describe("Filter by platform"),
    collection: z.number().optional().describe("Collection ID to filter by"),
    limit: z.number().optional().describe("Max results (default 20, max 100)"),
    offset: z.number().optional().describe("Pagination offset (default 0)"),
  },
  async ({ search, tags, platform, collection, limit, offset }) => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (tags) params.set("tags", tags);
    if (platform) params.set("platform", platform);
    if (collection) params.set("collection", String(collection));
    if (limit) params.set("limit", String(limit));
    if (offset) params.set("offset", String(offset));

    const qs = params.toString();
    const result = await apiCall("GET", `/api/v1/posts${qs ? `?${qs}` : ""}`);
    return {
      content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
    };
  }
);

server.tool(
  "save_post",
  "Save a new post to your superBrain library. You can provide a URL to scrape or raw content directly.",
  {
    content: z.string().describe("The post content or text to save"),
    originalUrl: z.string().optional().describe("The original URL of the post"),
    authorName: z.string().optional().describe("Author name"),
    tags: z.array(z.string()).optional().describe("Tags for the post, e.g. ['ai', 'strategy']"),
    platform: z.enum(["linkedin", "substack", "other"]).optional().describe("Content platform"),
    summary: z.string().optional().describe("A short summary of the post"),
  },
  async ({ content, originalUrl, authorName, tags, platform, summary }) => {
    const body: Record<string, unknown> = { content };
    if (originalUrl) body.originalUrl = originalUrl;
    if (authorName) body.authorName = authorName;
    if (tags) body.tags = tags;
    if (platform) body.platform = platform;
    if (summary) body.summary = summary;

    const result = await apiCall("POST", "/api/v1/posts", body);
    return {
      content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
    };
  }
);

server.tool(
  "scrape_url",
  "Scrape a URL and return structured content (title, content, author, image, platform). Does not save it — use save_post to save afterward.",
  {
    url: z.string().describe("The URL to scrape"),
  },
  async ({ url }) => {
    const result = await apiCall("POST", "/api/v1/scrape", { url });
    return {
      content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
    };
  }
);

server.tool(
  "list_collections",
  "List all your collections in superBrain. Collections are named groups used to organize saved posts.",
  {},
  async () => {
    const result = await apiCall("GET", "/api/v1/collections");
    return {
      content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
    };
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
