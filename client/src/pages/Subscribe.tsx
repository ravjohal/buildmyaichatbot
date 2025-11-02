import { useStripe, Elements, PaymentElement, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useEffect, useState } from 'react';
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PRICING_PLANS } from "@shared/pricing";
import { DashboardHeader } from "@/components/DashboardHeader";

// Automatically choose test or live Stripe key based on environment
// REPLIT_DEPLOYMENT is set when published (production)
const isProduction = import.meta.env.REPLIT_DEPLOYMENT === "1";

const stripePublicKey = isProduction
  ? (import.meta.env.VITE_STRIPE_LIVE_PUBLIC_KEY || import.meta.env.VITE_STRIPE_PUBLIC_KEY)  // Production: use live key
  : (import.meta.env.VITE_STRIPE_TEST_PUBLIC_KEY || import.meta.env.TESTING_VITE_STRIPE_PUBLIC_KEY || import.meta.env.VITE_STRIPE_PUBLIC_KEY);  // Development: use test key

if (!stripePublicKey) {
  throw new Error('Missing required Stripe public key. Set VITE_STRIPE_TEST_PUBLIC_KEY or VITE_STRIPE_LIVE_PUBLIC_KEY');
}

console.log(`[Stripe] Using ${isProduction ? 'LIVE' : 'TEST'} mode public key`);
const stripePromise = loadStripe(stripePublicKey);

const SubscribeForm = ({ billingCycle, tier }: { billingCycle: "monthly" | "annual", tier: "pro" | "scale" }) => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [isProcessing, setIsProcessing] = useState(false);
  
  const selectedPlan = PRICING_PLANS.find(p => p.tier === tier);
  if (!selectedPlan) {
    throw new Error(`Invalid tier: ${tier}`);
  }
  const price = billingCycle === "monthly" ? selectedPlan.monthlyPrice : selectedPlan.annualPrice;
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('[Subscribe] Form submitted');
    console.log('[Subscribe] Stripe:', !!stripe, 'Elements:', !!elements);

    if (!stripe || !elements) {
      console.log('[Subscribe] Missing stripe or elements, aborting');
      toast({
        title: "Error",
        description: "Payment system not ready. Please refresh and try again.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    console.log('[Subscribe] Confirming payment...');

    // Submit the elements to ensure payment method is collected
    const { error: submitError } = await elements.submit();
    if (submitError) {
      console.error('[Subscribe] Elements submit failed:', submitError);
      toast({
        title: "Payment Error",
        description: submitError.message || "Please fill in all required payment fields.",
        variant: "destructive",
      });
      setIsProcessing(false);
      return;
    }
    console.log('[Subscribe] Elements submitted successfully');

    try {
      // Create a timeout promise (15 seconds)
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Payment confirmation timeout')), 15000);
      });

      // Race between payment confirmation and timeout
      const confirmPromise = stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/?payment=success`,
        },
      });

      const { error } = await Promise.race([confirmPromise, timeoutPromise]) as any;

      console.log('[Subscribe] Payment result:', { error: error?.message || 'none' });

      if (error) {
        console.error('[Subscribe] Payment failed:', error);
        toast({
          title: "Payment Failed",
          description: error.message || "Unable to process payment. Please check your payment details and try again.",
          variant: "destructive",
        });
        setIsProcessing(false);
      }
      // If no error, the page will redirect to return_url
    } catch (err: any) {
      console.error('[Subscribe] Unexpected error:', err);
      
      if (err.message === 'Payment confirmation timeout') {
        toast({
          title: "Payment Timeout",
          description: "Payment confirmation is taking too long. Please refresh and check your account page, or contact support.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Payment Error",
          description: "An unexpected error occurred. Please try again.",
          variant: "destructive",
        });
      }
      setIsProcessing(false);
    }
  };

  const annualSavings = billingCycle === "annual" 
    ? (selectedPlan.monthlyPrice * 12 - selectedPlan.annualPrice).toFixed(0)
    : "0";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-muted p-4 rounded-md mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="font-medium">{selectedPlan.name} ({billingCycle === "monthly" ? "Monthly" : "Annual"})</span>
          <span className="text-2xl font-bold">${price}</span>
        </div>
        <p className="text-sm text-muted-foreground">
          {billingCycle === "monthly" 
            ? "Billed monthly" 
            : `Billed annually • Save $${annualSavings}/year`}
        </p>
      </div>
      
      <PaymentElement />
      
      <Button 
        type="submit" 
        className="w-full" 
        disabled={!stripe || isProcessing}
        data-testid="button-submit-payment"
      >
        {isProcessing ? "Processing..." : `Subscribe for $${price}`}
      </Button>
      
      <p className="text-xs text-center text-muted-foreground">
        By subscribing, you agree to our Terms of Service. Cancel anytime.
      </p>
    </form>
  );
};

export default function Subscribe() {
  const [, navigate] = useLocation();
  const [clientSecret, setClientSecret] = useState("");
  const { toast } = useToast();
  
  // Use window.location.search to get query parameters (wouter's location doesn't include them)
  const params = new URLSearchParams(window.location.search);
  const billingCycle = (params.get('plan') as "monthly" | "annual") || "monthly";
  const tier = (params.get('tier') as "pro" | "scale") || "pro";

  useEffect(() => {
    apiRequest("POST", "/api/create-subscription", { billingCycle, tier })
      .then((res) => res.json())
      .then((data) => {
        console.log("Subscription response:", data);
        if (!data.clientSecret) {
          toast({
            title: "Error",
            description: "No payment client secret received. Please check your Stripe price IDs.",
            variant: "destructive",
          });
          navigate("/pricing");
          return;
        }
        setClientSecret(data.clientSecret);
      })
      .catch((error) => {
        toast({
          title: "Error",
          description: "Failed to initialize payment. Please try again.",
          variant: "destructive",
        });
        console.error("Subscription creation error:", error);
        navigate("/pricing");
      });
  }, [billingCycle, tier, toast, navigate]);

  if (!clientSecret) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardHeader />
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" aria-label="Loading"/>
        </div>
      </div>
    );
  }

  const selectedPlan = PRICING_PLANS.find(p => p.tier === tier);
  const planName = selectedPlan?.name || "Pro";

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />
      <div className="container mx-auto px-4 max-w-2xl py-16">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Complete Your Subscription</h1>
          <p className="text-muted-foreground">
            Upgrade to {planName} and unlock powerful features for your chatbots
          </p>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Payment Details</CardTitle>
            <CardDescription>
              Enter your payment information to complete your subscription
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Elements 
              stripe={stripePromise} 
              options={{ clientSecret }}
              key={clientSecret}
            >
              <SubscribeForm billingCycle={billingCycle} tier={tier} />
            </Elements>
          </CardContent>
        </Card>
        
        <div className="mt-6 text-center">
          <Button 
            variant="ghost" 
            onClick={() => navigate("/pricing")}
            data-testid="button-back-to-pricing"
          >
            Back to Pricing
          </Button>
        </div>
      </div>
    </div>
  );
}
