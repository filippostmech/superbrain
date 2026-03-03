import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/hooks/use-theme";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";

import NotFound from "@/pages/not-found";
import LandingPage from "@/pages/LandingPage";
import LibraryPage from "@/pages/LibraryPage";
import DashboardPage from "@/pages/DashboardPage";
import ExtensionPage from "@/pages/ExtensionPage";
import ChangelogPage from "@/pages/ChangelogPage";
import TermsPage from "@/pages/TermsPage";
import PrivacyPage from "@/pages/PrivacyPage";
import DevelopersPage from "@/pages/DevelopersPage";
import ApiKeysPage from "@/pages/ApiKeysPage";
import KnowledgeGraphPage from "@/pages/KnowledgeGraphPage";

function Router() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Switch>
      <Route path="/terms" component={TermsPage} />
      <Route path="/privacy" component={PrivacyPage} />
      {!user ? (
        <>
          <Route path="/" component={LandingPage} />
          <Route path="/changelog" component={ChangelogPage} />
          <Route path="/developers" component={DevelopersPage} />
        </>
      ) : (
        <>
          <Route path="/" component={LibraryPage} />
          <Route path="/dashboard" component={DashboardPage} />
          <Route path="/extension" component={ExtensionPage} />
          <Route path="/api-keys" component={ApiKeysPage} />
          <Route path="/knowledge-graph" component={KnowledgeGraphPage} />
          <Route path="/changelog" component={ChangelogPage} />
          <Route path="/developers" component={DevelopersPage} />
        </>
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <Router />
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
