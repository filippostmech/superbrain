import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { usePosts } from "@/hooks/use-posts";
import { CreatePostDialog } from "@/components/CreatePostDialog";
import { BulkImportDialog } from "@/components/BulkImportDialog";
import { CollectionManager } from "@/components/CollectionManager";
import { useCollectionPosts } from "@/hooks/use-collections";
import { PostCard } from "@/components/PostCard";
import { AISearchSidebar } from "@/components/AISearchSidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  LogOut, 
  Menu, 
  Search, 
  LayoutGrid, 
  List, 
  Bookmark,
  Tag,
  Chrome,
  Key,
  Sparkles,
  PanelRightClose,
  BookOpen,
  Sun,
  Moon,
  Network
} from "lucide-react";
import { Link } from "wouter";
import { useTheme } from "@/hooks/use-theme";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { PostListItem } from "@/components/PostListItem";
import { ExportDropdown } from "@/components/ExportDropdown";

export default function Dashboard() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const { data: posts, isLoading } = usePosts(debouncedSearch);

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
  const { data: collectionPosts } = useCollectionPosts(selectedCollectionId);

  const allTags = Array.from(new Set((posts || []).flatMap(p => p.tags || []))).sort();

  const basePosts = selectedCollectionId ? collectionPosts : posts;
  const filteredPosts = basePosts?.filter(post => {
    if (activeTab === "favorites" && !post.isFavorite) return false;
    if (selectedTag && !(post.tags || []).includes(selectedTag)) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-background flex flex-col h-screen overflow-hidden">
      {/* Top Navigation */}
      <header className="h-16 border-b border-border/60 bg-background/80 backdrop-blur-md px-4 lg:px-6 flex items-center justify-between z-30 shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 font-bold text-lg text-primary">
            <div className="bg-primary p-1.5 rounded-lg">
              <Bookmark className="w-4 h-4 text-white" />
            </div>
            <span className="hidden sm:inline">superBrain</span>
          </div>
          
          <div className="h-6 w-px bg-border mx-2 hidden sm:block" />
          
          <div className="relative w-full max-w-md hidden sm:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search library..." 
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-9 h-9 rounded-full bg-muted/50 border-transparent focus:bg-background focus:border-primary/20 transition-all w-[200px] lg:w-[300px]" 
            />
          </div>
        </div>

        <div className="flex items-center gap-4">
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

          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            data-testid="button-theme-toggle"
          >
            {theme === "light" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
          </Button>

          <div className="flex items-center gap-3 pl-4 border-l border-border">
            <span className="text-sm font-medium hidden md:inline-block">
              {user?.firstName || "User"}
            </span>
            <Avatar className="h-8 w-8 border border-border">
              <AvatarImage src={user?.profileImageUrl} />
              <AvatarFallback>{user?.firstName?.[0]}</AvatarFallback>
            </Avatar>
            <Button variant="ghost" size="icon" onClick={() => logout()} className="text-muted-foreground hover:text-destructive">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto custom-scrollbar bg-background">
          <div className="max-w-5xl mx-auto p-4 sm:p-6 lg:p-8">
            
            {/* Header Actions */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground">Library</h1>
                <p className="text-muted-foreground mt-1">Manage and organize your saved content.</p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Link href="/knowledge-graph">
                  <Button variant="outline" className="rounded-full" data-testid="button-knowledge-graph-page">
                    <Network className="w-4 h-4 mr-2" />
                    Knowledge Graph
                  </Button>
                </Link>
                <Link href="/developers">
                  <Button variant="outline" className="rounded-full" data-testid="button-developers-page">
                    <BookOpen className="w-4 h-4 mr-2" />
                    API Docs
                  </Button>
                </Link>
                <Link href="/api-keys">
                  <Button variant="outline" className="rounded-full" data-testid="button-api-keys-page">
                    <Key className="w-4 h-4 mr-2" />
                    API Keys
                  </Button>
                </Link>
                <Link href="/extension">
                  <Button variant="outline" className="rounded-full" data-testid="button-extension-page">
                    <Chrome className="w-4 h-4 mr-2" />
                    Extension
                  </Button>
                </Link>
                <ExportDropdown
                  activeTab={activeTab}
                  selectedTag={selectedTag}
                  selectedCollectionId={selectedCollectionId}
                />
                <BulkImportDialog />
                <CreatePostDialog />
              </div>
            </div>

            {/* Filters */}
            <div className="flex items-center justify-between mb-6">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-auto">
                <TabsList className="bg-muted/50 p-1 rounded-full border border-border/50">
                  <TabsTrigger value="all" className="rounded-full px-4 text-xs font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm">
                    All Posts
                  </TabsTrigger>
                  <TabsTrigger value="favorites" className="rounded-full px-4 text-xs font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm">
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
              <div className="flex flex-wrap gap-1.5 mb-6" data-testid="tag-filter-bar">
                <Button
                  variant={selectedTag === null ? "default" : "outline"}
                  size="sm"
                  className="rounded-full text-xs"
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
                    className="rounded-full text-xs"
                    onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                    data-testid={`button-filter-tag-${tag}`}
                  >
                    {tag}
                  </Button>
                ))}
              </div>
            )}

            {/* Post Grid */}
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

        {/* AI Sidebar (Desktop) */}
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

        {/* Mobile AI Trigger */}
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
    </div>
  );
}
