import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export default function PrivacyPage() {
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
          <h1 className="text-4xl font-bold tracking-tight mb-2" data-testid="text-privacy-title">Privacy Policy</h1>
          <p className="text-sm text-muted-foreground mb-12">Last updated: February 17, 2026</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="prose prose-sm max-w-none text-muted-foreground space-y-8"
        >
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">1. Information We Collect</h2>
            <p>When you use superBrain, we collect the following information:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li><strong className="text-foreground">Account information:</strong> Your name, email address, and profile image provided through Replit authentication</li>
              <li><strong className="text-foreground">Saved content:</strong> Posts, URLs, tags, notes, and other content you choose to save to your library</li>
              <li><strong className="text-foreground">Usage data:</strong> Search queries and interactions with AI features to provide and improve the Service</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">2. How We Use Your Information</h2>
            <p>We use your information to:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>Provide, maintain, and improve the Service</li>
              <li>Store and organize your saved content</li>
              <li>Power AI-based search and content analysis features</li>
              <li>Authenticate your identity and protect your account</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">3. Third-Party Services</h2>
            <p>superBrain integrates with the following third-party services:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li><strong className="text-foreground">Replit:</strong> Used for authentication (sign-in). Replit receives your login credentials. See <a href="https://replit.com/site/privacy" className="text-primary underline" target="_blank" rel="noopener noreferrer" data-testid="link-replit-privacy">Replit's Privacy Policy</a>.</li>
              <li><strong className="text-foreground">OpenAI:</strong> Used to power AI search and content analysis. Your search queries and relevant saved content may be sent to OpenAI's API for processing. See <a href="https://openai.com/policies/privacy-policy" className="text-primary underline" target="_blank" rel="noopener noreferrer" data-testid="link-openai-privacy">OpenAI's Privacy Policy</a>.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">4. Data Storage and Security</h2>
            <p>Your data is stored in a PostgreSQL database hosted on Replit's infrastructure. We use industry-standard security measures including encrypted connections and session-based authentication to protect your data. However, no method of transmission or storage is 100% secure.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">5. Data Retention</h2>
            <p>We retain your data for as long as your account is active. Your saved content remains in your library until you choose to delete it. If you wish to delete your account and all associated data, please contact us through our GitHub repository.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">6. Your Rights</h2>
            <p>You have the right to:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>Access and export your saved content at any time</li>
              <li>Delete individual posts or your entire library</li>
              <li>Request deletion of your account and associated data</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">7. Cookies and Sessions</h2>
            <p>superBrain uses session cookies to keep you signed in. These are essential for the Service to function and are not used for tracking or advertising purposes.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">8. Children's Privacy</h2>
            <p>The Service is not intended for users under the age of 13. We do not knowingly collect personal information from children under 13.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">9. Changes to This Policy</h2>
            <p>We may update this Privacy Policy from time to time. We will make reasonable efforts to notify users of significant changes. Continued use of the Service after changes constitutes acceptance of the updated policy.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">10. Contact</h2>
            <p>If you have questions about this Privacy Policy, you can reach us through our <a href="https://github.com/filippostmech/superbrain" className="text-primary underline" data-testid="link-github-repo">GitHub repository</a>.</p>
          </section>
        </motion.div>
      </main>
    </div>
  );
}
