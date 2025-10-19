export type SubscriptionTier = "free" | "paid";

export interface PricingPlan {
  tier: SubscriptionTier;
  name: string;
  monthlyPrice: number;
  annualPrice: number;
  features: {
    name: string;
    included: boolean;
    details?: string;
  }[];
  limits: {
    questionsPerChatbot: number | "unlimited";
    customColors: boolean;
    customLogo: boolean;
    embedCode: boolean;
    analytics: boolean;
  };
}

export const PRICING_PLANS: Record<SubscriptionTier, PricingPlan> = {
  free: {
    tier: "free",
    name: "Free Trial",
    monthlyPrice: 0,
    annualPrice: 0,
    features: [
      { name: "1 AI Chatbot", included: true },
      { name: "3 questions per chatbot", included: true, details: "Total across all sessions" },
      { name: "Test & demo mode only", included: true, details: "Cannot embed on external sites" },
      { name: "Basic customization", included: false, details: "Colors and logo locked" },
      { name: "Analytics dashboard", included: false },
      { name: "Website embedding", included: false },
    ],
    limits: {
      questionsPerChatbot: 3,
      customColors: false,
      customLogo: false,
      embedCode: false,
      analytics: false,
    },
  },
  paid: {
    tier: "paid",
    name: "Pro Plan",
    monthlyPrice: 29.99,
    annualPrice: 300,
    features: [
      { name: "Unlimited AI Chatbots", included: true },
      { name: "Unlimited questions", included: true },
      { name: "Full customization", included: true, details: "Colors, logo, and branding" },
      { name: "Website embedding", included: true, details: "Embed anywhere with one line of code" },
      { name: "Analytics dashboard", included: true, details: "Track conversations and performance" },
      { name: "Priority support", included: true },
    ],
    limits: {
      questionsPerChatbot: "unlimited",
      customColors: true,
      customLogo: true,
      embedCode: true,
      analytics: true,
    },
  },
};

export const FREE_TIER_QUESTION_LIMIT = 3;
