import { Router, Request, Response, NextFunction } from "express";
import { createHash, randomBytes } from "crypto";
import { storage } from "./storage";
import { z } from "zod";
import { scrapePost, detectPlatform } from "./scraper";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

function hashKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

export function generateApiKey(): { fullKey: string; keyHash: string; keyPrefix: string } {
  const raw = randomBytes(32).toString("hex");
  const fullKey = `sb_${raw}`;
  const keyHash = hashKey(fullKey);
  const keyPrefix = `sb_${raw.slice(0, 8)}...`;
  return { fullKey, keyHash, keyPrefix };
}

const rateLimitStore = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 100;
const RATE_WINDOW_MS = 60 * 1000;

setInterval(() => {
  const now = Date.now();
  rateLimitStore.forEach((val, key) => {
    if (val.resetAt < now) rateLimitStore.delete(key);
  });
}, 60_000);

function rateLimit(req: Request, res: Response, next: NextFunction) {
  const keyId = String((req as any).apiKeyId);
  const now = Date.now();
  let entry = rateLimitStore.get(keyId);

  if (!entry || entry.resetAt < now) {
    entry = { count: 0, resetAt: now + RATE_WINDOW_MS };
    rateLimitStore.set(keyId, entry);
  }

  entry.count++;
  const remaining = Math.max(0, RATE_LIMIT - entry.count);
  const resetSeconds = Math.ceil((entry.resetAt - now) / 1000);

  res.set("X-RateLimit-Limit", String(RATE_LIMIT));
  res.set("X-RateLimit-Remaining", String(remaining));
  res.set("X-RateLimit-Reset", String(resetSeconds));

  if (entry.count > RATE_LIMIT) {
    return res.status(429).json({
      error: "rate_limit_exceeded",
      message: `Rate limit of ${RATE_LIMIT} requests per minute exceeded. Retry after ${resetSeconds} seconds.`,
    });
  }

  next();
}

async function authenticateApiKey(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "unauthorized", message: "Missing or invalid Authorization header. Use: Bearer <api_key>" });
  }

  const token = authHeader.slice(7);
  if (!token.startsWith("sb_")) {
    return res.status(401).json({ error: "unauthorized", message: "Invalid API key format." });
  }

  const keyHash = hashKey(token);
  const apiKey = await storage.getApiKeyByHash(keyHash);

  if (!apiKey) {
    return res.status(401).json({ error: "unauthorized", message: "Invalid or revoked API key." });
  }

  (req as any).apiUserId = apiKey.userId;
  (req as any).apiKeyId = apiKey.id;

  storage.updateApiKeyLastUsed(apiKey.id).catch(() => {});

  next();
}

export function createV1Router(): Router {
  const router = Router();

  router.use(authenticateApiKey);
  router.use(rateLimit);

  const getUserId = (req: Request): string => (req as any).apiUserId;

  router.get("/posts", async (req: Request, res: Response) => {
    try {
      const schema = z.object({
        search: z.string().optional(),
        tags: z.string().optional(),
        platform: z.string().optional(),
        collection: z.coerce.number().optional(),
        limit: z.coerce.number().min(1).max(100).default(50),
        offset: z.coerce.number().min(0).default(0),
      });
      const filters = schema.parse(req.query);
      const userId = getUserId(req);

      if (filters.collection) {
        const coll = await storage.getCollection(filters.collection);
        if (!coll || coll.userId !== userId) {
          return res.status(404).json({ error: "not_found", message: "Collection not found" });
        }
        const collPosts = await storage.getCollectionPosts(filters.collection);
        return res.json({ data: collPosts, meta: { limit: filters.limit, offset: filters.offset, total: collPosts.length } });
      }

      const posts = await storage.getPosts(userId, {
        search: filters.search,
        tags: filters.tags,
        platform: filters.platform,
        limit: filters.limit,
        offset: filters.offset,
      });
      res.json({ data: posts, meta: { limit: filters.limit, offset: filters.offset } });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ error: "validation_error", message: err.errors[0].message });
      }
      console.error("API v1 GET /posts error:", err);
      res.status(500).json({ error: "internal_error", message: "Internal server error" });
    }
  });

  router.get("/posts/:id", async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: "validation_error", message: "Invalid post ID" });

      const post = await storage.getPost(id);
      if (!post || post.userId !== getUserId(req)) {
        return res.status(404).json({ error: "not_found", message: "Post not found" });
      }
      res.json({ data: post });
    } catch (err) {
      console.error("API v1 GET /posts/:id error:", err);
      res.status(500).json({ error: "internal_error", message: "Internal server error" });
    }
  });

  router.post("/posts", async (req: Request, res: Response) => {
    try {
      const schema = z.object({
        content: z.string().min(1, "Content is required"),
        originalUrl: z.string().url().optional(),
        summary: z.string().optional(),
        authorName: z.string().optional(),
        authorUrl: z.string().optional(),
        imageUrl: z.string().optional(),
        tags: z.array(z.string()).optional(),
        platform: z.string().optional(),
        publishedAt: z.string().optional(),
        autoScrape: z.boolean().default(false),
      });
      const input = schema.parse(req.body);
      const userId = getUserId(req);

      const postData: any = {
        userId,
        content: input.content,
        originalUrl: input.originalUrl || null,
        summary: input.summary || null,
        authorName: input.authorName || null,
        authorUrl: input.authorUrl || null,
        imageUrl: input.imageUrl || null,
        tags: input.tags || [],
        platform: input.platform || "linkedin",
        publishedAt: input.publishedAt ? new Date(input.publishedAt) : null,
      };

      if (input.autoScrape && input.originalUrl) {
        try {
          const scraped = await scrapePost(input.originalUrl);
          if (scraped.platform) postData.platform = scraped.platform;
          if (scraped.imageUrl && !postData.imageUrl) postData.imageUrl = scraped.imageUrl;
          if (scraped.authorName && !postData.authorName) postData.authorName = scraped.authorName;
          if (scraped.authorUrl && !postData.authorUrl) postData.authorUrl = scraped.authorUrl;
          if (scraped.content && postData.content.length < 50) postData.content = scraped.content;
        } catch {
          if (!postData.platform || postData.platform === "linkedin") {
            postData.platform = detectPlatform(input.originalUrl);
          }
        }
      }

      const post = await storage.createPost(postData);
      res.status(201).json({ data: post });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ error: "validation_error", details: err.errors.map(e => ({ field: e.path.join("."), message: e.message })) });
      }
      console.error("API v1 POST /posts error:", err);
      res.status(500).json({ error: "internal_error", message: "Internal server error" });
    }
  });

  router.delete("/posts/:id", async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: "validation_error", message: "Invalid post ID" });

      const post = await storage.getPost(id);
      if (!post || post.userId !== getUserId(req)) {
        return res.status(404).json({ error: "not_found", message: "Post not found" });
      }
      await storage.deletePost(id);
      res.status(204).send();
    } catch (err) {
      console.error("API v1 DELETE /posts/:id error:", err);
      res.status(500).json({ error: "internal_error", message: "Internal server error" });
    }
  });

  router.post("/search", async (req: Request, res: Response) => {
    try {
      const schema = z.object({ query: z.string().min(1, "Query is required") });
      const { query } = schema.parse(req.body);
      const userId = getUserId(req);

      const sources = await storage.searchPosts(userId, query);
      if (sources.length === 0) {
        return res.json({ data: { answer: "No matching posts found.", sources: [] } });
      }

      const context = sources.map(p =>
        `[Title: ${p.summary || "No Title"}]\n[Content: ${p.content}]\n[Author: ${p.authorName || "Unknown"}]`
      ).join("\n---\n");

      const response = await openai.chat.completions.create({
        model: "gpt-5.2",
        messages: [
          { role: "system", content: "You are a helpful assistant that answers questions based on the user's saved posts. Use the provided context to answer. If the answer isn't in the context, say so." },
          { role: "user", content: `Context:\n${context}\n\nQuestion: ${query}` }
        ],
        max_completion_tokens: 500,
      });

      const answer = response.choices[0].message.content || "Unable to generate an answer.";
      res.json({ data: { answer, sources } });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ error: "validation_error", message: err.errors[0].message });
      }
      console.error("API v1 POST /search error:", err);
      res.status(500).json({ error: "internal_error", message: "Failed to perform search" });
    }
  });

  router.get("/collections", async (req: Request, res: Response) => {
    try {
      const colls = await storage.getCollections(getUserId(req));
      res.json({ data: colls });
    } catch (err) {
      console.error("API v1 GET /collections error:", err);
      res.status(500).json({ error: "internal_error", message: "Internal server error" });
    }
  });

  router.post("/scrape", async (req: Request, res: Response) => {
    try {
      const schema = z.object({ url: z.string().url("Valid URL is required") });
      const { url } = schema.parse(req.body);
      const scraped = await scrapePost(url);
      res.json({ data: scraped });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ error: "validation_error", message: "Invalid URL" });
      }
      console.error("API v1 POST /scrape error:", err);
      res.status(400).json({ error: "scrape_failed", message: "Failed to scrape URL" });
    }
  });

  return router;
}
