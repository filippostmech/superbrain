import { useState, useCallback, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/hooks/use-theme";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import ForceGraph2D from "react-force-graph-2d";
import { forceX, forceY } from "d3-force";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft,
  Bookmark,
  Sun,
  Moon,
  Search,
  RefreshCw,
  X,
  ExternalLink,
  Users,
  Building2,
  Lightbulb,
  Cpu,
  Loader2,
  Network,
  Zap,
  Maximize,
} from "lucide-react";

interface GraphNode {
  id: number;
  name: string;
  type: string;
  description?: string;
  mentionCount: number;
  x?: number;
  y?: number;
}

interface GraphLink {
  source: number | GraphNode;
  target: number | GraphNode;
  weight: number;
  relationType: string;
}

interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

interface EntityDetail {
  entity: {
    id: number;
    name: string;
    type: string;
    description: string | null;
    mentionCount: number;
  };
  posts: Array<{
    id: number;
    content: string;
    summary: string | null;
    authorName: string | null;
    originalUrl: string | null;
    platform: string | null;
    createdAt: string;
  }>;
  connectedEntities: Array<{
    id: number;
    name: string;
    type: string;
    weight: number;
  }>;
}

interface GraphStats {
  totalEntities: number;
  totalEdges: number;
  totalPostsProcessed: number;
  totalPostsPending: number;
  byType: Record<string, number>;
}

const TYPE_COLORS: Record<string, string> = {
  person: "#3b82f6",
  company: "#8b5cf6",
  topic: "#f59e0b",
  technology: "#10b981",
};

const TYPE_ICONS: Record<string, typeof Users> = {
  person: Users,
  company: Building2,
  topic: Lightbulb,
  technology: Cpu,
};

const TYPE_LABELS: Record<string, string> = {
  person: "People",
  company: "Companies",
  topic: "Topics",
  technology: "Technologies",
};

export default function KnowledgeGraphPage() {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { toast } = useToast();
  const graphRef = useRef<any>(null);

  const [selectedEntityId, setSelectedEntityId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set(["person", "company", "topic", "technology"]));

  const { data: graphData, isLoading: graphLoading } = useQuery<GraphData>({
    queryKey: ["/api/knowledge-graph"],
  });

  const { data: stats } = useQuery<GraphStats>({
    queryKey: ["/api/knowledge-graph/stats"],
  });

  const { data: entityDetail, isLoading: detailLoading } = useQuery<EntityDetail>({
    queryKey: ["/api/knowledge-graph/entities", selectedEntityId],
    enabled: !!selectedEntityId,
  });

  const backfillMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/knowledge-graph/backfill");
      return res.json();
    },
    onSuccess: (data: { processed: number; failed: number; skipped: number }) => {
      toast({
        title: "Backfill complete",
        description: `Processed ${data.processed} posts, skipped ${data.skipped}, failed ${data.failed}.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/knowledge-graph"] });
      queryClient.invalidateQueries({ queryKey: ["/api/knowledge-graph/stats"] });
    },
    onError: () => {
      toast({ title: "Backfill failed", description: "Something went wrong.", variant: "destructive" });
    },
  });

  const filteredData = useCallback((): GraphData => {
    if (!graphData) return { nodes: [], links: [] };

    let nodes = graphData.nodes.filter(n => activeFilters.has(n.type));

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      nodes = nodes.filter(n => n.name.toLowerCase().includes(q));
    }

    const nodeIds = new Set(nodes.map(n => n.id));

    const links = graphData.links.filter(l => {
      const srcId = typeof l.source === "object" ? l.source.id : l.source;
      const tgtId = typeof l.target === "object" ? l.target.id : l.target;
      return nodeIds.has(srcId) && nodeIds.has(tgtId);
    });

    return { nodes, links };
  }, [graphData, activeFilters, searchQuery]);

  const toggleFilter = (type: string) => {
    setActiveFilters(prev => {
      const next = new Set(prev);
      if (next.has(type)) {
        if (next.size > 1) next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  };

  const hasFittedRef = useRef(false);

  useEffect(() => {
    hasFittedRef.current = false;
  }, [graphData, activeFilters, searchQuery]);

  useEffect(() => {
    const fg = graphRef.current;
    if (!fg) return;
    fg.d3Force("charge")?.strength(-40).distanceMax(200);
    fg.d3Force("link")?.distance(30);
    fg.d3Force("x", forceX(0).strength(0.15));
    fg.d3Force("y", forceY(0).strength(0.15));
    fg.d3ReheatSimulation();
  }, [graphData]);

  const handleZoomToFit = useCallback(() => {
    if (graphRef.current) {
      graphRef.current.zoomToFit(400, 60);
    }
  }, []);

  const handleEngineStop = useCallback(() => {
    if (graphRef.current && !hasFittedRef.current) {
      hasFittedRef.current = true;
      graphRef.current.zoomToFit(400, 60);
    }
  }, []);

  const handleNodeClick = useCallback((node: any) => {
    setSelectedEntityId(node.id);
    if (graphRef.current) {
      graphRef.current.centerAt(node.x, node.y, 500);
      graphRef.current.zoom(3, 500);
    }
  }, []);

  const nodeCanvasObject = useCallback((node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const label = node.name;
    const fontSize = Math.max(12 / globalScale, 2);
    const size = Math.max(4, Math.min(20, (node.mentionCount || 1) * 3));
    const isSelected = node.id === selectedEntityId;

    ctx.beginPath();
    ctx.arc(node.x, node.y, size, 0, 2 * Math.PI, false);
    ctx.fillStyle = TYPE_COLORS[node.type] || "#6b7280";
    ctx.fill();

    if (isSelected) {
      ctx.strokeStyle = theme === "dark" ? "#ffffff" : "#000000";
      ctx.lineWidth = 2 / globalScale;
      ctx.stroke();
    }

    if (globalScale > 1.2 || isSelected || size > 8) {
      ctx.font = `${isSelected ? "bold " : ""}${fontSize}px Inter, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = theme === "dark" ? "#e5e7eb" : "#1f2937";
      ctx.fillText(label, node.x, node.y + size + fontSize);
    }
  }, [selectedEntityId, theme]);

  const linkCanvasObject = useCallback((link: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const start = link.source;
    const end = link.target;
    if (!start || !end || typeof start.x !== "number") return;

    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    const opacity = Math.min(0.6, (link.weight || 1) * 0.15);
    ctx.strokeStyle = theme === "dark" ? `rgba(148, 163, 184, ${opacity})` : `rgba(100, 116, 139, ${opacity})`;
    ctx.lineWidth = Math.max(0.5, (link.weight || 1) * 0.5) / globalScale;
    ctx.stroke();
  }, [theme]);

  const data = filteredData();
  const isEmpty = !graphLoading && data.nodes.length === 0;

  return (
    <div className="min-h-screen bg-background flex flex-col h-screen overflow-hidden">
      <header className="h-16 border-b border-border/60 bg-background/80 backdrop-blur-md px-4 lg:px-6 flex items-center justify-between z-30 shrink-0">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="icon" data-testid="button-back-dashboard">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div className="flex items-center gap-2 font-bold text-lg text-primary">
            <div className="bg-primary p-1.5 rounded-lg">
              <Bookmark className="w-4 h-4 text-white" />
            </div>
            <span className="hidden sm:inline">superBrain</span>
          </div>
          <div className="h-6 w-px bg-border mx-2" />
          <div className="flex items-center gap-2">
            <Network className="w-4 h-4 text-muted-foreground" />
            <h1 className="text-sm font-semibold text-foreground">Knowledge Graph</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            data-testid="button-theme-toggle"
          >
            {theme === "light" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
          </Button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 relative overflow-hidden">
          <div className="absolute top-4 left-4 z-10 flex flex-col gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search entities..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-[220px] bg-background/90 backdrop-blur-sm border-border/60"
                data-testid="input-search-entities"
              />
            </div>

            <div className="flex flex-wrap gap-1.5">
              {Object.entries(TYPE_LABELS).map(([type, label]) => {
                const Icon = TYPE_ICONS[type];
                const count = stats?.byType[type] || 0;
                const isActive = activeFilters.has(type);
                return (
                  <Button
                    key={type}
                    variant={isActive ? "default" : "outline"}
                    size="sm"
                    className={`rounded-full text-xs gap-1 toggle-elevate ${isActive ? "toggle-elevated" : ""}`}
                    onClick={() => toggleFilter(type)}
                    data-testid={`button-filter-${type}`}
                  >
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: TYPE_COLORS[type] }}
                    />
                    {label} ({count})
                  </Button>
                );
              })}
            </div>
          </div>

          <div className="absolute top-4 right-4 z-10 flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="rounded-full gap-2 bg-background/90 backdrop-blur-sm"
              onClick={handleZoomToFit}
              data-testid="button-fit-to-screen"
            >
              <Maximize className="w-3 h-3" />
              Fit to screen
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="rounded-full gap-2 bg-background/90 backdrop-blur-sm"
              onClick={() => backfillMutation.mutate()}
              disabled={backfillMutation.isPending || (stats?.totalPostsPending === 0)}
              data-testid="button-backfill"
            >
              {backfillMutation.isPending ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Zap className="w-3 h-3" />
              )}
              {backfillMutation.isPending
                ? "Processing..."
                : stats?.totalPostsPending
                  ? `Analyze ${stats.totalPostsPending} posts`
                  : "All posts analyzed"}
            </Button>
          </div>

          {stats && (
            <div className="absolute bottom-4 left-4 z-10 flex gap-2">
              <Badge variant="secondary" className="text-xs">
                {stats.totalEntities} entities
              </Badge>
              <Badge variant="secondary" className="text-xs">
                {stats.totalEdges} connections
              </Badge>
              <Badge variant="secondary" className="text-xs">
                {stats.totalPostsProcessed} posts analyzed
              </Badge>
            </div>
          )}

          {graphLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : isEmpty ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <div className="bg-muted/30 p-4 rounded-full mb-4">
                <Network className="w-8 h-8 text-muted-foreground/50" />
              </div>
              <h3 className="text-lg font-medium text-foreground mb-2">No knowledge graph yet</h3>
              <p className="text-muted-foreground max-w-md mb-6">
                {stats?.totalPostsPending
                  ? `You have ${stats.totalPostsPending} posts waiting to be analyzed. Click the button above to build your knowledge graph.`
                  : "Save some posts first, then come back to see your knowledge graph take shape."}
              </p>
              {stats?.totalPostsPending ? (
                <Button
                  onClick={() => backfillMutation.mutate()}
                  disabled={backfillMutation.isPending}
                  data-testid="button-backfill-empty"
                >
                  {backfillMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Zap className="w-4 h-4 mr-2" />
                  )}
                  Analyze posts now
                </Button>
              ) : (
                <Link href="/">
                  <Button data-testid="button-go-to-dashboard">Go to Library</Button>
                </Link>
              )}
            </div>
          ) : (
            <ForceGraph2D
              ref={graphRef}
              graphData={data}
              nodeId="id"
              nodeCanvasObject={nodeCanvasObject}
              nodePointerAreaPaint={(node: any, color: string, ctx: CanvasRenderingContext2D) => {
                const size = Math.max(4, Math.min(20, (node.mentionCount || 1) * 3));
                ctx.beginPath();
                ctx.arc(node.x, node.y, size + 2, 0, 2 * Math.PI, false);
                ctx.fillStyle = color;
                ctx.fill();
              }}
              linkCanvasObject={linkCanvasObject}
              onNodeClick={handleNodeClick}
              onEngineStop={handleEngineStop}
              backgroundColor="transparent"
              cooldownTicks={150}
              d3AlphaDecay={0.02}
              d3VelocityDecay={0.3}
              warmupTicks={80}
              d3AlphaMin={0.01}
            />
          )}
        </div>

        {selectedEntityId && (
          <aside className="w-[380px] border-l border-border bg-card overflow-y-auto shrink-0 custom-scrollbar">
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-foreground">Entity Detail</h2>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedEntityId(null)}
                  data-testid="button-close-detail"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {detailLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : entityDetail ? (
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Badge
                        variant="secondary"
                        style={{ backgroundColor: `${TYPE_COLORS[entityDetail.entity.type]}20`, color: TYPE_COLORS[entityDetail.entity.type] }}
                      >
                        {entityDetail.entity.type}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {entityDetail.entity.mentionCount} mention{entityDetail.entity.mentionCount !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-foreground" data-testid="text-entity-name">
                      {entityDetail.entity.name}
                    </h3>
                    {entityDetail.entity.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {entityDetail.entity.description}
                      </p>
                    )}
                  </div>

                  {entityDetail.connectedEntities.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                        Connected Entities
                      </h4>
                      <div className="flex flex-wrap gap-1.5">
                        {entityDetail.connectedEntities
                          .sort((a, b) => b.weight - a.weight)
                          .slice(0, 20)
                          .map(ce => (
                            <Button
                              key={ce.id}
                              variant="outline"
                              size="sm"
                              className="rounded-full text-xs gap-1"
                              onClick={() => setSelectedEntityId(ce.id)}
                              data-testid={`button-connected-entity-${ce.id}`}
                            >
                              <span
                                className="w-2 h-2 rounded-full shrink-0"
                                style={{ backgroundColor: TYPE_COLORS[ce.type] }}
                              />
                              {ce.name}
                              {ce.weight > 1 && (
                                <span className="text-muted-foreground">({ce.weight})</span>
                              )}
                            </Button>
                          ))}
                      </div>
                    </div>
                  )}

                  {entityDetail.posts.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                        Mentioned in {entityDetail.posts.length} post{entityDetail.posts.length !== 1 ? "s" : ""}
                      </h4>
                      <div className="space-y-2">
                        {entityDetail.posts.map(post => (
                          <Card key={post.id} className="p-3 hover-elevate cursor-default">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-foreground line-clamp-1">
                                  {post.summary || post.authorName || `Post #${post.id}`}
                                </p>
                                <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                                  {post.content.slice(0, 150)}
                                </p>
                                <div className="flex items-center gap-2 mt-1.5">
                                  {post.platform && (
                                    <Badge variant="secondary" className="text-xs h-5">
                                      {post.platform}
                                    </Badge>
                                  )}
                                  {post.authorName && (
                                    <span className="text-xs text-muted-foreground">{post.authorName}</span>
                                  )}
                                </div>
                              </div>
                              {post.originalUrl && (
                                <a href={post.originalUrl} target="_blank" rel="noopener noreferrer" data-testid={`link-post-${post.id}`}>
                                  <Button variant="ghost" size="icon" className="shrink-0" data-testid={`button-open-post-${post.id}`}>
                                    <ExternalLink className="w-3 h-3" />
                                  </Button>
                                </a>
                              )}
                            </div>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
