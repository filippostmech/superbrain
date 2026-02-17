import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 sticky top-0 z-[1000] bg-background/95 backdrop-blur">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="icon" data-testid="button-back-home">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <span className="text-lg font-semibold tracking-tight">superBrain</span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <h1 className="text-4xl font-bold tracking-tight mb-2" data-testid="text-terms-title">Terms of Service</h1>
          <p className="text-sm text-muted-foreground mb-12">Last updated: February 17, 2026</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="prose prose-sm max-w-none text-muted-foreground space-y-8"
        >
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">1. Acceptance of Terms</h2>
            <p>By accessing or using superBrain ("the Service"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the Service.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">2. Description of Service</h2>
            <p>superBrain is a content management tool that allows users to save, organize, search, and interact with content from platforms such as LinkedIn and Substack. The Service includes features such as URL scraping, AI-powered search, bulk import, and a browser extension.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">3. User Accounts</h2>
            <p>You must sign in using a valid Replit account to access the Service. You are responsible for maintaining the security of your account and for all activities that occur under your account. You must notify us immediately of any unauthorized use.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">4. User Content</h2>
            <p>You retain ownership of any content you save to superBrain. By using the Service, you grant us a limited license to store, process, and display your content solely for the purpose of providing the Service to you. We do not claim ownership of your saved posts, notes, or any other content.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">5. Acceptable Use</h2>
            <p>You agree not to:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>Use the Service for any unlawful purpose</li>
              <li>Attempt to gain unauthorized access to any part of the Service</li>
              <li>Interfere with or disrupt the Service or its infrastructure</li>
              <li>Use automated tools to scrape or overload the Service beyond normal usage</li>
              <li>Upload malicious content or attempt to exploit vulnerabilities</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">6. AI Features</h2>
            <p>The Service uses AI-powered features (including semantic search and content analysis) provided through third-party APIs. AI-generated results are provided "as is" and may not always be accurate. You should not rely on AI outputs as the sole basis for important decisions.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">7. Third-Party Content</h2>
            <p>superBrain allows you to save and organize content from third-party platforms. We are not responsible for the accuracy, legality, or availability of third-party content. You are responsible for ensuring your use of saved content complies with the original platform's terms of service.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">8. Service Availability</h2>
            <p>We strive to keep the Service available at all times but do not guarantee uninterrupted access. The Service may be temporarily unavailable due to maintenance, updates, or circumstances beyond our control.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">9. Limitation of Liability</h2>
            <p>The Service is provided "as is" without warranties of any kind. To the maximum extent permitted by law, we shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the Service, including loss of data or content.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">10. Changes to Terms</h2>
            <p>We may update these Terms of Service from time to time. Continued use of the Service after changes constitutes acceptance of the updated terms. We will make reasonable efforts to notify users of significant changes.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">11. Contact</h2>
            <p>If you have questions about these Terms of Service, you can reach us through our <a href="https://github.com/filippostmech/superbrain" className="text-primary underline" data-testid="link-github-repo">GitHub repository</a>.</p>
          </section>
        </motion.div>
      </main>
    </div>
  );
}
