import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft,
  Bookmark,
  Plus,
  Copy,
  Check,
  Trash2,
  Key,
  AlertTriangle,
  Sun,
  Moon,
} from "lucide-react";
import { useTheme } from "@/hooks/use-theme";

interface ApiKey {
  id: number;
  name: string;
  keyPrefix: string;
  isActive: boolean;
  createdAt: string;
  lastUsedAt: string | null;
}

interface CreatedApiKey {
  id: number;
  name: string;
  key: string;
  keyPrefix: string;
  createdAt: string;
}

export default function ApiKeysPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { theme, toggleTheme } = useTheme();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [keyName, setKeyName] = useState("");
  const [createdKey, setCreatedKey] = useState<CreatedApiKey | null>(null);
  const [showKeyDialogOpen, setShowKeyDialogOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<ApiKey | null>(null);

  const { data: apiKeys, isLoading } = useQuery<ApiKey[]>({
    queryKey: ["/api/api-keys"],
  });

  const createMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await apiRequest("POST", "/api/api-keys", { name });
      return (await res.json()) as CreatedApiKey;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/api-keys"] });
      setCreateDialogOpen(false);
      setKeyName("");
      setCreatedKey(data);
      setShowKeyDialogOpen(true);
      toast({ title: "API key created", description: `Key "${data.name}" has been generated.` });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create API key", description: error.message, variant: "destructive" });
    },
  });

  const revokeMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/api-keys/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/api-keys"] });
      setRevokeTarget(null);
      toast({ title: "API key revoked", description: "The key has been permanently revoked." });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to revoke API key", description: error.message, variant: "destructive" });
    },
  });

  const handleCopyKey = async () => {
    if (!createdKey) return;
    try {
      await navigator.clipboard.writeText(createdKey.key);
      setCopied(true);
      toast({ title: "Copied to clipboard" });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: "Failed to copy", description: "Please copy the key manually.", variant: "destructive" });
    }
  };

  const handleCreateSubmit = () => {
    if (!keyName.trim()) return;
    createMutation.mutate(keyName.trim());
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "Never";
    try {
      return format(new Date(dateStr), "MMM d, yyyy");
    } catch {
      return "Unknown";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="h-16 border-b border-border/60 bg-background/80 backdrop-blur-md px-4 lg:px-6 flex items-center justify-between z-30">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="icon" data-testid="button-back-dashboard">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div className="flex items-center gap-2 font-bold text-lg text-primary">
            <div className="bg-primary p-1.5 rounded-lg">
              <Bookmark className="w-4 h-4 text-white" />
            </div>
            <span>superBrain</span>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={toggleTheme} data-testid="button-theme-toggle">
          {theme === "light" ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
        </Button>
      </header>

      <main className="max-w-3xl mx-auto p-4 sm:p-6 lg:p-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground" data-testid="text-api-keys-title">
              API Keys
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage API keys for the superBrain public API.{" "}
              <Link href="/developers" className="text-primary hover:underline" data-testid="link-api-docs">
                View API Docs
              </Link>
            </p>
          </div>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-generate-new-key">
                <Plus className="w-4 h-4 mr-2" />
                Generate New Key
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Generate New API Key</DialogTitle>
                <DialogDescription>
                  Give your API key a descriptive name so you can identify it later.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-2 py-4">
                <Label htmlFor="key-name">Key Name</Label>
                <Input
                  id="key-name"
                  placeholder="e.g. Production Server"
                  value={keyName}
                  onChange={(e) => setKeyName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleCreateSubmit();
                  }}
                  data-testid="input-key-name"
                />
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setCreateDialogOpen(false)}
                  data-testid="button-cancel-create"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateSubmit}
                  disabled={!keyName.trim() || createMutation.isPending}
                  data-testid="button-create-key"
                >
                  {createMutation.isPending ? "Creating..." : "Create Key"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Dialog
          open={showKeyDialogOpen}
          onOpenChange={(open) => {
            setShowKeyDialogOpen(open);
            if (!open) {
              setCreatedKey(null);
              setCopied(false);
            }
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Your New API Key</DialogTitle>
              <DialogDescription>
                Copy your API key now. You will not be able to see it again.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-2 p-3 bg-muted rounded-md border border-border">
                <code
                  className="flex-1 text-sm font-mono break-all select-all"
                  data-testid="text-full-api-key"
                >
                  {createdKey?.key}
                </code>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleCopyKey}
                  data-testid="button-copy-key"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-green-600" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
              <div className="flex items-start gap-2 text-sm text-muted-foreground">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
                <span>
                  This key will only be displayed once. Store it in a secure location.
                  If you lose it, you will need to generate a new one.
                </span>
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={() => setShowKeyDialogOpen(false)}
                data-testid="button-done-key"
              >
                Done
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog
          open={!!revokeTarget}
          onOpenChange={(open) => {
            if (!open) setRevokeTarget(null);
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Revoke API Key</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to revoke the key "{revokeTarget?.name}"?
                Any applications using this key will immediately lose access. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel data-testid="button-cancel-revoke">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (revokeTarget) revokeMutation.mutate(revokeTarget.id);
                }}
                className="bg-destructive text-destructive-foreground"
                data-testid="button-confirm-revoke"
              >
                {revokeMutation.isPending ? "Revoking..." : "Revoke Key"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 rounded-md bg-muted/20 animate-pulse" />
            ))}
          </div>
        ) : !apiKeys || apiKeys.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="bg-muted/30 p-4 rounded-full mb-4">
              <Key className="w-8 h-8 text-muted-foreground/50" />
            </div>
            <h3 className="text-lg font-medium text-foreground">No API keys yet</h3>
            <p className="text-muted-foreground max-w-sm mt-2">
              Generate your first API key to start using the superBrain API.
            </p>
          </div>
        ) : (
          <div className="space-y-3" data-testid="api-keys-list">
            {apiKeys.map((apiKey) => (
              <Card key={apiKey.id} className="p-4" data-testid={`card-api-key-${apiKey.id}`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-foreground" data-testid={`text-key-name-${apiKey.id}`}>
                        {apiKey.name}
                      </span>
                      <Badge
                        variant={apiKey.isActive ? "default" : "secondary"}
                        className="text-xs"
                        data-testid={`badge-key-status-${apiKey.id}`}
                      >
                        {apiKey.isActive ? "Active" : "Revoked"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 mt-1 flex-wrap">
                      <code className="text-sm font-mono text-muted-foreground" data-testid={`text-key-prefix-${apiKey.id}`}>
                        {apiKey.keyPrefix}...
                      </code>
                      <span className="text-xs text-muted-foreground" data-testid={`text-key-created-${apiKey.id}`}>
                        Created {formatDate(apiKey.createdAt)}
                      </span>
                      <span className="text-xs text-muted-foreground" data-testid={`text-key-last-used-${apiKey.id}`}>
                        Last used: {formatDate(apiKey.lastUsedAt)}
                      </span>
                    </div>
                  </div>
                  {apiKey.isActive && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive shrink-0"
                      onClick={() => setRevokeTarget(apiKey)}
                      data-testid={`button-revoke-key-${apiKey.id}`}
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                      Revoke
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
