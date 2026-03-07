import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { 
  Download, 
  Chrome, 
  Globe, 
  MousePointer, 
  Puzzle, 
  Shield,
  MessageSquare,
  Upload,
} from "lucide-react";
import AppLayout from "@/components/AppLayout";

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
      title: "Start Saving Content",
      description: 'Browse LinkedIn or ChatGPT and click "Save to superBrain" on any post or conversation.',
    },
  ];

  return (
    <AppLayout>
      <main className="max-w-3xl mx-auto p-4 sm:p-6 lg:p-8">
        <div className="text-center mb-6 sm:mb-10">
          <div className="inline-flex items-center justify-center bg-primary/10 p-4 rounded-2xl mb-4">
            <Chrome className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2" data-testid="text-extension-title">
            Chrome Extension
          </h1>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Save LinkedIn posts and ChatGPT conversations directly from your browser with a single click. The extension integrates seamlessly with your superBrain account.
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

        <div className="mt-10 space-y-4">
          <h2 className="text-xl font-bold text-foreground" data-testid="text-supported-platforms">Supported Platforms</h2>

          <Card className="p-5">
            <div className="flex items-start gap-3">
              <div className="flex items-center justify-center bg-blue-100 dark:bg-blue-950 p-2 rounded-xl shrink-0">
                <Globe className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-1">LinkedIn</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  "Save to superBrain" buttons appear directly on LinkedIn feed posts. Click to save any post with its content, author, and metadata. The extension popup also supports bulk-importing an entire page of saved posts.
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-start gap-3">
              <div className="flex items-center justify-center bg-green-100 dark:bg-green-950 p-2 rounded-xl shrink-0">
                <MessageSquare className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-1">ChatGPT</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Open any ChatGPT conversation or shared link and a floating "Save to superBrain" button appears in the bottom-right corner. The full conversation (user prompts and AI responses) is saved as a single post. You can also bulk-import all your ChatGPT conversations via Settings &gt; Data Controls &gt; Export in ChatGPT, then use the Bulk Import feature in your Library.
                </p>
              </div>
            </div>
          </Card>
        </div>

        <Card className="mt-6 p-5">
          <div className="flex items-start gap-3">
            <Upload className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-foreground mb-1">Bulk Import from ChatGPT</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Want to import all your ChatGPT conversations at once? Go to ChatGPT Settings &gt; Data Controls &gt; Export Data. You'll receive a ZIP with a <code className="text-xs bg-muted px-1 py-0.5 rounded">conversations.json</code> file. Upload it using the Bulk Import button in your Library — each conversation becomes a separate post.
              </p>
            </div>
          </div>
        </Card>

        <Card className="mt-4 p-5">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-foreground mb-1">Privacy & Security</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                The extension only activates on LinkedIn and ChatGPT pages. It uses your existing superBrain session for authentication — no additional passwords or API keys required. All data is sent directly to your superBrain account and is never shared with third parties.
              </p>
            </div>
          </div>
        </Card>
      </main>
    </AppLayout>
  );
}
