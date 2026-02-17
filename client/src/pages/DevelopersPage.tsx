import { motion } from "framer-motion";
import { ArrowLeft, Bookmark, Key } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Link } from "wouter";

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="bg-muted rounded-md p-4 overflow-x-auto text-sm font-mono leading-relaxed">
      <code>{children}</code>
    </pre>
  );
}

function MethodBadge({ method }: { method: string }) {
  const variant =
    method === "DELETE"
      ? "destructive"
      : method === "POST"
        ? "default"
        : "outline";
  return (
    <Badge variant={variant} data-testid={`badge-method-${method.toLowerCase()}`}>
      {method}
    </Badge>
  );
}

interface EndpointProps {
  method: string;
  path: string;
  description: string;
  params?: { name: string; description: string }[];
  bodyFields?: { name: string; description: string }[];
  curlExample: string;
  responseExample: string;
  responseNote?: string;
}

function EndpointCard({
  method,
  path,
  description,
  params,
  bodyFields,
  curlExample,
  responseExample,
  responseNote,
}: EndpointProps) {
  return (
    <Card className="p-6" data-testid={`card-endpoint-${method.toLowerCase()}-${path.replace(/[/:]/g, "-")}`}>
      <div className="flex items-center gap-3 flex-wrap mb-3">
        <MethodBadge method={method} />
        <code className="text-sm font-mono font-semibold text-foreground">{path}</code>
      </div>
      <p className="text-sm text-muted-foreground mb-4">{description}</p>

      {params && params.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-semibold text-foreground mb-2">Query Parameters</h4>
          <div className="space-y-1">
            {params.map((p) => (
              <div key={p.name} className="flex gap-2 text-sm">
                <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{p.name}</code>
                <span className="text-muted-foreground">{p.description}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {bodyFields && bodyFields.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-semibold text-foreground mb-2">Request Body</h4>
          <div className="space-y-1">
            {bodyFields.map((f) => (
              <div key={f.name} className="flex gap-2 text-sm">
                <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{f.name}</code>
                <span className="text-muted-foreground">{f.description}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mb-4">
        <h4 className="text-sm font-semibold text-foreground mb-2">Example Request</h4>
        <CodeBlock>{curlExample}</CodeBlock>
      </div>

      <div>
        <h4 className="text-sm font-semibold text-foreground mb-2">
          {responseNote ? responseNote : "Example Response"}
        </h4>
        <CodeBlock>{responseExample}</CodeBlock>
      </div>
    </Card>
  );
}

const BASE_URL = typeof window !== "undefined" ? window.location.origin : "https://www.super-brain.app";

const endpoints: EndpointProps[] = [
  {
    method: "GET",
    path: "/api/v1/posts",
    description: "List posts in your library. Supports filtering by search query, tags, platform, and collection.",
    params: [
      { name: "search", description: "Full-text search query" },
      { name: "tags", description: "Filter by tag name" },
      { name: "platform", description: "Filter by platform (e.g. linkedin, substack)" },
      { name: "collection", description: "Filter by collection ID" },
      { name: "limit", description: "Number of results (1-100, default 50)" },
      { name: "offset", description: "Pagination offset (default 0)" },
    ],
    curlExample: `curl -X GET "${BASE_URL}/api/v1/posts?limit=10&search=productivity" \\
  -H "Authorization: Bearer sb_your_api_key_here"`,
    responseExample: `{
  "data": [
    {
      "id": 1,
      "content": "Great insights on productivity...",
      "authorName": "Jane Doe",
      "platform": "linkedin",
      "tags": ["productivity", "tips"],
      "createdAt": "2026-01-15T10:30:00Z"
    }
  ],
  "meta": {
    "limit": 10,
    "offset": 0
  }
}`,
  },
  {
    method: "GET",
    path: "/api/v1/posts/:id",
    description: "Retrieve a single post by its ID.",
    curlExample: `curl -X GET "${BASE_URL}/api/v1/posts/42" \\
  -H "Authorization: Bearer sb_your_api_key_here"`,
    responseExample: `{
  "data": {
    "id": 42,
    "content": "An insightful post about AI...",
    "originalUrl": "https://linkedin.com/posts/...",
    "summary": "A brief summary of the post.",
    "authorName": "John Smith",
    "platform": "linkedin",
    "tags": ["ai", "technology"],
    "createdAt": "2026-02-01T08:00:00Z"
  }
}`,
  },
  {
    method: "POST",
    path: "/api/v1/posts",
    description: "Create a new post in your library.",
    bodyFields: [
      { name: "content", description: "Post content (required)" },
      { name: "originalUrl", description: "Original source URL" },
      { name: "summary", description: "Brief summary of the post" },
      { name: "authorName", description: "Author display name" },
      { name: "authorUrl", description: "Author profile URL" },
      { name: "imageUrl", description: "Image URL for the post" },
      { name: "tags", description: "Array of tag strings" },
      { name: "platform", description: "Source platform name" },
      { name: "publishedAt", description: "Original publish date (ISO 8601)" },
      { name: "autoScrape", description: "Auto-scrape the originalUrl for metadata (boolean)" },
    ],
    curlExample: `curl -X POST "${BASE_URL}/api/v1/posts" \\
  -H "Authorization: Bearer sb_your_api_key_here" \\
  -H "Content-Type: application/json" \\
  -d '{
    "content": "This is a great article about...",
    "originalUrl": "https://example.com/article",
    "tags": ["reading", "bookmarks"],
    "autoScrape": true
  }'`,
    responseExample: `{
  "data": {
    "id": 99,
    "content": "This is a great article about...",
    "originalUrl": "https://example.com/article",
    "tags": ["reading", "bookmarks"],
    "createdAt": "2026-02-17T12:00:00Z"
  }
}`,
  },
  {
    method: "DELETE",
    path: "/api/v1/posts/:id",
    description: "Permanently delete a post from your library.",
    curlExample: `curl -X DELETE "${BASE_URL}/api/v1/posts/42" \\
  -H "Authorization: Bearer sb_your_api_key_here"`,
    responseExample: `204 No Content`,
    responseNote: "Response",
  },
  {
    method: "POST",
    path: "/api/v1/search",
    description: "Perform an AI-powered semantic search across your saved content. Returns a natural language answer along with source posts.",
    bodyFields: [
      { name: "query", description: "Natural language search query (required)" },
    ],
    curlExample: `curl -X POST "${BASE_URL}/api/v1/search" \\
  -H "Authorization: Bearer sb_your_api_key_here" \\
  -H "Content-Type: application/json" \\
  -d '{ "query": "What are the best practices for remote team management?" }'`,
    responseExample: `{
  "data": {
    "answer": "Based on your saved content, the best practices for remote team management include...",
    "sources": [
      {
        "id": 12,
        "content": "Remote work requires clear communication...",
        "authorName": "Sarah Lee",
        "tags": ["remote-work", "management"]
      }
    ]
  }
}`,
  },
  {
    method: "GET",
    path: "/api/v1/collections",
    description: "List all collections in your library.",
    curlExample: `curl -X GET "${BASE_URL}/api/v1/collections" \\
  -H "Authorization: Bearer sb_your_api_key_here"`,
    responseExample: `{
  "data": [
    {
      "id": 1,
      "name": "Product Ideas",
      "description": "Collection of product inspiration",
      "postCount": 15
    },
    {
      "id": 2,
      "name": "Engineering",
      "description": null,
      "postCount": 8
    }
  ]
}`,
  },
  {
    method: "POST",
    path: "/api/v1/scrape",
    description: "Scrape a URL to extract its content, metadata, and images. Useful for enriching posts with data from external sources.",
    bodyFields: [
      { name: "url", description: "The URL to scrape (required)" },
    ],
    curlExample: `curl -X POST "${BASE_URL}/api/v1/scrape" \\
  -H "Authorization: Bearer sb_your_api_key_here" \\
  -H "Content-Type: application/json" \\
  -d '{ "url": "https://example.com/blog/interesting-article" }'`,
    responseExample: `{
  "data": {
    "title": "An Interesting Article",
    "content": "The full text content of the article...",
    "author": "Author Name",
    "imageUrl": "https://example.com/og-image.jpg",
    "publishedAt": "2026-01-10T09:00:00Z"
  }
}`,
  },
];

export default function DevelopersPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 sticky top-0 z-[1000] bg-background/95 backdrop-blur">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-4 flex-wrap">
          <Link href="/">
            <Button variant="ghost" size="icon" data-testid="button-back-home">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <div className="bg-primary p-1.5 rounded-md">
              <Bookmark className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="text-lg font-semibold tracking-tight">superBrain</span>
          </div>
          <div className="ml-auto">
            <Link href="/api-keys">
              <Button variant="outline" size="sm" data-testid="button-manage-api-keys">
                <Key className="w-4 h-4 mr-2" />
                Manage API Keys
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <h1 className="text-4xl font-bold tracking-tight mb-2" data-testid="text-developers-title">
            API Documentation
          </h1>
          <p className="text-lg text-muted-foreground mb-12">
            Build integrations with the superBrain REST API.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="space-y-12"
        >
          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-3" data-testid="text-section-introduction">
              Introduction
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed mb-3">
              superBrain provides a REST API for programmatic access to your saved content library.
              You can create, retrieve, search, and manage posts, collections, and more through
              standard HTTP requests.
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              API keys can be generated from your{" "}
              <Link href="/" className="text-primary underline" data-testid="link-dashboard">
                dashboard
              </Link>{" "}
              under the API Keys section. Each key is scoped to your account and should be kept
              confidential.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-3" data-testid="text-section-authentication">
              Authentication
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">
              All API requests must include a valid API key in the Authorization header using
              Bearer token authentication.
            </p>
            <CodeBlock>{`Authorization: Bearer sb_your_api_key_here`}</CodeBlock>
            <p className="text-sm text-muted-foreground leading-relaxed mt-4">
              Requests without a valid API key will receive a 401 Unauthorized response.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-3" data-testid="text-section-rate-limits">
              Rate Limits
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">
              API requests are limited to 100 requests per minute per API key. Rate limit
              information is included in the response headers of every request.
            </p>
            <div className="space-y-1 mb-4">
              {[
                { header: "X-RateLimit-Limit", desc: "Maximum requests allowed per minute" },
                { header: "X-RateLimit-Remaining", desc: "Remaining requests in the current window" },
                { header: "X-RateLimit-Reset", desc: "Unix timestamp when the rate limit resets" },
              ].map((item) => (
                <div key={item.header} className="flex gap-2 text-sm">
                  <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{item.header}</code>
                  <span className="text-muted-foreground">{item.desc}</span>
                </div>
              ))}
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              When the rate limit is exceeded, the API returns a 429 Too Many Requests response.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-6" data-testid="text-section-endpoints">
              Endpoints
            </h2>
            <div className="space-y-6">
              {endpoints.map((ep, i) => (
                <motion.div
                  key={`${ep.method}-${ep.path}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: 0.15 + i * 0.04 }}
                >
                  <EndpointCard {...ep} />
                </motion.div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-3" data-testid="text-section-errors">
              Error Responses
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">
              When an error occurs, the API returns a JSON response with an error code and a
              human-readable message.
            </p>
            <CodeBlock>{`{
  "error": "not_found",
  "message": "The requested post does not exist."
}`}</CodeBlock>
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-foreground mb-3">Common Status Codes</h3>
              <div className="space-y-2">
                {[
                  { code: "400", label: "Bad Request", desc: "Invalid or missing request parameters" },
                  { code: "401", label: "Unauthorized", desc: "Missing or invalid API key" },
                  { code: "404", label: "Not Found", desc: "The requested resource does not exist" },
                  { code: "429", label: "Too Many Requests", desc: "Rate limit exceeded" },
                  { code: "500", label: "Internal Server Error", desc: "An unexpected error occurred on the server" },
                ].map((item) => (
                  <div key={item.code} className="flex items-start gap-3 text-sm">
                    <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded shrink-0">
                      {item.code}
                    </code>
                    <div>
                      <span className="font-medium text-foreground">{item.label}</span>
                      <span className="text-muted-foreground"> -- {item.desc}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </motion.div>
      </main>
    </div>
  );
}
