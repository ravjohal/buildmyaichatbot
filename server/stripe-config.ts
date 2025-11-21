import Stripe from "stripe";

// Initialize Stripe - automatically use test or live keys based on environment
// REPLIT_DEPLOYMENT is set to "1" when published (production), undefined in development
const isProduction = process.env.REPLIT_DEPLOYMENT === "1";

// Choose the appropriate Stripe secret key based on environment
const stripeSecretKey = isProduction
  ? (process.env.STRIPE_LIVE_SECRET_KEY || process.env.STRIPE_SECRET_KEY)  // Production: use live keys
  : (process.env.STRIPE_TEST_SECRET_KEY || process.env.TESTING_STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY);  // Development: use test keys

export const stripe = stripeSecretKey ? new Stripe(stripeSecretKey) : null;

// Log which Stripe key is being used (only show first/last 4 chars for security)
if (stripeSecretKey) {
  const keyPrefix = stripeSecretKey.substring(0, 7); // sk_test or sk_live
  const mode = isProduction ? 'PRODUCTION (Live)' : 'DEVELOPMENT (Test)';
  console.log(`[Stripe] ${mode} mode - Key: ${keyPrefix}...${stripeSecretKey.slice(-4)}`);
  if (!isProduction && keyPrefix.includes('live')) {
    console.warn('[Stripe] WARNING: Using LIVE key in development mode!');
  }
  if (isProduction && keyPrefix.includes('test')) {
    console.warn('[Stripe] WARNING: Using TEST key in production mode!');
  }
} else {
  console.error('[Stripe] No Stripe secret key found! Set appropriate environment variables.');
}
