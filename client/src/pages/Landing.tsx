import { Button } from "@/components/ui/button";
import { Bot, MessageSquare, Sparkles, Zap, DollarSign, Check } from "lucide-react";
import { Link } from "wouter";
import { Logo } from "@/components/Logo";
import { Footer } from "@/components/Footer";
import { PRICING_PLANS } from "../../../shared/pricing";

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
        <div className="max-w-7xl mx-auto mt-24">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Simple, Transparent Pricing</h2>
            <p className="text-lg text-muted-foreground">
              Start free, upgrade as you grow
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {PRICING_PLANS.map((plan) => (
              <div
                key={plan.tier}
                className={`p-6 rounded-lg border bg-card relative flex flex-col ${
                  plan.popular ? "border-2 border-primary" : ""
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm font-medium">
                    Most Popular
                  </div>
                )}
                <div className="mb-6">
                  <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold">${plan.monthlyPrice}</span>
                    <span className="text-muted-foreground">/month</span>
                  </div>
                  {plan.annualPrice > 0 && (
                    <p className="text-sm text-muted-foreground mt-1">
                      or ${plan.annualPrice}/year
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground mt-2">{plan.description}</p>
                </div>
                <ul className="space-y-2 mb-6 flex-1">
                  {plan.features.slice(0, 6).map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  variant={plan.tier === "free" ? "outline" : plan.popular ? "default" : "outline"}
                  className="w-full"
                  onClick={() => window.location.href = plan.tier === "free" ? "/register" : "/pricing"}
                  data-testid={`button-plan-${plan.tier}`}
                >
                  {plan.tier === "free" ? "Get Started Free" : `Choose ${plan.name}`}
                </Button>
              </div>
            ))}
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
