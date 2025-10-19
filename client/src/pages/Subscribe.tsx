import { useStripe, Elements, PaymentElement, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useEffect, useState } from 'react';
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PRICING_PLANS } from "@shared/pricing";

if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  throw new Error('Missing required Stripe key: VITE_STRIPE_PUBLIC_KEY');
}
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

const SubscribeForm = ({ billingCycle }: { billingCycle: "monthly" | "annual" }) => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [isProcessing, setIsProcessing] = useState(false);
  
  const paidPlan = PRICING_PLANS.paid;
  const price = billingCycle === "monthly" ? paidPlan.monthlyPrice : paidPlan.annualPrice;
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/dashboard?payment=success`,
      },
    });

    if (error) {
      toast({
        title: "Payment Failed",
        description: error.message,
        variant: "destructive",
      });
      setIsProcessing(false);
    } else {
      toast({
        title: "Payment Successful",
        description: "You are now subscribed to the Pro plan!",
      });
      navigate("/dashboard");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-muted p-4 rounded-md mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="font-medium">Pro Plan ({billingCycle === "monthly" ? "Monthly" : "Annual"})</span>
          <span className="text-2xl font-bold">${price}</span>
        </div>
        <p className="text-sm text-muted-foreground">
          {billingCycle === "monthly" 
            ? "Billed monthly" 
            : `Billed annually • Save $${(paidPlan.monthlyPrice * 12 - paidPlan.annualPrice).toFixed(0)}/year`}
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
  const [location] = useLocation();
  const [, navigate] = useLocation();
  const [clientSecret, setClientSecret] = useState("");
  const { toast } = useToast();
  
  const params = new URLSearchParams(location.split('?')[1] || '');
  const billingCycle = (params.get('plan') as "monthly" | "annual") || "monthly";

  useEffect(() => {
    apiRequest("POST", "/api/create-subscription", { billingCycle })
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
  }, [billingCycle, toast, navigate]);

  if (!clientSecret) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" aria-label="Loading"/>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-16">
      <div className="container mx-auto px-4 max-w-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Complete Your Subscription</h1>
          <p className="text-muted-foreground">
            Upgrade to Pro and unlock unlimited chatbots, questions, and embedding
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
            <Elements stripe={stripePromise} options={{ clientSecret }}>
              <SubscribeForm billingCycle={billingCycle} />
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
