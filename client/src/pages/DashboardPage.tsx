import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, ArrowRight } from "lucide-react";
import AppLayout from "@/components/AppLayout";

export default function DashboardPage() {
  return (
    <AppLayout>
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
        <div className="bg-primary/10 p-6 rounded-2xl mb-6">
          <LayoutDashboard className="w-12 h-12 text-primary" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground mb-3" data-testid="text-dashboard-title">
          Dashboard
        </h1>
        <p className="text-muted-foreground max-w-md mb-8">
          Analytics and insights about your saved content will appear here. Stay tuned for reading stats, activity trends, and more.
        </p>
        <Link href="/">
          <Button data-testid="button-go-to-library">
            Go to Library
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </Link>
      </div>
    </AppLayout>
  );
}
