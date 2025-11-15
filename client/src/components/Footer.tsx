import { Link } from "wouter";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-sm text-muted-foreground">
            © {currentYear} BuildMyChatbot.Ai. All rights reserved.
          </div>
          <nav className="flex flex-wrap gap-6 justify-center items-center">
            <Link href="/blog" className="text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="link-blog-footer">
              Blog
            </Link>
            <Link href="/terms-of-service" className="text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="link-terms">
              Terms of Service
            </Link>
            <Link href="/privacy-policy" className="text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="link-privacy">
              Privacy Policy
            </Link>
            <Link href="/acceptable-use-policy" className="text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="link-aup">
              Acceptable Use
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
