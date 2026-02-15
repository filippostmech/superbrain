import { useState } from "react";
import { format } from "date-fns";
import { Post } from "@shared/schema";
import { useUpdatePost, useDeletePost } from "@/hooks/use-posts";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Heart, Trash2, ExternalLink, Calendar, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

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

export function PostListItem({ post }: { post: Post }) {
  const updateMutation = useUpdatePost();
  const deleteMutation = useDeletePost();
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleFavorite = () => {
    updateMutation.mutate({
      id: post.id,
      isFavorite: !post.isFavorite,
    });
  };

  const formattedDate = post.publishedAt
    ? format(new Date(post.publishedAt), "MMM d, yyyy")
    : format(new Date(post.createdAt || new Date()), "MMM d, yyyy");

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <Card
        className="group border border-border/60 hover:border-primary/30 hover:shadow-md transition-all duration-300 rounded-xl overflow-hidden bg-card"
        data-testid={`list-item-post-${post.id}`}
      >
        <div className="flex items-start gap-4 p-4">
          {post.imageUrl && (
            <div className="shrink-0 rounded-lg overflow-hidden bg-muted/30 border border-border/40 w-20 h-20">
              <img
                src={post.imageUrl}
                alt="Post preview"
                className="w-full h-full object-cover"
                loading="lazy"
                onError={(e) => {
                  (e.target as HTMLImageElement).parentElement!.style.display = "none";
                }}
              />
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <Badge variant="secondary" className={cn("rounded-md capitalize text-[10px] px-1.5 py-0", getPlatformBadgeClass(post.platform))}>
                {post.platform}
              </Badge>
              <span className="flex items-center text-[11px] text-muted-foreground">
                <Calendar className="w-3 h-3 mr-1" />
                {formattedDate}
              </span>
              {post.authorName && (
                <span className="text-[11px] text-muted-foreground truncate">
                  by {post.authorName}
                </span>
              )}
            </div>

            <div
              className={cn(
                "text-sm text-foreground/90 leading-relaxed transition-all",
                !isExpanded && "line-clamp-2"
              )}
            >
              {post.content}
            </div>

            {post.content.length > 120 && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="mt-1 text-xs font-medium text-primary hover:underline focus:outline-none flex items-center gap-0.5"
                data-testid={`button-expand-${post.id}`}
              >
                {isExpanded ? (
                  <>Show less <ChevronUp className="w-3 h-3" /></>
                ) : (
                  <>Read more <ChevronDown className="w-3 h-3" /></>
                )}
              </button>
            )}

            {post.summary && isExpanded && (
              <p className="mt-2 text-xs italic text-muted-foreground border-l-2 border-primary/30 pl-2">
                {post.summary}
              </p>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-8 w-8 rounded-full transition-colors",
                post.isFavorite ? "text-red-500 bg-red-50" : "text-muted-foreground"
              )}
              onClick={toggleFavorite}
              data-testid={`button-favorite-list-${post.id}`}
            >
              <Heart className={cn("w-4 h-4", post.isFavorite && "fill-current")} />
            </Button>

            {post.originalUrl && (
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-muted-foreground" asChild>
                <a href={post.originalUrl} target="_blank" rel="noopener noreferrer" data-testid={`link-original-list-${post.id}`}>
                  <ExternalLink className="w-4 h-4" />
                </a>
              </Button>
            )}

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                  data-testid={`button-delete-list-${post.id}`}
                >
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
                    className="rounded-xl bg-destructive text-destructive-foreground"
                    onClick={() => deleteMutation.mutate(post.id)}
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
