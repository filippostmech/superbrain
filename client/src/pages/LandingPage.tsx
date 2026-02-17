import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { ArrowRight, Bookmark, Search, Star, Zap } from "lucide-react";
import { SiGithub } from "react-icons/si";
import { Link } from "wouter";

const WORDS = ["LinkedIn", "Substack"];
const TYPING_SPEED = 110;
const ERASING_SPEED = 70;
const PAUSE_AFTER_TYPE = 2000;
const PAUSE_AFTER_ERASE = 400;

function TypewriterText() {
  const [wordIndex, setWordIndex] = useState(0);
  const [displayText, setDisplayText] = useState("");
  const [isErasing, setIsErasing] = useState(false);

  const currentWord = WORDS[wordIndex];

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;

    if (!isErasing) {
      if (displayText.length < currentWord.length) {
        timeout = setTimeout(() => {
          setDisplayText(currentWord.slice(0, displayText.length + 1));
        }, TYPING_SPEED);
      } else {
        timeout = setTimeout(() => setIsErasing(true), PAUSE_AFTER_TYPE);
      }
    } else {
      if (displayText.length > 0) {
        timeout = setTimeout(() => {
          setDisplayText(displayText.slice(0, -1));
        }, ERASING_SPEED);
      } else {
        timeout = setTimeout(() => {
          setWordIndex((prev) => (prev + 1) % WORDS.length);
          setIsErasing(false);
        }, PAUSE_AFTER_ERASE);
      }
    }

    return () => clearTimeout(timeout);
  }, [displayText, isErasing, currentWord]);

  const color = WORDS[wordIndex] === "Substack" ? "text-orange-500" : "text-primary";

  return (
    <span className={color} data-testid="text-typewriter-word">
      {displayText}
      <span className="inline-block w-[3px] h-[0.85em] bg-current ml-[2px] align-baseline animate-blink" />
    </span>
  );
}

export default function LandingPage() {
  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-background font-sans">
      {/* Left Panel - Hero */}
      <div className="flex-1 flex flex-col relative overflow-hidden">
        {/* Background blobs */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-100 rounded-full blur-[120px] opacity-60" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-indigo-50 rounded-full blur-[100px] opacity-60" />
        </div>

        <div className="flex-1 flex flex-col justify-center p-8 lg:p-16 xl:p-24">
        <div className="relative z-10 max-w-2xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="flex items-center gap-2 mb-8">
              <div className="bg-primary p-2 rounded-lg">
                <Bookmark className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold tracking-tight text-foreground">superBrain</span>
            </div>

            <h1 className="text-5xl lg:text-7xl font-bold tracking-tight text-foreground mb-6 leading-[1.1]" data-testid="text-hero-title">
              Your <TypewriterText /><br />
              Second Brain.
            </h1>
            
            <p className="text-xl text-muted-foreground mb-10 leading-relaxed max-w-lg">
              Stop losing valuable insights. Save, organize, and chat with your favorite LinkedIn and Substack posts using our AI assistant.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <Button 
                size="lg" 
                onClick={handleLogin}
                data-testid="button-get-started"
              >
                Get Started
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                asChild
              >
                <a href="https://github.com/filippostmech/superbrain" target="_blank" rel="noopener noreferrer" data-testid="button-github">
                  <SiGithub className="mr-2 w-5 h-5" />
                  <Star className="mr-1 w-4 h-4" />
                  Star on GitHub
                </a>
              </Button>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 1 }}
            className="mt-20 grid grid-cols-3 gap-8 border-t border-border/50 pt-8"
          >
            <div>
              <div className="mb-2 p-2 bg-blue-50 w-fit rounded-lg"><Bookmark className="w-5 h-5 text-primary" /></div>
              <h3 className="font-semibold mb-1">Save Instantly</h3>
              <p className="text-sm text-muted-foreground">One-click save for posts & articles.</p>
            </div>
            <div>
              <div className="mb-2 p-2 bg-indigo-50 w-fit rounded-lg"><Search className="w-5 h-5 text-indigo-600" /></div>
              <h3 className="font-semibold mb-1">Smart Search</h3>
              <p className="text-sm text-muted-foreground">Find anything with semantic search.</p>
            </div>
            <div>
              <div className="mb-2 p-2 bg-purple-50 w-fit rounded-lg"><Zap className="w-5 h-5 text-purple-600" /></div>
              <h3 className="font-semibold mb-1">AI Assistant</h3>
              <p className="text-sm text-muted-foreground">Chat with your saved knowledge.</p>
            </div>
          </motion.div>
        </div>
        </div>

        <footer className="relative z-10 border-t border-border/30 py-4 px-8">
          <div className="max-w-2xl mx-auto flex items-center justify-between flex-wrap gap-4 text-xs text-muted-foreground">
            <span>superBrain</span>
            <div className="flex items-center gap-4 flex-wrap">
              <a href="https://github.com/filippostmech/superbrain" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 underline underline-offset-2 cursor-pointer" data-testid="link-github-footer">
                <SiGithub className="w-3 h-3" />
                GitHub
              </a>
              <Link href="/changelog">
                <a className="underline underline-offset-2 cursor-pointer" data-testid="link-changelog">What's New</a>
              </Link>
            </div>
          </div>
        </footer>
      </div>

      {/* Right Panel - Login CTA */}
      <div className="hidden lg:flex w-[40%] bg-card border-l border-border flex-col items-center justify-center p-12 shadow-2xl z-20">
        <div className="w-full max-w-sm space-y-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold tracking-tight">Welcome back</h2>
            <p className="text-muted-foreground mt-2">Sign in to access your library</p>
          </div>

          <div className="space-y-4">
            <Button 
              className="w-full h-12 text-base rounded-xl" 
              onClick={handleLogin}
            >
              Sign in with Replit
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              By continuing, you agree to our <Link href="/terms" className="underline text-foreground/70" data-testid="link-terms">Terms of Service</Link> and <Link href="/privacy" className="underline text-foreground/70" data-testid="link-privacy">Privacy Policy</Link>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
