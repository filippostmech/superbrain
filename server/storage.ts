import { db } from "./db";
import { posts, type Post, type InsertPost } from "@shared/schema";

type InsertPostWithUser = InsertPost & { userId: string };
import { eq, desc, ilike, or, and, arrayContains } from "drizzle-orm";
import { sql } from "drizzle-orm";

export interface IStorage {
  getPosts(userId: string, filters?: { search?: string; tags?: string; limit?: number; offset?: number }): Promise<Post[]>;
  getPost(id: number): Promise<Post | undefined>;
  createPost(post: InsertPostWithUser): Promise<Post>;
  createPosts(postsData: InsertPostWithUser[]): Promise<Post[]>;
  updatePost(id: number, updates: Partial<InsertPost>): Promise<Post>;
  deletePost(id: number): Promise<void>;
  searchPosts(userId: string, query: string): Promise<Post[]>;
  findPostByUrl(userId: string, url: string): Promise<Post | undefined>;
}

export class DatabaseStorage implements IStorage {
  async getPosts(userId: string, filters?: { search?: string; tags?: string; limit?: number; offset?: number }): Promise<Post[]> {
    let query = db.select().from(posts).where(eq(posts.userId, userId)).orderBy(desc(posts.createdAt));

    if (filters?.search) {
      const searchLower = `%${filters.search.toLowerCase()}%`;
      query = query.where(
        or(
          ilike(posts.content, searchLower),
          ilike(posts.summary, searchLower),
          ilike(posts.authorName, searchLower)
        )
      ) as any;
    }

    if (filters?.tags) {
       // Simple tag filtering - ideally strictly typed but jsonb is flexible
       // This assumes tags is stored as a string array in JSONB
       query = query.where(sql`${posts.tags} ? ${filters.tags}`) as any;
    }

    if (filters?.limit) {
      query = query.limit(filters.limit) as any;
    }
    
    if (filters?.offset) {
      query = query.offset(filters.offset) as any;
    }

    return await query;
  }

  async getPost(id: number): Promise<Post | undefined> {
    const [post] = await db.select().from(posts).where(eq(posts.id, id));
    return post;
  }

  async createPost(post: InsertPostWithUser): Promise<Post> {
    const [newPost] = await db.insert(posts).values(post).returning();
    return newPost;
  }

  async createPosts(postsData: InsertPostWithUser[]): Promise<Post[]> {
    if (postsData.length === 0) return [];
    const newPosts = await db.insert(posts).values(postsData).returning();
    return newPosts;
  }

  async findPostByUrl(userId: string, url: string): Promise<Post | undefined> {
    const results = await db.select().from(posts)
      .where(
        and(eq(posts.userId, userId), eq(posts.originalUrl, url))
      );
    return results[0];
  }

  async updatePost(id: number, updates: Partial<InsertPost>): Promise<Post> {
    const [updatedPost] = await db.update(posts).set({ ...updates, updatedAt: new Date() }).where(eq(posts.id, id)).returning();
    return updatedPost;
  }

  async deletePost(id: number): Promise<void> {
    await db.delete(posts).where(eq(posts.id, id));
  }
  
  async searchPosts(userId: string, query: string): Promise<Post[]> {
    // Basic semantic-ish search using text matching for MVP. 
    // In a full version, we'd use pgvector embeddings here.
    const searchLower = `%${query.toLowerCase()}%`;
    return await db.select().from(posts)
        .where(
            or(
                ilike(posts.content, searchLower),
                ilike(posts.summary, searchLower),
                ilike(posts.tags, searchLower) // crude search in jsonb string representation
            )
        )
        .limit(10);
  }
}

export const storage = new DatabaseStorage();
