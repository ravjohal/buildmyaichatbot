# BuildMyChatbot.Ai

## Overview

BuildMyChatbot.Ai is a SaaS web application that enables non-technical business owners to create, customize, and deploy AI-powered customer support chatbots for their websites.

## Production Diagnostics

**Critical Update (Nov 3, 2025)**: Implemented comprehensive worker health monitoring and diagnostics to resolve production indexing issues. See `PRODUCTION_INDEXING_DIAGNOSTICS.md` for full details.

**Key Production Indicators:**
- `[WORKER] ✓ Indexing worker started successfully` - Worker initialized
- `[WORKER-HEALTH] ✓ Playwright/Chromium is operational` - Browser available
- `[WORKER-HEARTBEAT] Worker alive | Jobs processed: N | Uptime: Xs` - Every 30s heartbeat
- If missing these logs in production, worker is not running or Chromium unavailable It offers a guided creation wizard, extensive customization, and an embeddable widget for seamless website integration. The project aims to provide efficient, AI-driven customer support, reducing operational costs and enhancing customer satisfaction. Key capabilities include streaming LLM responses, chunk-based knowledge retrieval with vector embeddings, AI responses from website content and documents, multi-tier user management, comprehensive analytics, and a freemium pricing model with Stripe integration.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions

The frontend uses React and TypeScript, with Vite for development and Wouter for routing. TanStack Query manages server state. Tailwind CSS with shadcn/ui (New York variant) provides a professional SaaS aesthetic, featuring a multi-step chatbot creation wizard, real-time customization previews, and a responsive layout.

**Global Navigation Pattern:** All authenticated pages use a unified `DashboardHeader` component (located at `client/src/components/DashboardHeader.tsx`) providing consistent global navigation with Logo, Dashboard, Account, Admin (admin-only), Upgrade to Pro (free tier only), and Logout buttons. Page content areas contain page-specific actions and controls. This pattern ensures consistent UX and reduces navigation confusion across: Dashboard, Admin, Leads, Analytics Dashboard, Analytics, Create Chatbot, Edit Chatbot, Test Chatbot, Notification Settings, and Account pages.

### Technical Implementations

The backend, built with Express.js, Node.js, and TypeScript, follows a RESTful API design. Zod is used for data validation. PostgreSQL with Drizzle ORM handles data persistence. The embeddable chat widget is delivered via an iframe for isolation.

### Feature Specifications

*   **Chatbot Creation Wizard:** A guided multi-step process for configuring chatbot name, knowledge base (website URLs, document uploads), personality, visual customization, optional AI-generated suggested questions (up to 3), support escalation options, and lead capture settings.
*   **Chat Widget:** An embeddable, customizable, and mobile-responsive AI chat interface with real-time streaming responses, optional AI-generated follow-up questions (3 max), conversation history, escalation detection, and configurable lead capture forms.
*   **Streaming LLM Responses:** Implements Server-Sent Events (SSE) for word-by-word real-time response display, reducing perceived latency and improving user experience.
*   **Chunk-Based Knowledge Retrieval:** Content is split into semantic chunks (200-1000 characters with 100-char overlap) with 384-dimensional vector embeddings. Top-k similarity search retrieves the 5 most relevant chunks (optimized from 8 for 30-40% faster response times), balancing context quality with speed. Includes automatic fallback to truncated full content when chunks are unavailable.
*   **Q&A Caching System:** Reduces LLM API costs by caching question-answer pairs with hybrid exact and semantic matching. Uses MD5-based question normalization and pgvector embeddings for semantic similarity. Automatically matches paraphrased questions and features cache invalidation on knowledge base updates.
*   **Manual Answer Training:** Enables chatbot owners to improve accuracy by manually correcting AI responses through the Analytics interface. Corrected answers are prioritized in the response pipeline and support both exact and semantic matching.
*   **Lead Capture System:** Collects visitor contact information via configurable forms with source tracking. Features a management dashboard with CSV export and source visualization.
*   **On-Demand Knowledge Base Refresh:** Intelligently updates chatbot knowledge from website URLs by detecting content changes via MD5 hashing, only re-crawling modified content.
*   **Analytics Dashboard:** Offers comprehensive chatbot analytics including key metrics, detailed conversation transcripts, message-level tracking, and performance breakdowns.
*   **3-Tier Pricing System:** Implements Free, Pro ($29.99/mo or $300/year), and Scale ($99.99/mo or $999/year) tiers with server-side enforcement. Free tier: 1 chatbot, 3 total questions, 100MB storage. Pro tier: 5 chatbots, 5K conversations/month, 1GB storage. Scale tier: Unlimited chatbots, 50K conversations/month, 5GB storage, exclusive Analytics access. Monthly conversation limits auto-reset based on billing period. Admins (ravneetjohal@gmail.com) bypass all limits.
*   **Admin System:** Provides full user management, system-wide statistics, and access to all chatbots for administrators.
*   **Account Management:** Users can manage profile, subscription status, and billing via an integrated Stripe portal.
*   **Shareable Links & QR Codes:** Enables easy distribution of chatbots via direct links and QR codes with a full-page chat interface.
*   **Intelligent SPA Crawler:** A dual-mode website crawler that automatically detects and renders JavaScript-heavy Single Page Applications using Playwright, with SSRF protection.
*   **Satisfaction Ratings:** Allows visitors to rate their chat experience (1-5 stars) after engaging in a conversation, stored for analytics.
*   **Proactive Chat Popup:** Automatically displays a customizable popup notification to website visitors after a configurable delay to encourage interaction.
*   **Email Notifications:** Sends automated email alerts via Resend for new lead submissions, unanswered questions, and weekly performance reports. Users can manage preferences and custom email addresses. On-demand report generation available via Analytics dashboard. Emails sent from verified domain: `onboarding@resend.dev`.
*   **Async Indexing Pipeline:** Non-blocking chatbot creation with background processing for website crawling. Documents process synchronously (text pre-extracted), while URLs queue for async processing. Frontend displays real-time indexing status with polling. Dashboard shows status badges (pending/processing/completed/failed). Worker processes jobs sequentially with automatic error recovery and progress tracking.

### System Design Choices

*   **Data Storage:** PostgreSQL with Drizzle ORM is used for all persistent data, including users, chatbots, conversations, leads, Q&A cache, manual overrides, and knowledge chunks. User records track monthly conversation counts with automatic reset on billing period boundaries, and total knowledge base size in MB with atomic limit enforcement to prevent race conditions.
*   **AI Integration:** Google Gemini AI (gemini-2.5-flash) via the `@google/genai` SDK is used for NLP, utilizing a streaming API for real-time responses. System prompt engineering constrains AI responses, and chunk-based retrieval optimizes prompt size. Response priority is Manual Override → Exact Cache → Semantic Cache → LLM with Chunks, with automatic fallback. Question embeddings are cached for faster lookups.
*   **File Storage:** Google Cloud Storage (via Replit Object Storage) stores user-uploaded files, with Uppy.js for client-side uploads using signed URLs.
*   **Authentication & Security:** Custom email/password authentication (`passport-local`, bcrypt, session-based) with robust security features like `sanitizeUser()`, backend self-modification protection, CSRF protection, and Zod input validation. Multi-tenant architecture scopes chatbots.
*   **Payment Processing:** Stripe integration with automatic subscription tier management via webhooks. Express middleware configured to provide raw request body to `/api/stripe-webhook` endpoint for proper signature verification, while all other routes receive JSON-parsed bodies.
*   **Deployment Architecture:** Frontend assets are built with Vite, server code with esbuild. Configured for development and production, with dynamic environment-based configurations. SPA crawler uses Playwright with system Chromium from Nix for production.

## External Dependencies

### Third-Party Services

*   **Google Cloud Platform:** Gemini AI API (NLP), Google Cloud Storage (user file storage).
*   **Stripe:** Payment gateway for subscription management and billing.
*   **Resend:** Transactional email service for notifications and weekly analytics reports. Uses verified sender domain `onboarding@resend.dev` with 3,000 emails/month on free tier.
*   **Replit Infrastructure:** Replit Object Storage (managed object storage built on Google Cloud Storage).

### Key NPM Packages

*   **Frontend:** `@tanstack/react-query`, `@radix-ui/*`, `tailwindcss`, `wouter`, `@uppy/*`, `class-variance-authority`, `react-hook-form`, `zod`.
*   **Backend:** `express`, `@google/genai`, `@google-cloud/storage`, `drizzle-orm`, `@neondatabase/serverless`, `multer`, `passport`, `bcrypt`, `@xenova/transformers`, `resend`.
*   **Build Tools:** `vite`, `esbuild`, `tsx`, `drizzle-kit`, `playwright`.

### Environment Requirements

`DATABASE_URL`, `GEMINI_API_KEY`, `SESSION_SECRET`, `STRIPE_SECRET_KEY`, `VITE_STRIPE_PUBLIC_KEY`, `RESEND_API_KEY`, `PUBLIC_OBJECT_SEARCH_PATHS`, `PRIVATE_OBJECT_DIR`, `DEFAULT_OBJECT_STORAGE_BUCKET_ID`.