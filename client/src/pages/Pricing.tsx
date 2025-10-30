import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { PRICING_PLANS } from "@shared/pricing";
import { DashboardHeader } from "@/components/DashboardHeader";

export default function Pricing() {
  const { user } = useAuth();
  const [, navigate] = useLocation();

  const handleSelectPlan = (billingCycle: "monthly" | "annual") => {
    if (!user) {
      // Redirect to login, then back to subscribe page
      window.location.href = `/api/login?redirect=/subscribe?plan=${billingCycle}`;
      return;
    }
    navigate(`/subscribe?plan=${billingCycle}`);
  };

  const freePlan = PRICING_PLANS.free;
  const paidPlan = PRICING_PLANS.paid;
  const isCurrentlyFree = user?.subscriptionTier === "free";

  return (
    <div className="min-h-screen bg-background">
      {user && <DashboardHeader />}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Simple, Transparent Pricing</h1>
          <p className="text-xl text-muted-foreground">
            Start free, upgrade when you're ready to go live
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          <Card className="flex flex-col">
            <CardHeader>
              <CardTitle className="text-2xl">{freePlan.name}</CardTitle>
              <CardDescription>Test and demo your chatbot</CardDescription>
              <div className="mt-4">
                <span className="text-4xl font-bold">${freePlan.monthlyPrice}</span>
                <span className="text-muted-foreground ml-2">forever</span>
              </div>
            </CardHeader>
            <CardContent className="flex-1">
              <ul className="space-y-3">
                {freePlan.features.map((feature, i) => (
                  <li key={i} className="flex gap-3">
                    {feature.included ? (
                      <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    ) : (
                      <X className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                    )}
                    <div>
                      <span className={feature.included ? "" : "text-muted-foreground"}>
                        {feature.name}
                      </span>
                      {feature.details && (
                        <p className="text-sm text-muted-foreground">{feature.details}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              <Button
                variant={isCurrentlyFree ? "secondary" : "outline"}
                className="w-full"
                disabled={isCurrentlyFree}
                data-testid="button-select-free"
              >
                {isCurrentlyFree ? "Current Plan" : "Get Started"}
              </Button>
            </CardFooter>
          </Card>

          <Card className="flex flex-col border-primary shadow-lg relative">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2">
              <Badge className="bg-primary text-primary-foreground px-4 py-1">Most Popular</Badge>
            </div>
            <CardHeader>
              <CardTitle className="text-2xl">{paidPlan.name}</CardTitle>
              <CardDescription>Full power, unlimited everything</CardDescription>
              <div className="mt-4">
                <span className="text-4xl font-bold">${paidPlan.monthlyPrice}</span>
                <span className="text-muted-foreground ml-2">/month</span>
              </div>
            </CardHeader>
            <CardContent className="flex-1">
              <ul className="space-y-3">
                {paidPlan.features.map((feature, i) => (
                  <li key={i} className="flex gap-3">
                    <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <span>{feature.name}</span>
                      {feature.details && (
                        <p className="text-sm text-muted-foreground">{feature.details}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              <Button
                className="w-full"
                onClick={() => handleSelectPlan("monthly")}
                data-testid="button-select-monthly"
              >
                Subscribe Monthly
              </Button>
            </CardFooter>
          </Card>

          <Card className="flex flex-col border-primary/50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-2xl">{paidPlan.name}</CardTitle>
                <Badge variant="outline" className="text-xs">Save $60/year</Badge>
              </div>
              <CardDescription>Pay annually, save 17%</CardDescription>
              <div className="mt-4">
                <span className="text-4xl font-bold">${paidPlan.annualPrice}</span>
                <span className="text-muted-foreground ml-2">/year</span>
                <p className="text-sm text-muted-foreground mt-1">
                  ${(paidPlan.annualPrice / 12).toFixed(2)}/month billed annually
                </p>
              </div>
            </CardHeader>
            <CardContent className="flex-1">
              <ul className="space-y-3">
                {paidPlan.features.map((feature, i) => (
                  <li key={i} className="flex gap-3">
                    <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <span>{feature.name}</span>
                      {feature.details && (
                        <p className="text-sm text-muted-foreground">{feature.details}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => handleSelectPlan("annual")}
                data-testid="button-select-annual"
              >
                Subscribe Annually
              </Button>
            </CardFooter>
          </Card>
        </div>

        <div className="mt-16 text-center">
          <h2 className="text-2xl font-bold mb-8">Frequently Asked Questions</h2>
          <div className="max-w-3xl mx-auto space-y-6 text-left">
            <div>
              <h3 className="font-semibold mb-2">Can I switch from monthly to annual billing?</h3>
              <p className="text-muted-foreground">
                Yes! You can upgrade to annual billing at any time and we'll prorate the remaining time on your monthly subscription.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">What happens when I hit the 3-question limit on the free plan?</h3>
              <p className="text-muted-foreground">
                Your chatbot will stop responding to new questions until you upgrade to the Pro plan. You'll still be able to test and demo your chatbot in the dashboard.
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
