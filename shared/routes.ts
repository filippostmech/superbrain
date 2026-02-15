import { z } from 'zod';
import { insertPostSchema, posts } from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

export const api = {
  posts: {
    list: {
      method: 'GET' as const,
      path: '/api/posts' as const,
      input: z.object({
        search: z.string().optional(),
        tags: z.string().optional(),
        limit: z.coerce.number().optional(),
        offset: z.coerce.number().optional()
      }).optional(),
      responses: {
        200: z.array(z.custom<typeof posts.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/posts' as const,
      input: insertPostSchema,
      responses: {
        201: z.custom<typeof posts.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/posts/:id' as const,
      responses: {
        200: z.custom<typeof posts.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    update: {
      method: 'PATCH' as const,
      path: '/api/posts/:id' as const,
      input: insertPostSchema.partial(),
      responses: {
        200: z.custom<typeof posts.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/posts/:id' as const,
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
    search: {
      method: 'POST' as const,
      path: '/api/posts/search' as const,
      input: z.object({
        query: z.string(),
      }),
      responses: {
        200: z.object({
            answer: z.string(),
            sources: z.array(z.custom<typeof posts.$inferSelect>())
        }),
      },
    },
    bulkImport: {
      method: 'POST' as const,
      path: '/api/posts/import' as const,
      input: z.object({
        posts: z.array(z.object({
          content: z.string(),
          originalUrl: z.string().optional(),
          summary: z.string().optional(),
          authorName: z.string().optional(),
          authorUrl: z.string().optional(),
          publishedAt: z.string().optional(),
          tags: z.array(z.string()).optional(),
        })),
      }),
      responses: {
        201: z.object({
          imported: z.number(),
          skipped: z.number(),
        }),
        400: errorSchemas.validation,
      },
    },
    extensionPush: {
      method: 'POST' as const,
      path: '/api/posts/extension' as const,
      input: z.object({
        posts: z.array(z.object({
          content: z.string(),
          originalUrl: z.string().optional(),
          authorName: z.string().optional(),
          authorUrl: z.string().optional(),
          publishedAt: z.string().optional(),
        })),
      }),
      responses: {
        201: z.object({
          imported: z.number(),
          skipped: z.number(),
        }),
        400: errorSchemas.validation,
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
