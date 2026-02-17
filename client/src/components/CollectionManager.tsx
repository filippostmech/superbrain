import { useState } from "react";
import { useCollections, useCreateCollection, useDeleteCollection } from "@/hooks/use-collections";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { FolderOpen, Plus, Trash2, Loader2, FolderPlus } from "lucide-react";
import { cn } from "@/lib/utils";

interface CollectionManagerProps {
  selectedCollectionId: number | null;
  onSelectCollection: (id: number | null) => void;
}

export function CollectionManager({ selectedCollectionId, onSelectCollection }: CollectionManagerProps) {
  const { data: collections, isLoading } = useCollections();
  const createMutation = useCreateCollection();
  const deleteMutation = useDeleteCollection();
  const [newName, setNewName] = useState("");
  const [open, setOpen] = useState(false);

  const handleCreate = () => {
    const name = newName.trim();
    if (!name) return;
    createMutation.mutate({ name }, {
      onSuccess: () => setNewName(""),
    });
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={selectedCollectionId ? "default" : "outline"}
          size="sm"
          className="rounded-full text-xs gap-1.5"
          data-testid="button-collections-menu"
        >
          <FolderOpen className="w-3 h-3" />
          {selectedCollectionId
            ? collections?.find(c => c.id === selectedCollectionId)?.name || "Collection"
            : "Collections"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3" align="start">
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-sm font-semibold">Collections</h4>
            {selectedCollectionId && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground"
                onClick={() => { onSelectCollection(null); setOpen(false); }}
                data-testid="button-clear-collection-filter"
              >
                Clear filter
              </Button>
            )}
          </div>

          <div className="flex gap-1.5">
            <Input
              placeholder="New collection name..."
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); }}
              className="text-xs rounded-lg"
              data-testid="input-new-collection"
            />
            <Button
              size="icon"
              variant="outline"
              className="shrink-0 rounded-lg"
              onClick={handleCreate}
              disabled={!newName.trim() || createMutation.isPending}
              data-testid="button-create-collection"
            >
              {createMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
            </Button>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          ) : !collections || collections.length === 0 ? (
            <div className="text-center py-4">
              <FolderPlus className="w-6 h-6 mx-auto mb-1 text-muted-foreground/50" />
              <p className="text-xs text-muted-foreground">No collections yet</p>
            </div>
          ) : (
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {collections.map((col) => (
                <div
                  key={col.id}
                  className={cn(
                    "group flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-colors hover-elevate",
                    selectedCollectionId === col.id && "bg-primary/10"
                  )}
                  onClick={() => { onSelectCollection(selectedCollectionId === col.id ? null : col.id); setOpen(false); }}
                  data-testid={`collection-item-${col.id}`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <FolderOpen className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <span className="text-sm truncate">{col.name}</span>
                    <Badge variant="secondary" className="text-[10px] px-1 py-0 shrink-0">{col.postCount}</Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0 text-muted-foreground invisible group-hover:visible"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (selectedCollectionId === col.id) onSelectCollection(null);
                      deleteMutation.mutate(col.id);
                    }}
                    data-testid={`button-delete-collection-${col.id}`}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
