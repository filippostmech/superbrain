import OpenAI from "openai";
import { db } from "./db";
import { entities, entityLinks, entityEdges, extractionStatus, posts, type Post } from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

interface ExtractedEntity {
  name: string;
  type: "person" | "company" | "topic" | "technology";
  description?: string;
}

function canonicalize(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/['']/g, "'")
    .replace(/\s+/g, " ")
    .replace(/^the\s+/i, "")
    .replace(/,?\s*(inc|llc|ltd|corp|co)\.?$/i, "");
}

export async function extractEntitiesFromContent(content: string, authorName?: string | null): Promise<ExtractedEntity[]> {
  const truncated = content.slice(0, 4000);

  const prompt = `Analyze this professional content and extract key entities. Return a JSON array of objects with "name", "type", and "description" fields.

Entity types:
- "person": Named individuals mentioned (include the post author if known)
- "company": Companies, organizations, startups
- "topic": Business concepts, strategies, themes (e.g., "product-led growth", "remote work")
- "technology": Specific technologies, tools, frameworks, platforms (e.g., "GPT-4", "Kubernetes", "Figma")

Rules:
- Extract 3-15 entities maximum
- Use the most common/recognized form of each name
- Keep descriptions to one short sentence
- Only extract entities that are meaningfully discussed, not just briefly mentioned
- For topics, prefer specific concepts over generic ones (e.g., "AI pricing models" over "business")

Content:
${truncated}${authorName ? `\n\nPost author: ${authorName}` : ""}

Return ONLY a valid JSON array, no other text.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [{ role: "user", content: prompt }],
      max_completion_tokens: 1000,
      temperature: 0.3,
    });

    const raw = response.choices[0]?.message?.content?.trim() || "[]";
    const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(cleaned);

    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((e: any) => e.name && e.type && ["person", "company", "topic", "technology"].includes(e.type))
      .map((e: any) => ({
        name: String(e.name).trim(),
        type: e.type as ExtractedEntity["type"],
        description: e.description ? String(e.description).trim() : undefined,
      }));
  } catch (err) {
    console.error("Entity extraction failed:", err);
    return [];
  }
}

export async function processPostEntities(post: Post): Promise<void> {
  try {
    const extracted = await extractEntitiesFromContent(post.content, post.authorName);

    if (extracted.length === 0) {
      await db.insert(extractionStatus).values({
        postId: post.id,
        status: "completed",
        processedAt: new Date(),
      }).onConflictDoUpdate({
        target: extractionStatus.postId,
        set: { status: "completed", processedAt: new Date(), error: null },
      });
      return;
    }

    const entityIds: number[] = [];

    for (const ext of extracted) {
      const canonical = canonicalize(ext.name);

      const [existing] = await db.select().from(entities)
        .where(and(
          eq(entities.userId, post.userId),
          eq(entities.canonicalName, canonical),
          eq(entities.type, ext.type),
        ));

      let entityId: number;

      if (existing) {
        entityId = existing.id;
        await db.update(entities)
          .set({
            mentionCount: sql`${entities.mentionCount} + 1`,
            updatedAt: new Date(),
            description: ext.description && (!existing.description || ext.description.length > existing.description.length)
              ? ext.description
              : existing.description,
          })
          .where(eq(entities.id, existing.id));
      } else {
        const [newEntity] = await db.insert(entities).values({
          userId: post.userId,
          name: ext.name,
          canonicalName: canonical,
          type: ext.type,
          description: ext.description || null,
          mentionCount: 1,
        }).returning();
        entityId = newEntity.id;
      }

      entityIds.push(entityId);

      await db.insert(entityLinks).values({
        entityId,
        postId: post.id,
        confidence: 1.0,
      }).onConflictDoNothing();
    }

    for (let i = 0; i < entityIds.length; i++) {
      for (let j = i + 1; j < entityIds.length; j++) {
        const [srcId, tgtId] = entityIds[i] < entityIds[j]
          ? [entityIds[i], entityIds[j]]
          : [entityIds[j], entityIds[i]];

        const [existingEdge] = await db.select().from(entityEdges)
          .where(and(
            eq(entityEdges.sourceEntityId, srcId),
            eq(entityEdges.targetEntityId, tgtId),
            eq(entityEdges.userId, post.userId),
          ));

        if (existingEdge) {
          await db.update(entityEdges)
            .set({ weight: sql`${entityEdges.weight} + 1` })
            .where(eq(entityEdges.id, existingEdge.id));
        } else {
          await db.insert(entityEdges).values({
            sourceEntityId: srcId,
            targetEntityId: tgtId,
            relationType: "co-occurrence",
            weight: 1,
            userId: post.userId,
          }).onConflictDoNothing();
        }
      }
    }

    await db.insert(extractionStatus).values({
      postId: post.id,
      status: "completed",
      processedAt: new Date(),
    }).onConflictDoUpdate({
      target: extractionStatus.postId,
      set: { status: "completed", processedAt: new Date(), error: null },
    });

  } catch (err) {
    console.error(`Entity extraction failed for post ${post.id}:`, err);
    await db.insert(extractionStatus).values({
      postId: post.id,
      status: "failed",
      processedAt: new Date(),
      error: String(err),
    }).onConflictDoUpdate({
      target: extractionStatus.postId,
      set: { status: "failed", processedAt: new Date(), error: String(err) },
    });
  }
}

export async function backfillEntities(userId: string): Promise<{ processed: number; failed: number; skipped: number }> {
  const userPosts = await db.select().from(posts)
    .where(eq(posts.userId, userId));

  const statusRows = await db.select().from(extractionStatus);
  const processedPostIds = new Set(statusRows.filter(s => s.status === "completed").map(s => s.postId));

  let processed = 0;
  let failed = 0;
  let skipped = 0;

  for (const post of userPosts) {
    if (processedPostIds.has(post.id)) {
      skipped++;
      continue;
    }

    try {
      await processPostEntities(post);
      processed++;
    } catch {
      failed++;
    }
  }

  return { processed, failed, skipped };
}

export async function getKnowledgeGraph(userId: string) {
  const userEntities = await db.select().from(entities)
    .where(eq(entities.userId, userId));

  const edges = await db.select().from(entityEdges)
    .where(eq(entityEdges.userId, userId));

  const nodes = userEntities.map(e => ({
    id: e.id,
    name: e.name,
    type: e.type,
    description: e.description,
    mentionCount: e.mentionCount,
  }));

  const links = edges.map(e => ({
    source: e.sourceEntityId,
    target: e.targetEntityId,
    weight: e.weight,
    relationType: e.relationType,
  }));

  return { nodes, links };
}

export async function getEntityDetail(entityId: number, userId: string) {
  const [entity] = await db.select().from(entities)
    .where(and(eq(entities.id, entityId), eq(entities.userId, userId)));

  if (!entity) return null;

  const links = await db
    .select({ post: posts })
    .from(entityLinks)
    .innerJoin(posts, eq(entityLinks.postId, posts.id))
    .where(eq(entityLinks.entityId, entityId));

  const connectedEdges = await db.select().from(entityEdges)
    .where(and(
      eq(entityEdges.userId, userId),
      sql`(${entityEdges.sourceEntityId} = ${entityId} OR ${entityEdges.targetEntityId} = ${entityId})`,
    ));

  const connectedEntityIds = new Set<number>();
  connectedEdges.forEach(e => {
    if (e.sourceEntityId !== entityId) connectedEntityIds.add(e.sourceEntityId);
    if (e.targetEntityId !== entityId) connectedEntityIds.add(e.targetEntityId);
  });

  let connectedEntities: typeof userEntities = [];
  const userEntities = await db.select().from(entities)
    .where(eq(entities.userId, userId));
  connectedEntities = userEntities.filter(e => connectedEntityIds.has(e.id));

  return {
    entity,
    posts: links.map(l => l.post),
    connectedEntities: connectedEntities.map(e => ({
      id: e.id,
      name: e.name,
      type: e.type,
      weight: connectedEdges.find(edge =>
        (edge.sourceEntityId === e.id && edge.targetEntityId === entityId) ||
        (edge.targetEntityId === e.id && edge.sourceEntityId === entityId)
      )?.weight || 0,
    })),
  };
}

export async function getGraphStats(userId: string) {
  const userEntities = await db.select().from(entities)
    .where(eq(entities.userId, userId));

  const statusRows = await db.select().from(extractionStatus);
  const userPosts = await db.select({ id: posts.id }).from(posts)
    .where(eq(posts.userId, userId));

  const userPostIds = new Set(userPosts.map(p => p.id));
  const userStatuses = statusRows.filter(s => userPostIds.has(s.postId));

  const byType: Record<string, number> = {};
  userEntities.forEach(e => {
    byType[e.type] = (byType[e.type] || 0) + 1;
  });

  const edges = await db.select().from(entityEdges)
    .where(eq(entityEdges.userId, userId));

  return {
    totalEntities: userEntities.length,
    totalEdges: edges.length,
    totalPostsProcessed: userStatuses.filter(s => s.status === "completed").length,
    totalPostsPending: userPosts.length - userStatuses.filter(s => s.status === "completed").length,
    byType,
  };
}
