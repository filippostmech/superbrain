import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { setupAuth, registerAuthRoutes } from "./replit_integrations/auth";
import { registerChatRoutes } from "./replit_integrations/chat";
import OpenAI from "openai";
import { scrapePost, detectPlatform } from "./scraper";
import { createV1Router, generateApiKey } from "./apiV1";

// Initialize OpenAI for our custom search/RAG endpoint
const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // 1. Setup Auth
  await setupAuth(app);
  registerAuthRoutes(app);

  // 2. Setup generic Chat (optional, but good to have)
  registerChatRoutes(app);

  // 3. Application Routes
  
  // Middleware to ensure user is authenticated for API routes
  const requireAuth = (req: any, res: any, next: any) => {
    if (req.isAuthenticated()) {
      return next();
    }
    res.status(401).json({ message: "Unauthorized" });
  };

  // Helper to get user ID from passport session
  const getUserId = (req: any): string => req.user?.claims?.sub;

  // Scrape URL endpoint - extracts content, image, author from a URL
  app.post("/api/scrape", requireAuth, async (req, res) => {
    try {
      const { url } = z.object({ url: z.string().url() }).parse(req.body);
      const scraped = await scrapePost(url);
      res.json(scraped);
    } catch (err: any) {
      console.error("Scrape error:", err?.message || err);
      res.status(400).json({
        message: err instanceof z.ZodError ? "Invalid URL" : "Failed to scrape URL",
      });
    }
  });

  app.get(api.posts.list.path, requireAuth, async (req, res) => {
    try {
        const filters = api.posts.list.input?.parse(req.query);
        const posts = await storage.getPosts(getUserId(req), filters);
        res.json(posts);
    } catch (e) {
        console.error("List posts error:", e);
        res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post(api.posts.create.path, requireAuth, async (req, res) => {
    try {
      const input = api.posts.create.input.parse(req.body);
      const postData: any = { ...input, userId: getUserId(req) };

      if (input.originalUrl) {
        if (input.platform && input.platform !== "linkedin") {
          postData.platform = input.platform;
        }

        const needsScrape = !input.imageUrl;
        const needsPlatformDetection = !postData.platform || postData.platform === "linkedin";

        if (needsScrape || needsPlatformDetection) {
          try {
            const scraped = await scrapePost(input.originalUrl);
            if (scraped.platform) postData.platform = scraped.platform;
            if (needsScrape) {
              if (scraped.imageUrl) postData.imageUrl = scraped.imageUrl;
              if (scraped.authorName && !postData.authorName) postData.authorName = scraped.authorName;
              if (scraped.authorUrl && !postData.authorUrl) postData.authorUrl = scraped.authorUrl;
              if (scraped.content && postData.content.length < 50) postData.content = scraped.content;
            }
          } catch (e) {
            console.log("Scraping failed for post, continuing without:", (e as Error).message);
            if (needsPlatformDetection) {
              postData.platform = detectPlatform(input.originalUrl);
            }
          }
        }
      }

      const post = await storage.createPost(postData);
      res.status(201).json(post);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get(api.posts.get.path, requireAuth, async (req, res) => {
    const post = await storage.getPost(Number(req.params.id));
    if (!post || post.userId !== getUserId(req)) {
      return res.status(404).json({ message: 'Post not found' });
    }
    res.json(post);
  });

  app.patch(api.posts.update.path, requireAuth, async (req, res) => {
     try {
        const id = Number(req.params.id);
        const existing = await storage.getPost(id);
        if (!existing || existing.userId !== getUserId(req)) {
            return res.status(404).json({ message: 'Post not found' });
        }
        
        const input = api.posts.update.input.parse(req.body);
        const updated = await storage.updatePost(id, input);
        res.json(updated);
     } catch (err) {
        if (err instanceof z.ZodError) {
            return res.status(400).json({
              message: err.errors[0].message,
              field: err.errors[0].path.join('.'),
            });
        }
        res.status(500).json({ message: "Internal server error" });
     }
  });

  app.delete(api.posts.delete.path, requireAuth, async (req, res) => {
    const id = Number(req.params.id);
    const existing = await storage.getPost(id);
    if (!existing || existing.userId !== getUserId(req)) {
        return res.status(404).json({ message: 'Post not found' });
    }
    await storage.deletePost(id);
    res.status(204).send();
  });

  // Bulk Import Endpoint (for LinkedIn data export CSV/JSON)
  app.post(api.posts.bulkImport.path, requireAuth, async (req, res) => {
    try {
      const { posts: importPosts } = api.posts.bulkImport.input.parse(req.body);
      const userId = getUserId(req);

      let imported = 0;
      let skipped = 0;
      const toInsert: any[] = [];

      for (const p of importPosts) {
        if (p.originalUrl) {
          const existing = await storage.findPostByUrl(userId, p.originalUrl);
          if (existing) {
            skipped++;
            continue;
          }
        }
        toInsert.push({
          userId,
          content: p.content,
          originalUrl: p.originalUrl || null,
          summary: p.summary || null,
          authorName: p.authorName || null,
          authorUrl: p.authorUrl || null,
          publishedAt: p.publishedAt ? new Date(p.publishedAt) : null,
          tags: p.tags || [],
          platform: "linkedin",
        });
      }

      if (toInsert.length > 0) {
        await storage.createPosts(toInsert);
        imported = toInsert.length;
      }

      res.status(201).json({ imported, skipped });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      console.error("Bulk import error:", err);
      res.status(500).json({ message: "Failed to import posts" });
    }
  });

  // Chrome Extension Push Endpoint (uses session auth)
  app.post(api.posts.extensionPush.path, requireAuth, async (req, res) => {
    try {
      const { posts: extPosts } = api.posts.extensionPush.input.parse(req.body);
      const userId = getUserId(req);

      let imported = 0;
      let skipped = 0;
      const toInsert: any[] = [];

      for (const p of extPosts) {
        if (p.originalUrl) {
          const existing = await storage.findPostByUrl(userId, p.originalUrl);
          if (existing) {
            skipped++;
            continue;
          }
        }
        toInsert.push({
          userId,
          content: p.content,
          originalUrl: p.originalUrl || null,
          authorName: p.authorName || null,
          authorUrl: p.authorUrl || null,
          publishedAt: p.publishedAt ? new Date(p.publishedAt) : null,
          tags: [],
          platform: "linkedin",
        });
      }

      if (toInsert.length > 0) {
        await storage.createPosts(toInsert);
        imported = toInsert.length;
      }

      res.status(201).json({ imported, skipped });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      console.error("Extension push error:", err);
      res.status(500).json({ message: "Failed to import posts from extension" });
    }
  });

  // Collections CRUD
  app.get(api.collections.list.path, requireAuth, async (req, res) => {
    try {
      const colls = await storage.getCollections(getUserId(req));
      res.json(colls);
    } catch (e) {
      console.error("List collections error:", e);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post(api.collections.create.path, requireAuth, async (req, res) => {
    try {
      const input = api.collections.create.input.parse(req.body);
      const collection = await storage.createCollection({ ...input, userId: getUserId(req) });
      res.status(201).json(collection);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch(api.collections.update.path, requireAuth, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const existing = await storage.getCollection(id);
      if (!existing || existing.userId !== getUserId(req)) {
        return res.status(404).json({ message: 'Collection not found' });
      }
      const input = api.collections.update.input.parse(req.body);
      const updated = await storage.updateCollection(id, input);
      res.json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete(api.collections.delete.path, requireAuth, async (req, res) => {
    const id = Number(req.params.id);
    const existing = await storage.getCollection(id);
    if (!existing || existing.userId !== getUserId(req)) {
      return res.status(404).json({ message: 'Collection not found' });
    }
    await storage.deleteCollection(id);
    res.status(204).send();
  });

  app.post(api.collections.addPost.path, requireAuth, async (req, res) => {
    try {
      const collectionId = Number(req.params.id);
      const { postId } = api.collections.addPost.input.parse(req.body);
      const collection = await storage.getCollection(collectionId);
      if (!collection || collection.userId !== getUserId(req)) {
        return res.status(404).json({ message: 'Collection not found' });
      }
      const post = await storage.getPost(postId);
      if (!post || post.userId !== getUserId(req)) {
        return res.status(404).json({ message: 'Post not found' });
      }
      await storage.addPostToCollection(postId, collectionId);
      res.status(201).json({ message: "Post added to collection" });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/collections/:id/posts/:postId", requireAuth, async (req, res) => {
    const collectionId = Number(req.params.id);
    const postId = Number(req.params.postId);
    const collection = await storage.getCollection(collectionId);
    if (!collection || collection.userId !== getUserId(req)) {
      return res.status(404).json({ message: 'Collection not found' });
    }
    await storage.removePostFromCollection(postId, collectionId);
    res.status(204).send();
  });

  app.get(api.collections.getPosts.path, requireAuth, async (req, res) => {
    try {
      const collectionId = Number(req.params.id);
      const collection = await storage.getCollection(collectionId);
      if (!collection || collection.userId !== getUserId(req)) {
        return res.status(404).json({ message: 'Collection not found' });
      }
      const collPosts = await storage.getCollectionPosts(collectionId);
      res.json(collPosts);
    } catch (e) {
      console.error("Get collection posts error:", e);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/posts/:postId/collections", requireAuth, async (req, res) => {
    try {
      const postId = Number(req.params.postId);
      const post = await storage.getPost(postId);
      if (!post || post.userId !== getUserId(req)) {
        return res.status(404).json({ message: 'Post not found' });
      }
      const colls = await storage.getPostCollections(postId);
      res.json(colls);
    } catch (e) {
      console.error("Get post collections error:", e);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // AI Search Endpoint (RAG-lite)
  app.post(api.posts.search.path, requireAuth, async (req, res) => {
    try {
        const { query } = api.posts.search.input.parse(req.body);
        const userId = getUserId(req);

        // 1. Retrieve relevant docs
        const sources = await storage.searchPosts(userId, query);

        if (sources.length === 0) {
            return res.json({ 
                answer: "I couldn't find any saved posts matching your query.", 
                sources: [] 
            });
        }

        // 2. Generate Answer
        const context = sources.map(p => `[Title: ${p.summary || 'No Title'}]\n[Content: ${p.content}]\n[Author: ${p.authorName || 'Unknown'}]`).join("\n---\n");
        
        const response = await openai.chat.completions.create({
            model: "gpt-5.2",
            messages: [
                { role: "system", content: "You are a helpful assistant that answers questions based on the user's saved LinkedIn posts. Use the provided context to answer the question. If the answer isn't in the context, say so." },
                { role: "user", content: `Context:\n${context}\n\nQuestion: ${query}` }
            ],
            max_completion_tokens: 500
        });

        const answer = response.choices[0].message.content || "I couldn't generate an answer.";

        res.json({ answer, sources });

    } catch (e) {
        console.error("AI Search Error:", e);
        res.status(500).json({ message: "Failed to perform AI search" });
    }
  });

  // Mount Public API v1
  app.use("/api/v1", createV1Router());

  // API Key Management (session-authenticated)
  app.get("/api/api-keys", requireAuth, async (req, res) => {
    try {
      const keys = await storage.getApiKeys(getUserId(req));
      res.json(keys.map(k => ({
        id: k.id,
        name: k.name,
        keyPrefix: k.keyPrefix,
        isActive: k.isActive,
        createdAt: k.createdAt,
        lastUsedAt: k.lastUsedAt,
      })));
    } catch (e) {
      console.error("List API keys error:", e);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/api-keys", requireAuth, async (req, res) => {
    try {
      const { name } = z.object({ name: z.string().min(1, "Name is required").max(100) }).parse(req.body);
      const userId = getUserId(req);
      const { fullKey, keyHash, keyPrefix } = generateApiKey();
      const apiKey = await storage.createApiKey({ userId, keyHash, keyPrefix, name });
      res.status(201).json({
        id: apiKey.id,
        name: apiKey.name,
        key: fullKey,
        keyPrefix,
        createdAt: apiKey.createdAt,
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      console.error("Create API key error:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/api-keys/:id", requireAuth, async (req, res) => {
    try {
      const id = Number(req.params.id);
      await storage.revokeApiKey(id, getUserId(req));
      res.status(204).send();
    } catch (e) {
      console.error("Revoke API key error:", e);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  return httpServer;
}
