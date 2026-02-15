import { useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertPostSchema, type InsertPost } from "@shared/schema";
import { useCreatePost } from "@/hooks/use-posts";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Plus, Loader2, Link as LinkIcon, Sparkles, Image as ImageIcon } from "lucide-react";

interface ScrapedData {
  content: string;
  imageUrl: string | null;
  authorName: string | null;
  authorUrl: string | null;
  title: string | null;
  description: string | null;
  platform?: string;
}

export function CreatePostDialog() {
  const [open, setOpen] = useState(false);
  const [isScraping, setIsScraping] = useState(false);
  const [scrapePreview, setScrapePreview] = useState<ScrapedData | null>(null);
  const { mutate, isPending } = useCreatePost();

  const form = useForm<InsertPost>({
    resolver: zodResolver(insertPostSchema),
    defaultValues: {
      content: "",
      summary: "",
      originalUrl: "",
      imageUrl: "",
      platform: "linkedin",
      tags: [],
    },
  });

  const handleScrape = useCallback(async (url: string) => {
    if (!url || isScraping) return;
    try {
      new URL(url);
    } catch {
      return;
    }

    setIsScraping(true);
    setScrapePreview(null);

    try {
      const res = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ url }),
      });

      if (res.ok) {
        const data: ScrapedData = await res.json();
        setScrapePreview(data);

        if (data.content && !form.getValues("content")) {
          form.setValue("content", data.content);
        }
        if (data.imageUrl) {
          form.setValue("imageUrl", data.imageUrl);
        }
        if (data.authorName) {
          form.setValue("authorName", data.authorName);
        }
        if (data.platform) {
          form.setValue("platform", data.platform);
        }
      }
    } catch {
      // silently fail
    } finally {
      setIsScraping(false);
    }
  }, [isScraping, form]);

  const onSubmit = (data: InsertPost) => {
    mutate(data, {
      onSuccess: () => {
        setOpen(false);
        form.reset();
        setScrapePreview(null);
      },
    });
  };

  const handleOpenChange = (v: boolean) => {
    setOpen(v);
    if (!v) {
      form.reset();
      setScrapePreview(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="rounded-full shadow-lg hover:shadow-primary/20 bg-primary hover:bg-primary/90" data-testid="button-add-content">
          <Plus className="w-4 h-4 mr-2" />
          Add Content
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] rounded-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-primary">Add New Content</DialogTitle>
          <DialogDescription>
            Paste a LinkedIn post URL to auto-fetch content and images, or enter details manually.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 mt-4">
            
            <FormField
              control={form.control}
              name="originalUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Post URL</FormLabel>
                  <FormControl>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <LinkIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="https://linkedin.com/posts/..."
                          className="pl-9 rounded-xl"
                          {...field}
                          value={field.value || ""}
                          data-testid="input-post-url"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        className="rounded-xl shrink-0"
                        disabled={isScraping || !field.value}
                        onClick={() => handleScrape(field.value || "")}
                        data-testid="button-fetch-url"
                      >
                        {isScraping ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Sparkles className="w-4 h-4" />
                        )}
                        <span className="ml-2 hidden sm:inline">{isScraping ? "Fetching..." : "Fetch"}</span>
                      </Button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {scrapePreview?.imageUrl && (
              <div className="rounded-xl overflow-hidden border border-border/60 bg-muted/20">
                <img
                  src={scrapePreview.imageUrl}
                  alt="Scraped preview"
                  className="w-full h-48 object-cover"
                  data-testid="img-scrape-preview"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
                <div className="px-3 py-2 flex items-center gap-2 text-xs text-muted-foreground">
                  <ImageIcon className="w-3 h-3" />
                  Image detected and will be saved with this post
                </div>
              </div>
            )}

            {scrapePreview && !scrapePreview.imageUrl && (
              <div className="rounded-xl border border-border/60 bg-muted/20 px-3 py-2 text-xs text-muted-foreground flex items-center gap-2">
                <Sparkles className="w-3 h-3" />
                Content fetched — no image found on this post
              </div>
            )}

            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Post Content</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Paste the post content here, or click Fetch to auto-fill..." 
                      className="min-h-[120px] resize-none rounded-xl text-sm leading-relaxed" 
                      {...field}
                      data-testid="textarea-post-content"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="summary"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Personal Note (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Why did you save this?" className="rounded-xl" {...field} value={field.value || ""} data-testid="input-summary" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} className="rounded-xl">Cancel</Button>
              <Button type="submit" disabled={isPending || isScraping} className="rounded-xl bg-primary" data-testid="button-save-post">
                {isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Save to Library
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
