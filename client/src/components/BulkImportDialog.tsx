import { useState, useRef } from "react";
import { useBulkImport } from "@/hooks/use-posts";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Upload, Loader2, FileText, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ParsedPost {
  content: string;
  originalUrl?: string;
  authorName?: string;
  authorUrl?: string;
  publishedAt?: string;
  tags?: string[];
}

function parseCSV(text: string): ParsedPost[] {
  const lines = text.split("\n");
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/"/g, ""));
  const posts: ParsedPost[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values: string[] = [];
    let current = "";
    let inQuotes = false;
    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        values.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    values.push(current.trim());

    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] || "";
    });

    const content = row["content"] || row["text"] || row["body"] || row["post"] || row["description"] || "";
    if (!content) continue;

    posts.push({
      content,
      originalUrl: row["url"] || row["link"] || row["originalurl"] || row["original_url"] || "",
      authorName: row["author"] || row["authorname"] || row["author_name"] || row["name"] || "",
      authorUrl: row["authorurl"] || row["author_url"] || row["profileurl"] || row["profile_url"] || "",
      publishedAt: row["date"] || row["publishedat"] || row["published_at"] || row["timestamp"] || "",
      tags: row["tags"] ? row["tags"].split(";").map((t: string) => t.trim()).filter(Boolean) : [],
    });
  }

  return posts;
}

function parseJSON(text: string): ParsedPost[] {
  try {
    const data = JSON.parse(text);
    const items = Array.isArray(data) ? data : data.posts || data.items || data.data || [];
    return items.map((item: any) => ({
      content: item.content || item.text || item.body || item.post || item.description || "",
      originalUrl: item.url || item.link || item.originalUrl || item.original_url || "",
      authorName: item.author || item.authorName || item.author_name || item.name || "",
      authorUrl: item.authorUrl || item.author_url || item.profileUrl || "",
      publishedAt: item.date || item.publishedAt || item.published_at || item.timestamp || "",
      tags: item.tags || [],
    })).filter((p: ParsedPost) => p.content);
  } catch {
    return [];
  }
}

export function BulkImportDialog() {
  const [open, setOpen] = useState(false);
  const [pasteContent, setPasteContent] = useState("");
  const [parsedPosts, setParsedPosts] = useState<ParsedPost[]>([]);
  const [fileName, setFileName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { mutate, isPending } = useBulkImport();
  const { toast } = useToast();

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      let posts: ParsedPost[] = [];

      if (file.name.endsWith(".json")) {
        posts = parseJSON(text);
      } else if (file.name.endsWith(".csv")) {
        posts = parseCSV(text);
      } else {
        const lines = text.split("\n").filter(l => l.trim());
        posts = lines.map(line => ({ content: line.trim() }));
      }

      setParsedPosts(posts);
      if (posts.length === 0) {
        toast({
          title: "No posts found",
          description: "The file didn't contain any recognizable post data.",
          variant: "destructive",
        });
      }
    };
    reader.readAsText(file);
  };

  const handlePaste = () => {
    if (!pasteContent.trim()) return;

    let posts: ParsedPost[] = [];
    try {
      posts = parseJSON(pasteContent);
    } catch {
      // not JSON
    }
    if (posts.length === 0) {
      posts = parseCSV(pasteContent);
    }
    if (posts.length === 0) {
      const lines = pasteContent.split("\n").filter(l => l.trim());
      posts = lines.map(line => ({ content: line.trim() }));
    }

    setParsedPosts(posts);
    if (posts.length === 0) {
      toast({
        title: "No posts found",
        description: "Could not parse any posts from the text.",
        variant: "destructive",
      });
    }
  };

  const handleImport = () => {
    if (parsedPosts.length === 0) return;
    mutate(parsedPosts, {
      onSuccess: () => {
        setOpen(false);
        setParsedPosts([]);
        setPasteContent("");
        setFileName("");
      },
    });
  };

  const resetState = () => {
    setParsedPosts([]);
    setPasteContent("");
    setFileName("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetState(); }}>
      <DialogTrigger asChild>
        <Button data-testid="button-bulk-import" variant="outline" className="rounded-full">
          <Upload className="w-4 h-4 mr-2" />
          Bulk Import
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-primary">Bulk Import</DialogTitle>
          <DialogDescription>
            Upload a CSV or JSON file exported from LinkedIn, or paste content directly.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.json,.txt"
              className="hidden"
              onChange={handleFile}
              data-testid="input-file-upload"
            />
            <Button
              data-testid="button-choose-file"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="w-full h-24 rounded-xl border-dashed border-2 flex flex-col gap-2"
            >
              <FileText className="w-6 h-6 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {fileName || "Click to upload CSV, JSON, or TXT file"}
              </span>
            </Button>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground">or paste content</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <Textarea
            data-testid="textarea-paste-content"
            placeholder="Paste CSV, JSON, or one post per line..."
            value={pasteContent}
            onChange={(e) => setPasteContent(e.target.value)}
            className="min-h-[120px] resize-none rounded-xl text-sm"
          />
          {pasteContent && parsedPosts.length === 0 && (
            <Button
              data-testid="button-parse-paste"
              variant="secondary"
              size="sm"
              onClick={handlePaste}
              className="rounded-full"
            >
              Parse Content
            </Button>
          )}

          {parsedPosts.length > 0 && (
            <div className="bg-muted/30 rounded-xl p-4 flex items-center gap-3">
              <div className="bg-primary/10 p-2 rounded-lg">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-sm" data-testid="text-parsed-count">
                  {parsedPosts.length} post{parsedPosts.length !== 1 ? "s" : ""} ready to import
                </p>
                <p className="text-xs text-muted-foreground">
                  Duplicates will be automatically skipped
                </p>
              </div>
            </div>
          )}

          {parsedPosts.length > 0 && parsedPosts.length > 3 && (
            <div className="flex items-start gap-2 text-xs text-muted-foreground">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>Large imports may take a moment to process.</span>
            </div>
          )}
        </div>

        <DialogFooter className="mt-4">
          <Button type="button" variant="outline" onClick={() => { setOpen(false); resetState(); }} className="rounded-xl">
            Cancel
          </Button>
          <Button
            data-testid="button-start-import"
            disabled={parsedPosts.length === 0 || isPending}
            onClick={handleImport}
            className="rounded-xl bg-primary"
          >
            {isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Import {parsedPosts.length > 0 ? `${parsedPosts.length} Posts` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
