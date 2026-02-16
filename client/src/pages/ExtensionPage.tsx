import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { 
  Bookmark, 
  Download, 
  ArrowLeft, 
  Chrome, 
  Globe, 
  MousePointer, 
  Puzzle, 
  Shield
} from "lucide-react";
import { Link } from "wouter";

export default function ExtensionPage() {
  const { user } = useAuth();

  const steps = [
    {
      icon: Download,
      title: "Download the Extension",
      description: "Click the button below to download the extension files as a ZIP. Extract them to a folder on your computer.",
    },
    {
      icon: Puzzle,
      title: "Open Chrome Extensions",
      description: 'Go to chrome://extensions in your browser and enable "Developer mode" in the top right corner.',
    },
    {
      icon: Globe,
      title: "Load the Extension",
      description: 'Click "Load unpacked" and select the folder where you extracted the extension files.',
    },
    {
      icon: MousePointer,
      title: "Start Saving Posts",
      description: 'Browse LinkedIn and click "Save to superBrain" on any post. Or use the extension popup to import an entire page of saved posts.',
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="h-16 border-b border-border/60 bg-white/80 backdrop-blur-md px-4 lg:px-6 flex items-center justify-between z-30">
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
      </header>

      <main className="max-w-3xl mx-auto p-4 sm:p-6 lg:p-8">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center bg-primary/10 p-4 rounded-2xl mb-4">
            <Chrome className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2" data-testid="text-extension-title">
            Chrome Extension
          </h1>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Save LinkedIn posts directly from your feed with a single click. The extension integrates seamlessly with your superBrain account.
          </p>
        </div>

        <div className="space-y-4 mb-10">
          {steps.map((step, i) => (
            <Card key={i} className="p-5">
              <div className="flex items-start gap-4">
                <div className="flex items-center justify-center bg-primary/10 p-2.5 rounded-xl shrink-0">
                  <step.icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold text-primary bg-primary/10 rounded-full px-2 py-0.5">
                      Step {i + 1}
                    </span>
                  </div>
                  <h3 className="font-semibold text-foreground mb-1">{step.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>

        <div className="text-center space-y-3">
          <a href="/extension/contenthub-extension.zip" download>
            <Button size="lg" className="rounded-full shadow-lg" data-testid="button-download-extension">
              <Download className="w-5 h-5 mr-2" />
              Download Extension
            </Button>
          </a>
          <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
            <Shield className="w-3 h-3" />
            Requires Chrome or any Chromium-based browser
          </p>
        </div>

        <Card className="mt-10 p-5">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-foreground mb-1">Privacy & Security</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                The extension only activates on LinkedIn pages. It uses your existing superBrain session for authentication - no additional passwords or API keys required. All data is sent directly to your superBrain account and is never shared with third parties.
              </p>
            </div>
          </div>
        </Card>
      </main>
    </div>
  );
}
