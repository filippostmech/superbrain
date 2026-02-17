import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";
import type { Collection, InsertCollection } from "@shared/schema";

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    try {
      const error = await res.json();
      throw new Error(error.message || "An error occurred");
    } catch (e) {
      if (e instanceof Error && e.message !== "An error occurred") throw e;
      throw new Error(res.statusText || "An error occurred");
    }
  }
  return await res.json();
}

export function useCollections() {
  return useQuery({
    queryKey: ["/api/collections"],
    queryFn: async () => {
      const res = await fetch("/api/collections", { credentials: "include" });
      return handleResponse<(Collection & { postCount: number })[]>(res);
    },
  });
}

export function useCreateCollection() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: InsertCollection) => {
      const res = await fetch("/api/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      return handleResponse<Collection>(res);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/collections"] });
      toast({ title: "Collection Created", description: "Your new collection is ready." });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create", description: error.message, variant: "destructive" });
    },
  });
}

export function useDeleteCollection() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/collections/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete collection");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/collections"] });
      toast({ title: "Deleted", description: "Collection removed." });
    },
  });
}

export function useAddPostToCollection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ postId, collectionId }: { postId: number; collectionId: number }) => {
      const res = await fetch(`/api/collections/${collectionId}/posts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId }),
        credentials: "include",
      });
      return handleResponse<{ message: string }>(res);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/collections"] });
      queryClient.invalidateQueries({ queryKey: ["/api/posts", variables.postId, "collections"] });
      queryClient.invalidateQueries({ queryKey: ["/api/collections", variables.collectionId, "posts"] });
    },
  });
}

export function useRemovePostFromCollection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ postId, collectionId }: { postId: number; collectionId: number }) => {
      const res = await fetch(`/api/collections/${collectionId}/posts/${postId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to remove post from collection");
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/collections"] });
      queryClient.invalidateQueries({ queryKey: ["/api/posts", variables.postId, "collections"] });
      queryClient.invalidateQueries({ queryKey: ["/api/collections", variables.collectionId, "posts"] });
    },
  });
}

export function usePostCollections(postId: number) {
  return useQuery({
    queryKey: ["/api/posts", postId, "collections"],
    queryFn: async () => {
      const res = await fetch(`/api/posts/${postId}/collections`, { credentials: "include" });
      return handleResponse<Collection[]>(res);
    },
  });
}

export function useCollectionPosts(collectionId: number | null) {
  return useQuery({
    queryKey: ["/api/collections", collectionId, "posts"],
    queryFn: async () => {
      if (!collectionId) return [];
      const res = await fetch(`/api/collections/${collectionId}/posts`, { credentials: "include" });
      return handleResponse<any[]>(res);
    },
    enabled: !!collectionId,
  });
}
