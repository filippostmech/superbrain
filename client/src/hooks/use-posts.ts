import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";
import type { InsertPost, Post } from "@shared/schema";

// Helper to handle API requests safely
async function handleResponse<T>(res: Response, schema?: any): Promise<T> {
  if (!res.ok) {
    // Try to parse error message
    try {
      const error = await res.json();
      throw new Error(error.message || "An error occurred");
    } catch (e) {
      throw new Error(res.statusText || "An error occurred");
    }
  }
  const data = await res.json();
  if (schema) {
    return schema.parse(data);
  }
  return data as T;
}

export function usePosts(search?: string, tags?: string) {
  return useQuery({
    queryKey: [api.posts.list.path, search, tags],
    queryFn: async () => {
      const url = new URL(api.posts.list.path, window.location.origin);
      if (search) url.searchParams.set("search", search);
      if (tags) url.searchParams.set("tags", tags);
      
      const res = await fetch(url.toString(), { credentials: "include" });
      return handleResponse<Post[]>(res, api.posts.list.responses[200]);
    },
  });
}

export function useCreatePost() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (post: InsertPost) => {
      const res = await fetch(api.posts.create.path, {
        method: api.posts.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(post),
        credentials: "include",
      });
      return handleResponse<Post>(res, api.posts.create.responses[201]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.posts.list.path] });
      toast({
        title: "Content Saved",
        description: "Your post has been added to the library.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to save",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useUpdatePost() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: number } & Partial<InsertPost>) => {
      const url = buildUrl(api.posts.update.path, { id });
      const res = await fetch(url, {
        method: api.posts.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
        credentials: "include",
      });
      return handleResponse<Post>(res, api.posts.update.responses[200]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.posts.list.path] });
      toast({
        title: "Updated",
        description: "Changes saved successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useDeletePost() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.posts.delete.path, { id });
      const res = await fetch(url, {
        method: api.posts.delete.method,
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete post");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.posts.list.path] });
      toast({
        title: "Deleted",
        description: "Post removed from your library.",
      });
    },
  });
}

export function useBulkImport() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (posts: Array<{
      content: string;
      originalUrl?: string;
      summary?: string;
      authorName?: string;
      authorUrl?: string;
      publishedAt?: string;
      tags?: string[];
    }>) => {
      const res = await fetch(api.posts.bulkImport.path, {
        method: api.posts.bulkImport.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ posts }),
        credentials: "include",
      });
      return handleResponse<{ imported: number; skipped: number }>(res);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [api.posts.list.path] });
      toast({
        title: "Import Complete",
        description: `Imported ${data.imported} posts (${data.skipped} already existed).`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Import Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useSearchPosts() {
  return useMutation({
    mutationFn: async (query: string) => {
      const res = await fetch(api.posts.search.path, {
        method: api.posts.search.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
        credentials: "include",
      });
      return handleResponse<{ answer: string; sources: Post[] }>(
        res, 
        api.posts.search.responses[200]
      );
    },
  });
}
