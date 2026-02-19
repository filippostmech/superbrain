import { pgTable, text, serial, integer, boolean, timestamp, jsonb, primaryKey, real, uniqueIndex } from "drizzle-orm/pg-core";
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

export const apiKeys = pgTable("api_keys", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  keyHash: text("key_hash").notNull().unique(),
  keyPrefix: text("key_prefix").notNull(),
  name: text("name").notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  lastUsedAt: timestamp("last_used_at"),
});

export const insertApiKeySchema = createInsertSchema(apiKeys).omit({
  id: true,
  userId: true,
  keyHash: true,
  keyPrefix: true,
  isActive: true,
  createdAt: true,
  lastUsedAt: true,
});

export type ApiKey = typeof apiKeys.$inferSelect;
export type InsertApiKey = z.infer<typeof insertApiKeySchema>;

export const apiKeysRelations = relations(apiKeys, ({ one }) => ({
  user: one(users, {
    fields: [apiKeys.userId],
    references: [users.id],
  }),
}));

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

// Knowledge Graph tables
export const entities = pgTable("entities", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  canonicalName: text("canonical_name").notNull(),
  type: text("type").notNull(),
  description: text("description"),
  mentionCount: integer("mention_count").default(1),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (t) => [
  uniqueIndex("entities_user_canonical_type_idx").on(t.userId, t.canonicalName, t.type),
]);

export const entityLinks = pgTable("entity_links", {
  id: serial("id").primaryKey(),
  entityId: integer("entity_id").notNull().references(() => entities.id, { onDelete: "cascade" }),
  postId: integer("post_id").notNull().references(() => posts.id, { onDelete: "cascade" }),
  confidence: real("confidence").default(1.0),
  context: text("context"),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => [
  uniqueIndex("entity_links_entity_post_idx").on(t.entityId, t.postId),
]);

export const entityEdges = pgTable("entity_edges", {
  id: serial("id").primaryKey(),
  sourceEntityId: integer("source_entity_id").notNull().references(() => entities.id, { onDelete: "cascade" }),
  targetEntityId: integer("target_entity_id").notNull().references(() => entities.id, { onDelete: "cascade" }),
  relationType: text("relation_type").default("co-occurrence"),
  weight: integer("weight").default(1),
  userId: text("user_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => [
  uniqueIndex("entity_edges_source_target_user_idx").on(t.sourceEntityId, t.targetEntityId, t.userId),
]);

export const extractionStatus = pgTable("extraction_status", {
  postId: integer("post_id").primaryKey().references(() => posts.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("pending"),
  processedAt: timestamp("processed_at"),
  error: text("error"),
});

export type Entity = typeof entities.$inferSelect;
export type InsertEntity = typeof entities.$inferInsert;
export type EntityLink = typeof entityLinks.$inferSelect;
export type EntityEdge = typeof entityEdges.$inferSelect;
export type ExtractionStatus = typeof extractionStatus.$inferSelect;

export const entitiesRelations = relations(entities, ({ one, many }) => ({
  user: one(users, { fields: [entities.userId], references: [users.id] }),
  entityLinks: many(entityLinks),
  sourceEdges: many(entityEdges, { relationName: "sourceEdges" }),
  targetEdges: many(entityEdges, { relationName: "targetEdges" }),
}));

export const entityLinksRelations = relations(entityLinks, ({ one }) => ({
  entity: one(entities, { fields: [entityLinks.entityId], references: [entities.id] }),
  post: one(posts, { fields: [entityLinks.postId], references: [posts.id] }),
}));

export const entityEdgesRelations = relations(entityEdges, ({ one }) => ({
  sourceEntity: one(entities, { fields: [entityEdges.sourceEntityId], references: [entities.id], relationName: "sourceEdges" }),
  targetEntity: one(entities, { fields: [entityEdges.targetEntityId], references: [entities.id], relationName: "targetEdges" }),
  user: one(users, { fields: [entityEdges.userId], references: [users.id] }),
}));
