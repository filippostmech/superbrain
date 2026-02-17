import { db } from "./db";
import { posts, collections, postCollections, type Post, type InsertPost, type Collection, type InsertCollection } from "@shared/schema";

type InsertPostWithUser = InsertPost & { userId: string };
import { eq, desc, ilike, or, and, arrayContains, count } from "drizzle-orm";
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
  getCollections(userId: string): Promise<(Collection & { postCount: number })[]>;
  getCollection(id: number): Promise<Collection | undefined>;
  createCollection(collection: InsertCollection & { userId: string }): Promise<Collection>;
  updateCollection(id: number, updates: Partial<InsertCollection>): Promise<Collection>;
  deleteCollection(id: number): Promise<void>;
  addPostToCollection(postId: number, collectionId: number): Promise<void>;
  removePostFromCollection(postId: number, collectionId: number): Promise<void>;
  getCollectionPosts(collectionId: number): Promise<Post[]>;
  getPostCollections(postId: number): Promise<Collection[]>;
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
    const searchLower = `%${query.toLowerCase()}%`;
    return await db.select().from(posts)
        .where(
            or(
                ilike(posts.content, searchLower),
                ilike(posts.summary, searchLower),
                ilike(posts.tags, searchLower)
            )
        )
        .limit(10);
  }

  async getCollections(userId: string): Promise<(Collection & { postCount: number })[]> {
    const results = await db
      .select({
        id: collections.id,
        userId: collections.userId,
        name: collections.name,
        description: collections.description,
        createdAt: collections.createdAt,
        postCount: count(postCollections.postId),
      })
      .from(collections)
      .leftJoin(postCollections, eq(collections.id, postCollections.collectionId))
      .where(eq(collections.userId, userId))
      .groupBy(collections.id)
      .orderBy(desc(collections.createdAt));
    return results.map(r => ({ ...r, postCount: Number(r.postCount) }));
  }

  async getCollection(id: number): Promise<Collection | undefined> {
    const [collection] = await db.select().from(collections).where(eq(collections.id, id));
    return collection;
  }

  async createCollection(collection: InsertCollection & { userId: string }): Promise<Collection> {
    const [newCollection] = await db.insert(collections).values(collection).returning();
    return newCollection;
  }

  async updateCollection(id: number, updates: Partial<InsertCollection>): Promise<Collection> {
    const [updated] = await db.update(collections).set(updates).where(eq(collections.id, id)).returning();
    return updated;
  }

  async deleteCollection(id: number): Promise<void> {
    await db.delete(collections).where(eq(collections.id, id));
  }

  async addPostToCollection(postId: number, collectionId: number): Promise<void> {
    await db.insert(postCollections).values({ postId, collectionId }).onConflictDoNothing();
  }

  async removePostFromCollection(postId: number, collectionId: number): Promise<void> {
    await db.delete(postCollections).where(
      and(eq(postCollections.postId, postId), eq(postCollections.collectionId, collectionId))
    );
  }

  async getCollectionPosts(collectionId: number): Promise<Post[]> {
    const results = await db
      .select({ post: posts })
      .from(postCollections)
      .innerJoin(posts, eq(postCollections.postId, posts.id))
      .where(eq(postCollections.collectionId, collectionId))
      .orderBy(desc(posts.createdAt));
    return results.map(r => r.post);
  }

  async getPostCollections(postId: number): Promise<Collection[]> {
    const results = await db
      .select({ collection: collections })
      .from(postCollections)
      .innerJoin(collections, eq(postCollections.collectionId, collections.id))
      .where(eq(postCollections.postId, postId));
    return results.map(r => r.collection);
  }
}

export const storage = new DatabaseStorage();
