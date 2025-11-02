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
            <Link href="/terms-of-service">
              <a className="text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="link-terms">
                Terms of Service
              </a>
            </Link>
            <Link href="/privacy-policy">
              <a className="text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="link-privacy">
                Privacy Policy
              </a>
            </Link>
            <Link href="/acceptable-use-policy">
              <a className="text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="link-aup">
                Acceptable Use
              </a>
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
