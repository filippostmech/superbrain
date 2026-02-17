import { pgTable, text, serial, integer, boolean, timestamp, jsonb, primaryKey } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Export Auth and Chat models
export * from "./models/auth";
export * from "./models/chat";

import { users } from "./models/auth";

// Application specific tables
export const posts = pgTable("posts", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  originalUrl: text("original_url"),
  content: text("content").notNull(),
  summary: text("summary"),
  platform: text("platform").default("linkedin"),
  authorName: text("author_name"),
  authorUrl: text("author_url"),
  imageUrl: text("image_url"),
  publishedAt: timestamp("published_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  tags: jsonb("tags").$type<string[]>().default([]),
  isFavorite: boolean("is_favorite").default(false),
});

export const insertPostSchema = createInsertSchema(posts).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true
});

export type Post = typeof posts.$inferSelect;
export type InsertPost = z.infer<typeof insertPostSchema>;

export const collections = pgTable("collections", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const postCollections = pgTable("post_collections", {
  postId: integer("post_id").notNull().references(() => posts.id, { onDelete: "cascade" }),
  collectionId: integer("collection_id").notNull().references(() => collections.id, { onDelete: "cascade" }),
}, (t) => [
  primaryKey({ columns: [t.postId, t.collectionId] }),
]);

export const insertCollectionSchema = createInsertSchema(collections).omit({
  id: true,
  userId: true,
  createdAt: true,
});

export type Collection = typeof collections.$inferSelect;
export type InsertCollection = z.infer<typeof insertCollectionSchema>;

export const postsRelations = relations(posts, ({ one, many }) => ({
  user: one(users, {
    fields: [posts.userId],
    references: [users.id],
  }),
  postCollections: many(postCollections),
}));

export const collectionsRelations = relations(collections, ({ one, many }) => ({
  user: one(users, {
    fields: [collections.userId],
    references: [users.id],
  }),
  postCollections: many(postCollections),
}));

export const postCollectionsRelations = relations(postCollections, ({ one }) => ({
  post: one(posts, {
    fields: [postCollections.postId],
    references: [posts.id],
  }),
  collection: one(collections, {
    fields: [postCollections.collectionId],
    references: [collections.id],
  }),
}));
