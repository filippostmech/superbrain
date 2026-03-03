import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { usePosts, useEnrichAll } from "@/hooks/use-posts";
import { CreatePostDialog } from "@/components/CreatePostDialog";
import { BulkImportDialog } from "@/components/BulkImportDialog";
import { CollectionManager } from "@/components/CollectionManager";
import { useCollectionPosts } from "@/hooks/use-collections";
import { PostCard } from "@/components/PostCard";
import { AISearchSidebar } from "@/components/AISearchSidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Search,
  LayoutGrid,
  List,
  Bookmark,
  Sparkles,
  PanelRightClose,
  RefreshCw,
} from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { PostListItem } from "@/components/PostListItem";
import { ExportDropdown } from "@/components/ExportDropdown";
import AppLayout from "@/components/AppLayout";

export default function LibraryPage() {
  const { user } = useAuth();
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const { data: posts, isLoading } = usePosts(debouncedSearch);
  const enrichAllMutation = useEnrichAll();

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);
  const [showAiSidebar, setShowAiSidebar] = useState(true);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedCollectionId, setSelectedCollectionId] = useState<number | null>(null);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const { data: collectionPosts } = useCollectionPosts(selectedCollectionId);

  const allTags = Array.from(new Set((posts || []).flatMap(p => p.tags || []))).sort();

  const basePosts = selectedCollectionId ? collectionPosts : posts;
  const filteredPosts = basePosts?.filter(post => {
    if (activeTab === "favorites" && !post.isFavorite) return false;
    if (selectedTag && !(post.tags || []).includes(selectedTag)) return false;
    return true;
  });

  const headerContent = (
    <div className="flex items-center gap-2 flex-1">
      <div className="relative w-full max-w-md hidden md:block">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search library..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="pl-9 h-9 rounded-full bg-muted/50 border-transparent focus:bg-background focus:border-primary/20 transition-all w-[200px] lg:w-[300px]"
          data-testid="input-search"
        />
      </div>
      <div className="ml-auto flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
          data-testid="button-mobile-search-toggle"
        >
          <Search className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="hidden md:flex gap-2"
          onClick={() => setShowAiSidebar(!showAiSidebar)}
          data-testid="button-toggle-ai-sidebar"
        >
          {showAiSidebar ? (
            <PanelRightClose className="w-4 h-4" />
          ) : (
            <Sparkles className="w-4 h-4" />
          )}
          {showAiSidebar ? "Hide AI" : "Show AI"}
        </Button>
      </div>
    </div>
  );

  return (
    <AppLayout headerContent={headerContent}>
      {mobileSearchOpen && (
        <div className="md:hidden border-b border-border/60 bg-background px-4 py-2 shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search library..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-9 h-10 rounded-full bg-muted/50 border-transparent focus:bg-background focus:border-primary/20 transition-all w-full"
              autoFocus
              data-testid="input-mobile-search"
            />
          </div>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden relative">
        <main className="flex-1 overflow-y-auto custom-scrollbar bg-background">
          <div className="max-w-5xl mx-auto p-4 sm:p-6 lg:p-8">

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground" data-testid="text-library-title">Library</h1>
                <p className="text-muted-foreground mt-1">Manage and organize your saved content.</p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <TooltipProvider delayDuration={200}>
                  <ExportDropdown
                    activeTab={activeTab}
                    selectedTag={selectedTag}
                    selectedCollectionId={selectedCollectionId}
                    iconOnly
                  />
                  <BulkImportDialog />
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        className="rounded-full"
                        onClick={() => enrichAllMutation.mutate()}
                        disabled={enrichAllMutation.isPending}
                        aria-label="Enrich All"
                        data-testid="button-enrich-all"
                      >
                        <RefreshCw className={cn("w-4 h-4", enrichAllMutation.isPending && "animate-spin")} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{enrichAllMutation.isPending ? "Enriching..." : "Enrich All"}</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <CreatePostDialog />
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 mb-6">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-auto">
                <TabsList className="bg-muted/50 p-1 rounded-full border border-border/50">
                  <TabsTrigger value="all" className="rounded-full px-4 text-xs font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm" data-testid="tab-all-posts">
                    All Posts
                  </TabsTrigger>
                  <TabsTrigger value="favorites" className="rounded-full px-4 text-xs font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm" data-testid="tab-favorites">
                    Favorites
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              <div className="flex items-center gap-2">
                <CollectionManager
                  selectedCollectionId={selectedCollectionId}
                  onSelectCollection={setSelectedCollectionId}
                />
                <div className="p-1 bg-muted/50 rounded-lg hidden sm:flex border border-border/50">
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn("h-6 w-6 rounded-md", viewMode === "grid" ? "bg-background shadow-sm" : "text-muted-foreground")}
                    onClick={() => setViewMode("grid")}
                    data-testid="button-view-grid"
                  >
                    <LayoutGrid className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn("h-6 w-6 rounded-md", viewMode === "list" ? "bg-background shadow-sm" : "text-muted-foreground")}
                    onClick={() => setViewMode("list")}
                    data-testid="button-view-list"
                  >
                    <List className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </div>

            {allTags.length > 0 && (
              <div className="flex overflow-x-auto gap-1.5 mb-6 pb-1 scrollbar-hide" data-testid="tag-filter-bar">
                <Button
                  variant={selectedTag === null ? "default" : "outline"}
                  size="sm"
                  className="rounded-full text-xs shrink-0"
                  onClick={() => setSelectedTag(null)}
                  data-testid="button-filter-all-tags"
                >
                  All
                </Button>
                {allTags.map((tag) => (
                  <Button
                    key={tag}
                    variant={selectedTag === tag ? "default" : "outline"}
                    size="sm"
                    className="rounded-full text-xs shrink-0"
                    onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                    data-testid={`button-filter-tag-${tag}`}
                  >
                    {tag}
                  </Button>
                ))}
              </div>
            )}

            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="h-64 rounded-2xl bg-muted/20 animate-pulse" />
                ))}
              </div>
            ) : filteredPosts?.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="bg-muted/30 p-4 rounded-full mb-4">
                  <Bookmark className="w-8 h-8 text-muted-foreground/50" />
                </div>
                <h3 className="text-lg font-medium text-foreground">No posts found</h3>
                <p className="text-muted-foreground max-w-sm mt-2 mb-6">
                  {activeTab === 'favorites'
                    ? "You haven't favorited any posts yet."
                    : "Your library is empty. Add your first LinkedIn post to get started."}
                </p>
                {activeTab === 'all' && <CreatePostDialog />}
              </div>
            ) : viewMode === "grid" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 pb-20">
                {filteredPosts?.map((post) => (
                  <PostCard key={post.id} post={post} />
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-3 pb-20">
                {filteredPosts?.map((post) => (
                  <PostListItem key={post.id} post={post} />
                ))}
              </div>
            )}
          </div>
        </main>

        <motion.aside
          initial={false}
          animate={{
            width: showAiSidebar ? 380 : 0,
            opacity: showAiSidebar ? 1 : 0,
          }}
          transition={{
            type: "spring",
            stiffness: 300,
            damping: 30,
            opacity: { duration: 0.2 }
          }}
          className="hidden md:block border-l border-border bg-card overflow-hidden shrink-0"
        >
          <div className="w-[380px] h-full">
            <AISearchSidebar />
          </div>
        </motion.aside>

        <div className="md:hidden fixed bottom-6 right-6 z-50">
          <Sheet>
            <SheetTrigger asChild>
              <Button size="lg" className="rounded-full shadow-xl h-14 w-14 p-0 bg-primary hover:bg-primary/90">
                <Search className="w-6 h-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[80vh] rounded-t-3xl p-0">
              <AISearchSidebar />
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </AppLayout>
  );
}
