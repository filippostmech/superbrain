import { motion } from "framer-motion";
import { ArrowLeft, Sun, Moon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { useTheme } from "@/hooks/use-theme";
import changelogData from "@/data/changelog.json";

interface ChangelogEntry {
  category: string;
  items: string[];
}

interface ChangelogRelease {
  date: string;
  version: string;
  entries: ChangelogEntry[];
}

type CategoryVariant = "default" | "secondary" | "destructive" | "outline";

function getCategoryVariant(category: string): CategoryVariant {
  switch (category.toLowerCase()) {
    case "new":
      return "default";
    case "improved":
      return "secondary";
    case "fixed":
      return "outline";
    default:
      return "secondary";
  }
}

export default function ChangelogPage() {
  const releases = changelogData as ChangelogRelease[];
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 sticky top-0 z-[1000] bg-background/95 backdrop-blur">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon" data-testid="button-back-home">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <span className="text-lg font-semibold tracking-tight">superBrain</span>
          </div>
          <Button variant="ghost" size="icon" onClick={toggleTheme} data-testid="button-theme-toggle">
            {theme === "light" ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
          </Button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <h1 className="text-4xl font-bold tracking-tight mb-2" data-testid="text-changelog-title">Changelog</h1>
          <p className="text-lg text-muted-foreground mb-12">Follow superBrain updates and improvements.</p>
        </motion.div>

        <div className="space-y-0">
          {releases.map((release, index) => (
            <motion.div
              key={`${release.version}-${index}`}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.08 }}
              className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-4 md:gap-8 py-10 border-t border-border/40"
              data-testid={`changelog-entry-${release.version}`}
            >
              <div className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-foreground" data-testid={`text-date-${release.version}`}>
                  {release.date}
                </span>
                <span className="text-sm text-muted-foreground">{release.version}</span>
              </div>

              <div className="space-y-6">
                {release.entries.map((entry, entryIdx) => (
                  <div key={entryIdx}>
                    {(release.entries.length > 1 || entry.category.toLowerCase() !== "new") && (
                      <div className="mb-3">
                        <Badge
                          variant={getCategoryVariant(entry.category)}
                          data-testid={`badge-category-${release.version}-${entryIdx}`}
                        >
                          {entry.category}
                        </Badge>
                      </div>
                    )}

                    <ul className="space-y-2">
                      {entry.items.map((item, itemIdx) => (
                        <li key={itemIdx} className="flex gap-3 text-sm text-muted-foreground leading-relaxed">
                          <span className="mt-2 w-1.5 h-1.5 rounded-full bg-muted-foreground/40 flex-shrink-0" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </main>
    </div>
  );
}
