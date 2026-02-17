import { useCollections, useAddPostToCollection, useRemovePostFromCollection, usePostCollections } from "@/hooks/use-collections";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { FolderPlus, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface AddToCollectionPopoverProps {
  postId: number;
}

export function AddToCollectionPopover({ postId }: AddToCollectionPopoverProps) {
  const { data: allCollections } = useCollections();
  const { data: postCollections } = usePostCollections(postId);
  const addMutation = useAddPostToCollection();
  const removeMutation = useRemovePostFromCollection();

  const postCollectionIds = new Set((postCollections || []).map(c => c.id));

  const toggleCollection = (collectionId: number) => {
    if (postCollectionIds.has(collectionId)) {
      removeMutation.mutate({ postId, collectionId });
    } else {
      addMutation.mutate({ postId, collectionId });
    }
  };

  if (!allCollections || allCollections.length === 0) return null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full text-muted-foreground" data-testid={`button-add-to-collection-${postId}`}>
          <FolderPlus className="w-4 h-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-52 p-2" align="end">
        <p className="text-xs font-semibold mb-2 px-1">Add to collection</p>
        <div className="space-y-0.5 max-h-40 overflow-y-auto">
          {allCollections.map((col) => (
            <button
              key={col.id}
              className={cn(
                "w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded-md text-sm text-left transition-colors hover-elevate",
                postCollectionIds.has(col.id) && "bg-primary/10"
              )}
              onClick={() => toggleCollection(col.id)}
              disabled={addMutation.isPending || removeMutation.isPending}
              data-testid={`toggle-collection-${col.id}-post-${postId}`}
            >
              <span className="truncate">{col.name}</span>
              {postCollectionIds.has(col.id) && <Check className="w-3 h-3 text-primary shrink-0" />}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
