import { useState } from "react";
import { useSearchPosts } from "@/hooks/use-posts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sparkles, Send, Bot, Search, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Post } from "@shared/schema";

export function AISearchSidebar() {
  const [query, setQuery] = useState("");
  const { mutate: search, isPending, data: result } = useSearchPosts();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      search(query);
    }
  };

  return (
    <div className="flex flex-col h-full bg-card border-l border-border/60 shadow-xl shadow-black/5">
      <div className="p-6 border-b border-border/40 bg-gradient-to-b from-muted/50 to-transparent">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 bg-primary/10 rounded-xl">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold text-lg leading-tight">AI Assistant</h2>
            <p className="text-xs text-muted-foreground">Ask questions about your library</p>
          </div>
        </div>
        
        <form onSubmit={handleSearch} className="relative">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. What did I save about React?"
            className="pr-10 rounded-xl bg-background border-primary/20 focus-visible:ring-primary/20 shadow-sm"
          />
          <Button 
            type="submit" 
            size="icon" 
            disabled={!query.trim() || isPending}
            className="absolute right-1 top-1 h-8 w-8 rounded-lg bg-primary/10 text-primary hover:bg-primary/20"
          >
            {isPending ? (
              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
                <Search className="w-4 h-4" />
              </motion.div>
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </form>
      </div>

      <ScrollArea className="flex-1 p-6 custom-scrollbar">
        <AnimatePresence mode="wait">
          {!result && !isPending && (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              className="text-center text-muted-foreground py-10"
            >
              <Bot className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p className="text-sm">Ready to help you rediscover your saved content.</p>
            </motion.div>
          )}

          {result && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="prose prose-sm prose-blue">
                <div className="flex gap-3 mb-2">
                  <Bot className="w-5 h-5 text-primary mt-1 shrink-0" />
                  <div className="bg-muted/40 p-4 rounded-2xl rounded-tl-none text-foreground/90 leading-relaxed text-sm">
                    {result.answer}
                  </div>
                </div>
              </div>

              {result.sources.length > 0 && (
                <div className="space-y-3 pt-4 border-t border-border/40">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">Sources</h4>
                  {result.sources.map((source: Post) => (
                    <Card key={source.id} className="p-3 bg-card hover:bg-muted/30 transition-colors border border-border/50 shadow-sm">
                      <p className="text-sm font-medium line-clamp-2 leading-snug mb-2">
                        {source.content}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-muted-foreground uppercase bg-secondary px-1.5 py-0.5 rounded">
                          {source.platform}
                        </span>
                        {source.originalUrl && (
                          <a 
                            href={source.originalUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-primary hover:underline text-[10px] flex items-center"
                          >
                            View <ArrowRight className="w-2.5 h-2.5 ml-1" />
                          </a>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </ScrollArea>
    </div>
  );
}
