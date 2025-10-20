# AI Chatbot Builder

## Overview

This SaaS web application enables non-technical business owners to create, customize, and deploy AI-powered customer support chatbots for their websites. It features a guided wizard for chatbot creation based on website content and uploaded documents, with extensive customization options. The project consists of an Admin Builder Application (React-based dashboard) and an Embeddable Widget for website integration. The business vision is to empower businesses with efficient, AI-driven customer support, reducing operational costs and improving customer satisfaction.

## Recent Changes (October 2025)

### Account Management & Billing Portal (Completed - October 20, 2025)
- Created comprehensive Account/Profile page at `/account` route
- Displays user information: name, email, avatar with initials, account creation date
- Shows subscription status and details for both Free and Pro tier users
- Integrated Stripe billing portal for subscription management
  - Server-side session creation with secure return URL handling
  - One-click access to update payment methods, view invoices, and manage subscriptions
- Added null checks throughout Stripe integration to prevent crashes when STRIPE_SECRET_KEY is missing
- Improved error handling with proper error states, retry functionality, and user feedback
- Currency formatting using Intl.NumberFormat for internationalization
- Professional UX with loading skeletons, disabled states, and clear navigation
- Navigation link added to Dashboard header (user avatar icon)

### Freemium Pricing System with Stripe Integration (Completed)
- Implemented two-tier pricing: Free (test/demo, limited) and Pro ($29.99/month or $300/year, unlimited)
- Integrated Stripe for subscription management and payments
- Added comprehensive server-side enforcement for Pro-only features
- Free tier limits: 1 chatbot max, 3 questions max per chatbot, no analytics, no embed code access, no color/logo customization
- Pro tier: Unlimited chatbots, unlimited questions, full analytics, embedding, complete customization
- Database schema updated: subscriptionTier, stripeCustomerId, stripeSubscriptionId fields in users table; questionCount field in chatbots table
- UI updates: Upgrade prompts, disabled buttons for free tier, clear upgrade paths
- Subscription webhooks: Handle lifecycle events (created, updated, cancelled, payment succeeded/failed)

### Analytics Feature (Completed)
- Implemented comprehensive conversation tracking and analytics system
- Added database tables for conversations and conversation_messages
- Created Analytics dashboard page with metrics and conversation history
- Integrated sessionId tracking across both ChatWidget and TestChatbot
- Added analytics link to Dashboard for easy access
- All chat interactions are now logged and available for analysis
- Analytics access restricted to Pro plan subscribers

### Shareable Links & QR Codes (Completed)
- Implemented shareable link feature for easy chatbot distribution
- Added QR code generation using qrcode.react library
- Share dialog displays both shareable link and downloadable QR code
- Full-page chat interface when accessing via shareable link (no click required)
- Chatbots automatically detect standalone vs iframe mode
- Shareable URL format: `{origin}/widget/{chatbotId}`
- Available to all users (Free and Pro tiers)

### Landing Page Enhancements (Completed)
- Added Pricing link to header navigation
- Created pricing preview section with Free vs Pro comparison
- Professional layout with clear feature breakdown
- Upgrade call-to-action integrated into landing page

### Optimizations
- Optimized recursive website crawler to eliminate double-fetching
- Improved URL normalization for better crawling performance
- Added AI-generated suggested questions after each chatbot response

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

The frontend is built with React and TypeScript, using Vite for development and Wouter for routing. TanStack Query manages server state, and Tailwind CSS with shadcn/ui (New York variant) provides a professional SaaS aesthetic inspired by Stripe/Linear. Key UI patterns include a multi-step wizard for chatbot creation, real-time customization previews, and a responsive design.

### Backend Architecture

The backend uses Express.js with Node.js and TypeScript. It follows a RESTful API design pattern with Zod for data validation. Data is currently stored in-memory using an `IStorage` interface, with Drizzle ORM schemas prepared for a PostgreSQL migration. Widget delivery is iframe-based for isolation, integrated via a simple script tag.

### Data Storage

Currently utilizes an in-memory Map-based storage (`MemStorage`) for chatbot configurations. The application now uses PostgreSQL with Drizzle ORM for analytics data storage and subscription management. Database tables include:
- `users`: User accounts with authentication data and subscription information (subscriptionTier, stripeCustomerId, stripeSubscriptionId)
- `chatbots`: Core chatbot configurations (name, URLs, content, styling, behavior, questionCount for free tier limits)
- `conversations`: Conversation session metadata (sessionId, chatbotId, messageCount, escalation status)
- `conversation_messages`: Individual chat messages (user/assistant content, role, suggested questions, timestamps)

### AI Integration

The application integrates with Google Gemini AI via the `@google/genai` SDK for natural language processing. It uses system prompt engineering to constrain responses to a knowledge base constructed from website content (scraped) and uploaded documents (PDF, TXT, MD).

### File Storage

Google Cloud Storage (via Replit Object Storage) is integrated for storing company logos and documents. Uppy.js handles client-side file uploads, utilizing signed URLs for direct browser-to-storage uploads.

### Authentication & Security

Multi-tenant authentication is implemented using Replit Auth with OpenID Connect. Users can sign in with their Replit accounts, and chatbots are scoped to user accounts. CSRF protection is implemented, and input validation is enforced with Zod schemas. Session management uses express-session with PostgreSQL-backed session storage.

### Deployment Architecture

Frontend assets are built with Vite, and server code is bundled with esbuild. The application is configured for development with Vite HMR and `tsx`, and for production with environment-based configurations.

### Application Features

**Chatbot Creation Wizard:** A multi-step wizard guides users through configuring chatbot name, knowledge base (website URLs, document uploads), personality (welcome message, tone), visual customization (colors, logo), and support escalation (email, phone number, escalation message).

**Chat Widget:** An embeddable, customizable, and mobile-responsive chat interface featuring AI-powered responses, conversation history, typing indicators, and escalation detection.

**Dashboard:** Provides chatbot management capabilities, including listing all chatbots, quick actions (edit, delete, copy embed code, view analytics), visual feature indicators, and simplified embed code generation.

**Analytics Dashboard:** Comprehensive analytics for each chatbot, including:
- Key metrics: total conversations, total messages, escalations, average messages per conversation
- Conversation history with detailed transcripts
- Message-level tracking with user/assistant messages and suggested questions
- Session-based conversation grouping with unique sessionIds
- Real-time tracking of all chat interactions (both test and widget conversations)

## External Dependencies

### Third-Party Services

-   **Google Cloud Platform:**
    -   **Gemini AI API:** For natural language processing and chat responses.
    -   **Google Cloud Storage:** For file storage (logos, documents) via Replit Object Storage.
-   **Replit Infrastructure:**
    -   **Replit Sidecar:** OAuth token provider for Google Cloud services.
    -   **Replit Object Storage:** Managed object storage service.
    -   **Replit Auth:** For user authentication.

### Key NPM Packages

-   **Frontend:** `@tanstack/react-query`, `@radix-ui/*`, `tailwindcss`, `wouter`, `@uppy/*`, `class-variance-authority`, `react-hook-form`, `zod`.
-   **Backend:** `express`, `@google/genai`, `@google-cloud/storage`, `drizzle-orm`, `@neondatabase/serverless`, `multer`.
-   **Build Tools:** `vite`, `esbuild`, `tsx`, `drizzle-kit`.

### Environment Requirements

`DATABASE_URL`, `GEMINI_API_KEY`, `PUBLIC_OBJECT_SEARCH_PATHS`, `PRIVATE_OBJECT_DIR`, `DEFAULT_OBJECT_STORAGE_BUCKET_ID`, `SESSION_SECRET`, `STRIPE_SECRET_KEY`, `VITE_STRIPE_PUBLIC_KEY`.