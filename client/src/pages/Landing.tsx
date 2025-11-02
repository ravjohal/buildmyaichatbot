import { Button } from "@/components/ui/button";
import { Bot, MessageSquare, Sparkles, Zap, DollarSign, Check } from "lucide-react";
import { Link } from "wouter";
import { Logo } from "@/components/Logo";
import { Footer } from "@/components/Footer";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header Navigation */}
      <header className="border-b sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Logo size="sm" />
            <nav className="flex items-center gap-4">
              <Link href="/pricing">
                <Button variant="ghost" data-testid="link-pricing">
                  Pricing
                </Button>
              </Link>
              <Button
                variant="default"
                onClick={() => window.location.href = "/login"}
                data-testid="button-login-header"
              >
                Sign In
              </Button>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="space-y-4">
            <h1 className="text-5xl font-bold tracking-tight">
              Build Your AI Support Assistant
              <span className="block text-primary mt-2">In Minutes</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Create intelligent chatbots for your website with BuildMyChatbot.Ai. Train on your content,
              customize the design, and deploy with a single line of code.
            </p>
          </div>

          <div className="flex justify-center gap-4">
            <Button
              size="lg"
              onClick={() => window.location.href = "/register"}
              data-testid="button-get-started"
            >
              Get Started Free
            </Button>
            <Link href="/pricing">
              <Button size="lg" variant="outline" data-testid="button-view-pricing">
                View Pricing
              </Button>
            </Link>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mt-16">
            <div className="space-y-3 p-6 rounded-lg border bg-card">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Bot className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold">AI-Powered Responses</h3>
              <p className="text-sm text-muted-foreground">
                Powered by Google Gemini AI to provide intelligent, context-aware answers to your customers.
              </p>
            </div>

            <div className="space-y-3 p-6 rounded-lg border bg-card">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold">Easy Customization</h3>
              <p className="text-sm text-muted-foreground">
                Customize colors, upload your logo, and configure personality to match your brand perfectly.
              </p>
            </div>

            <div className="space-y-3 p-6 rounded-lg border bg-card">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Zap className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold">One-Click Deploy</h3>
              <p className="text-sm text-muted-foreground">
                Copy the embed code and add it to any website. Your chatbot will be live instantly.
              </p>
            </div>
          </div>
        </div>

        {/* Pricing Preview Section */}
        <div className="max-w-6xl mx-auto mt-24">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Simple, Transparent Pricing</h2>
            <p className="text-lg text-muted-foreground">
              Start free, upgrade when you need unlimited chatbots
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className="p-8 rounded-lg border bg-card">
              <div className="mb-6">
                <h3 className="text-2xl font-bold mb-2">Free</h3>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold">$0</span>
                  <span className="text-muted-foreground">forever</span>
                </div>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-primary flex-shrink-0" />
                  <span>1 AI chatbot</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-primary flex-shrink-0" />
                  <span>3 questions per chatbot</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-primary flex-shrink-0" />
                  <span>Test & demo mode</span>
                </li>
              </ul>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => window.location.href = "/register"}
                data-testid="button-start-free"
              >
                Get Started Free
              </Button>
            </div>

            <div className="p-8 rounded-lg border-2 border-primary bg-card relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm font-medium">
                Most Popular
              </div>
              <div className="mb-6">
                <h3 className="text-2xl font-bold mb-2">Pro</h3>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold">$29.99</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">or $300/year (save $60)</p>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-primary flex-shrink-0" />
                  <span className="font-medium">Unlimited chatbots</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-primary flex-shrink-0" />
                  <span className="font-medium">Unlimited questions</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-primary flex-shrink-0" />
                  <span className="font-medium">Full customization</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-primary flex-shrink-0" />
                  <span className="font-medium">Website embedding</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-primary flex-shrink-0" />
                  <span className="font-medium">Analytics dashboard</span>
                </li>
              </ul>
              <Link href="/pricing">
                <Button className="w-full" data-testid="button-upgrade-pro-landing">
                  Upgrade to Pro
                </Button>
              </Link>
            </div>
          </div>

          <div className="text-center mt-8">
            <Link href="/pricing">
              <Button variant="ghost" data-testid="link-full-pricing">
                View full pricing details →
              </Button>
            </Link>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
