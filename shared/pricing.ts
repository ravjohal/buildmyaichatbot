import type { SubscriptionTier } from "./schema";

export interface TierLimits {
  chatbots: number; // -1 means unlimited
  conversationsPerMonth: number;
  knowledgeBaseSizeMB: number;
  features: {
    embed: boolean;
    analytics: boolean;
    manualTraining: boolean;
    emailNotifications: boolean;
    leadExport: boolean;
    proactiveChat: boolean;
    autoRefresh: boolean;
    customColors: boolean;
    customLogo: boolean;
  };
}

export const TIER_LIMITS: Record<SubscriptionTier, TierLimits> = {
  free: {
    chatbots: 1,
    conversationsPerMonth: 3, // 3 total questions across all sessions
    knowledgeBaseSizeMB: 100,
    features: {
      embed: true,
      analytics: false,
      manualTraining: false,
      emailNotifications: false,
      leadExport: false,
      proactiveChat: false,
      autoRefresh: false,
      customColors: true,
      customLogo: true,
    },
  },
  pro: {
    chatbots: 5,
    conversationsPerMonth: 5000,
    knowledgeBaseSizeMB: 1024, // 1 GB
    features: {
      embed: true,
      analytics: false,
      manualTraining: true,
      emailNotifications: true,
      leadExport: true,
      proactiveChat: true,
      autoRefresh: true,
      customColors: true,
      customLogo: true,
    },
  },
  scale: {
    chatbots: -1, // unlimited
    conversationsPerMonth: 50000,
    knowledgeBaseSizeMB: 5120, // 5 GB
    features: {
      embed: true,
      analytics: true,
      manualTraining: true,
      emailNotifications: true,
      leadExport: true,
      proactiveChat: true,
      autoRefresh: true,
      customColors: true,
      customLogo: true,
    },
  },
};

export interface PricingPlan {
  name: string;
  tier: SubscriptionTier;
  monthlyPrice: number;
  annualPrice: number;
  description: string;
  features: string[];
  limits: TierLimits;
  popular?: boolean;
}

export const PRICING_PLANS: PricingPlan[] = [
  {
    name: "Free",
    tier: "free",
    monthlyPrice: 0,
    annualPrice: 0,
    description: "Perfect for testing and small projects",
    features: [
      "1 chatbot",
      "3 total questions",
      "100 MB knowledge base",
      "Embed on your website",
      "Custom colors & logo",
      "Basic support",
    ],
    limits: TIER_LIMITS.free,
  },
  {
    name: "Pro",
    tier: "pro",
    monthlyPrice: 29.99,
    annualPrice: 300,
    description: "For growing businesses",
    features: [
      "5 chatbots",
      "5,000 conversations/month",
      "1 GB knowledge base",
      "Manual answer training",
      "Email notifications",
      "Lead export (CSV)",
      "Proactive chat popup",
      "Auto knowledge refresh",
      "Priority support",
    ],
    limits: TIER_LIMITS.pro,
    popular: true,
  },
  {
    name: "Scale",
    tier: "scale",
    monthlyPrice: 99.99,
    annualPrice: 999,
    description: "For high-volume businesses",
    features: [
      "Unlimited chatbots",
      "50,000 conversations/month",
      "5 GB knowledge base",
      "Advanced analytics dashboard",
      "Everything in Pro",
      "Overage billing available",
      "Dedicated support",
    ],
    limits: TIER_LIMITS.scale,
  },
];

// Helper function to check if a user has access to a feature
export function hasFeatureAccess(
  tier: SubscriptionTier,
  feature: keyof TierLimits["features"]
): boolean {
  return TIER_LIMITS[tier].features[feature];
}

// Helper function to check if a user is within their chatbot limit
export function canCreateChatbot(tier: SubscriptionTier, currentCount: number): boolean {
  const limit = TIER_LIMITS[tier].chatbots;
  return limit === -1 || currentCount < limit;
}

// Helper function to check if user is within conversation limit
export function canSendMessage(tier: SubscriptionTier, currentCount: number): boolean {
  const limit = TIER_LIMITS[tier].conversationsPerMonth;
  return currentCount < limit;
}

// Helper function to check knowledge base size
export function canAddToKnowledgeBase(
  tier: SubscriptionTier,
  currentSizeMB: number,
  additionalSizeMB: number
): boolean {
  const limit = TIER_LIMITS[tier].knowledgeBaseSizeMB;
  return currentSizeMB + additionalSizeMB <= limit;
}

// Legacy constant for backwards compatibility
export const FREE_TIER_QUESTION_LIMIT = 3;
