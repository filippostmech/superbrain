import { useState } from "react";
import { format } from "date-fns";
import { Post } from "@shared/schema";
import { useUpdatePost, useDeletePost } from "@/hooks/use-posts";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Heart, Trash2, ExternalLink, Calendar, MessageSquareQuote } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

function getPlatformBadgeClass(platform: string): string {
  switch (platform) {
    case "linkedin":
      return "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300";
    case "substack":
      return "bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-300";
    default:
      return "bg-gray-50 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
  }
}

export function PostCard({ post }: { post: Post }) {
  const updateMutation = useUpdatePost();
  const deleteMutation = useDeletePost();
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleFavorite = () => {
    updateMutation.mutate({ 
      id: post.id, 
      isFavorite: !post.isFavorite 
    });
  };

  const formattedDate = post.publishedAt 
    ? format(new Date(post.publishedAt), "MMM d, yyyy")
    : format(new Date(post.createdAt || new Date()), "MMM d, yyyy");

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="group h-full flex flex-col border border-border/60 hover:border-primary/30 hover:shadow-lg transition-all duration-300 rounded-2xl overflow-hidden bg-card">
        <CardHeader className="pb-3 pt-5 px-6 flex flex-row items-start justify-between space-y-0">
          <div className="flex items-center space-x-2 text-xs text-muted-foreground flex-wrap gap-1">
            <Badge variant="secondary" className={cn("rounded-md capitalize", getPlatformBadgeClass(post.platform))} data-testid={`badge-platform-${post.id}`}>
              {post.platform}
            </Badge>
            <span className="flex items-center">
              <Calendar className="w-3 h-3 mr-1" />
              {formattedDate}
            </span>
            {post.authorName && (
              <span className="truncate max-w-[140px]" data-testid={`text-author-${post.id}`}>
                by {post.authorName}
              </span>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-8 w-8 rounded-full transition-colors",
              post.isFavorite ? "text-red-500 hover:text-red-600 bg-red-50" : "text-muted-foreground hover:text-red-500"
            )}
            onClick={toggleFavorite}
          >
            <Heart className={cn("w-4 h-4", post.isFavorite && "fill-current")} />
          </Button>
        </CardHeader>

        {post.imageUrl && (
          <div className="px-6 pt-2 pb-0">
            <div className="rounded-xl overflow-hidden bg-muted/30 border border-border/40">
              <img
                src={post.imageUrl}
                alt="Post preview"
                className="w-full h-44 object-cover"
                loading="lazy"
                data-testid={`img-post-preview-${post.id}`}
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            </div>
          </div>
        )}

        <CardContent className="px-6 flex-grow">
          {post.summary && (
            <div className="mb-4 p-3 bg-muted/40 rounded-xl text-sm italic text-muted-foreground border border-border/50 flex items-start gap-2">
              <MessageSquareQuote className="w-4 h-4 mt-0.5 shrink-0" />
              {post.summary}
            </div>
          )}
          
          <div className={cn(
            "prose prose-sm prose-slate max-w-none font-serif text-base leading-relaxed text-foreground/90 transition-all duration-300 relative",
            !isExpanded && "line-clamp-4"
          )}>
            {post.content}
            
            {!isExpanded && (
              <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-card to-transparent" />
            )}
          </div>
          
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className="mt-2 text-xs font-medium text-primary hover:underline focus:outline-none"
          >
            {isExpanded ? "Show less" : "Read more"}
          </button>
        </CardContent>

        <CardFooter className="px-6 py-4 bg-muted/20 border-t border-border/40 flex justify-between items-center mt-auto">
          <div className="flex gap-2">
            {post.originalUrl && (
              <Button variant="ghost" size="sm" className="h-8 rounded-lg text-xs" asChild>
                <a href={post.originalUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-3 h-3 mr-2" />
                  Original
                </a>
              </Button>
            )}
          </div>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity">
                <Trash2 className="w-4 h-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="rounded-2xl">
              <AlertDialogHeader>
                <AlertDialogTitle>Delete post?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently remove this post from your library.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                <AlertDialogAction 
                  className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={() => deleteMutation.mutate(post.id)}
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardFooter>
      </Card>
    </motion.div>
  );
}
