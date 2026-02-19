import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, FileText, FileSpreadsheet } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ExportDropdownProps {
  activeTab: string;
  selectedTag: string | null;
  selectedCollectionId: number | null;
}

export function ExportDropdown({ activeTab, selectedTag, selectedCollectionId }: ExportDropdownProps) {
  const { toast } = useToast();
  const [exporting, setExporting] = useState(false);

  const buildExportUrl = (format: "csv" | "markdown") => {
    const params = new URLSearchParams();
    if (activeTab === "favorites") params.set("favorites", "true");
    if (selectedTag) params.set("tags", selectedTag);
    if (selectedCollectionId) params.set("collectionId", String(selectedCollectionId));
    const qs = params.toString();
    return `/api/posts/export/${format}${qs ? `?${qs}` : ""}`;
  };

  const handleExport = async (format: "csv" | "markdown") => {
    setExporting(true);
    try {
      const url = buildExportUrl(format);
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) {
        throw new Error("Export failed");
      }
      const blob = await res.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      const disposition = res.headers.get("Content-Disposition") || "";
      const filenameMatch = disposition.match(/filename="?(.+?)"?$/);
      a.download = filenameMatch?.[1] || `superbrain-export.${format === "csv" ? "csv" : "md"}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);
      toast({ title: "Export complete", description: `Your posts have been exported as ${format === "csv" ? "CSV" : "Markdown"}.` });
    } catch {
      toast({ title: "Export failed", description: "Something went wrong. Please try again.", variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="rounded-full"
          disabled={exporting}
          data-testid="button-export"
        >
          <Download className="w-4 h-4 mr-2" />
          {exporting ? "Exporting..." : "Export"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleExport("csv")} data-testid="button-export-csv">
          <FileSpreadsheet className="w-4 h-4 mr-2" />
          Export as CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport("markdown")} data-testid="button-export-markdown">
          <FileText className="w-4 h-4 mr-2" />
          Export as Markdown
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
