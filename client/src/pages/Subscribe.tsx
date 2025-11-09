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
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

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

const SubscribeForm = ({ billingCycle, tier }: { billingCycle: "monthly" | "annual", tier: "starter" | "business" | "scale" }) => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPaymentReady, setIsPaymentReady] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  
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
      setPaymentError("Payment system not ready. Please wait a moment and try again.");
      toast({
        title: "Payment System Not Ready",
        description: "The payment form is still loading. Please wait a moment and try again.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    setPaymentError(null);
    console.log('[Subscribe] Confirming payment...');

    // Submit the elements to ensure payment method is collected
    const { error: submitError } = await elements.submit();
    if (submitError) {
      console.error('[Subscribe] Elements submit failed:', submitError);
      const errorMessage = submitError.message || "Please fill in all required payment fields (card number, expiry date, CVC, and ZIP code).";
      setPaymentError(errorMessage);
      toast({
        title: "Payment Information Required",
        description: errorMessage,
        variant: "destructive",
      });
      setIsProcessing(false);
      return;
    }
    console.log('[Subscribe] Elements submitted successfully');

    try {
      // Show processing toast
      toast({
        title: "Processing Payment",
        description: "Please wait while we confirm your payment...",
      });

      // Create a timeout promise (30 seconds - increased from 15)
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Payment confirmation timeout')), 30000);
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
        const errorMessage = error.message || "Unable to process payment. Please check your payment details and try again.";
        setPaymentError(errorMessage);
        toast({
          title: "Payment Failed",
          description: errorMessage,
          variant: "destructive",
        });
        setIsProcessing(false);
      } else {
        // Payment successful - show success message
        toast({
          title: "Payment Successful!",
          description: "Redirecting you to your dashboard...",
        });
        // The redirect will happen automatically via return_url
      }
    } catch (err: any) {
      console.error('[Subscribe] Unexpected error:', err);
      
      let errorMessage = "An unexpected error occurred. Please try again.";
      
      if (err.message === 'Payment confirmation timeout') {
        errorMessage = "Payment confirmation is taking longer than expected. Please check your account page to see if the payment went through, or contact support if you need help.";
        toast({
          title: "Payment Timeout",
          description: errorMessage,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Payment Error",
          description: errorMessage,
          variant: "destructive",
        });
      }
      
      setPaymentError(errorMessage);
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
      
      {/* Loading indicator for payment form */}
      {!stripe && (
        <div className="flex items-center justify-center py-8 space-x-2">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">Loading secure payment form...</span>
        </div>
      )}
      
      {/* Payment Element */}
      <div className={!stripe ? "hidden" : ""}>
        <PaymentElement 
          onReady={() => {
            console.log('[Subscribe] PaymentElement is ready');
            setIsPaymentReady(true);
          }}
          onChange={(e) => {
            // Clear error when user starts typing
            if (paymentError) {
              setPaymentError(null);
            }
          }}
        />
      </div>
      
      {/* Error Alert */}
      {paymentError && (
        <Alert variant="destructive" data-testid="alert-payment-error">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Payment Error</AlertTitle>
          <AlertDescription>{paymentError}</AlertDescription>
        </Alert>
      )}
      
      {/* Submit Button */}
      <Button 
        type="submit" 
        className="w-full" 
        disabled={!stripe || isProcessing || !isPaymentReady}
        data-testid="button-submit-payment"
      >
        {isProcessing ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processing Payment...
          </>
        ) : !stripe ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Loading...
          </>
        ) : (
          `Subscribe for $${price}`
        )}
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
  const tier = (params.get('tier') as "starter" | "business" | "scale") || "starter";

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
