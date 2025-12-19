import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X, Cookie } from "lucide-react";
import { Link } from "wouter";

export function CookieConsent() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem("cookie-consent");
    if (!consent) {
      setIsVisible(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem("cookie-consent", "accepted");
    localStorage.setItem("cookie-consent-date", new Date().toISOString());
    setIsVisible(false);
  };

  const handleDecline = () => {
    localStorage.setItem("cookie-consent", "declined");
    localStorage.setItem("cookie-consent-date", new Date().toISOString());
    setIsVisible(false);
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/90 border-t shadow-lg"
      data-testid="cookie-consent-banner"
    >
      <div className="max-w-7xl mx-auto px-6 py-4 pr-28">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between">
          <div className="flex items-start gap-3 flex-1">
            <Cookie className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
            <div className="space-y-1">
              <p className="text-sm font-medium">We use cookies</p>
              <p className="text-sm text-muted-foreground">
                We use essential cookies to make our site work. We'd also like to use analytics cookies to understand how you use our service and improve your experience.{" "}
                <Link href="/privacy-policy">
                  <a className="text-primary hover:underline font-medium" data-testid="link-privacy-cookie" target="_blank" rel="noopener noreferrer">
                    Learn more
                  </a>
                </Link>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0 w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDecline}
              data-testid="button-decline-cookies"
              className="flex-1 sm:flex-none"
            >
              Decline
            </Button>
            <Button
              size="sm"
              onClick={handleAccept}
              data-testid="button-accept-cookies"
              className="flex-1 sm:flex-none"
            >
              Accept All
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
