import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { PRICING_PLANS } from "@shared/pricing";
import { DashboardHeader } from "@/components/DashboardHeader";
import { useState } from "react";

export default function Pricing() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("monthly");

  const handleSelectPlan = (tier: "free" | "pro" | "scale", cycle: "monthly" | "annual") => {
    if (tier === "free") {
      if (user) {
        navigate("/");
      } else {
        window.location.href = "/api/login";
      }
      return;
    }

    if (!user) {
      // Redirect to login, then back to subscribe page
      window.location.href = `/api/login?redirect=/subscribe?tier=${tier}&plan=${cycle}`;
      return;
    }
    navigate(`/subscribe?tier=${tier}&plan=${cycle}`);
  };

  const currentTier = user?.subscriptionTier ?? "free";

  return (
    <div className="min-h-screen bg-background">
      {user && <DashboardHeader />}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Simple, Transparent Pricing</h1>
          <p className="text-xl text-muted-foreground">
            Start free, upgrade when you need more power
          </p>
        </div>

        {/* Billing Cycle Toggle */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex items-center gap-4 bg-muted p-1 rounded-lg">
            <button
              onClick={() => setBillingCycle("monthly")}
              className={`px-6 py-2 rounded-md transition-colors ${
                billingCycle === "monthly"
                  ? "bg-background shadow-sm font-medium"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              data-testid="button-billing-monthly"
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle("annual")}
              className={`px-6 py-2 rounded-md transition-colors flex items-center gap-2 ${
                billingCycle === "annual"
                  ? "bg-background shadow-sm font-medium"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              data-testid="button-billing-annual"
            >
              Annual
              <Badge variant="secondary" className="text-xs">Save 17%</Badge>
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {PRICING_PLANS.map((plan) => {
            const isCurrentPlan = currentTier === plan.tier;
            const price = billingCycle === "monthly" ? plan.monthlyPrice : plan.annualPrice;
            const priceLabel = billingCycle === "monthly" ? "/month" : "/year";
            const monthlyEquivalent = billingCycle === "annual" ? price / 12 : null;

            return (
              <Card 
                key={plan.tier} 
                className={`flex flex-col relative ${plan.popular ? "border-primary shadow-lg" : ""}`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground px-4 py-1">Most Popular</Badge>
                  </div>
                )}
                <CardHeader>
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">${price}</span>
                    <span className="text-muted-foreground ml-2">{plan.tier === "free" ? "forever" : priceLabel}</span>
                    {monthlyEquivalent && (
                      <p className="text-sm text-muted-foreground mt-1">
                        ${monthlyEquivalent.toFixed(2)}/month billed annually
                      </p>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="flex-1">
                  <ul className="space-y-3">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex gap-3">
                        <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button
                    variant={isCurrentPlan ? "secondary" : plan.popular ? "default" : "outline"}
                    className="w-full"
                    disabled={isCurrentPlan}
                    onClick={() => handleSelectPlan(plan.tier, billingCycle)}
                    data-testid={`button-select-${plan.tier}`}
                  >
                    {isCurrentPlan ? "Current Plan" : plan.tier === "free" ? "Get Started" : "Upgrade Now"}
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>

        <div className="mt-16 text-center">
          <h2 className="text-2xl font-bold mb-8">Frequently Asked Questions</h2>
          <div className="max-w-3xl mx-auto space-y-6 text-left">
            <div>
              <h3 className="font-semibold mb-2">Can I switch between monthly and annual billing?</h3>
              <p className="text-muted-foreground">
                Yes! You can upgrade to annual billing at any time and we'll prorate the remaining time on your monthly subscription.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">What happens when I hit the 3-question limit on the free plan?</h3>
              <p className="text-muted-foreground">
                Your chatbot will stop responding to new questions until you upgrade to Pro. You'll still be able to test and demo your chatbot in the dashboard.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">What's the difference between Pro and Scale?</h3>
              <p className="text-muted-foreground">
                Pro is perfect for small to medium businesses with up to 5 chatbots and 5,000 conversations/month. Scale offers unlimited chatbots, 50,000 conversations/month, advanced analytics, and larger knowledge base capacity.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Can I cancel my subscription?</h3>
              <p className="text-muted-foreground">
                Yes, you can cancel anytime. Your chatbots will continue working until the end of your billing period, then you'll be moved to the free plan.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Do you offer refunds?</h3>
              <p className="text-muted-foreground">
                We offer a 14-day money-back guarantee. If you're not satisfied, contact us for a full refund.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
