# AI Chatbot Builder

## Overview

This SaaS web application empowers non-technical business owners to create, customize, and deploy AI-powered customer support chatbots for their websites. It features a guided creation wizard, extensive customization options, and an embeddable widget for seamless website integration. The project aims to provide efficient, AI-driven customer support, thereby reducing operational costs and enhancing customer satisfaction for businesses. Key capabilities include AI-powered responses based on website content and uploaded documents, multi-tier user management (including admin roles), comprehensive analytics, and a freemium pricing model with Stripe integration.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

The frontend is built with React and TypeScript, utilizing Vite for development and Wouter for routing. It employs TanStack Query for server state management and Tailwind CSS with shadcn/ui (New York variant) for a professional SaaS aesthetic. The design includes a multi-step wizard for chatbot creation, real-time customization previews, and a responsive layout.

### Backend Architecture

The backend is developed using Express.js with Node.js and TypeScript, following a RESTful API design. Zod is used for data validation. Data persistence primarily uses PostgreSQL with Drizzle ORM. The embeddable chat widget is delivered via an iframe for isolation, integrated through a simple script tag.

### Data Storage

The application uses PostgreSQL with Drizzle ORM for all persistent data. Key tables include:
- `users`: Stores user accounts, custom authentication credentials, subscription tiers, and Stripe customer/subscription IDs.
- `chatbots`: Contains core chatbot configurations, including name, source URLs, content, styling, behavior, and free-tier specific limits.
- `conversations`: Records session metadata for user interactions with chatbots.
- `conversation_messages`: Stores individual chat messages, roles, and suggested questions within conversations.
- `qa_cache`: Stores cached question-answer pairs to reduce redundant LLM API calls, with MD5 hashing for question normalization and hit count tracking for cache effectiveness monitoring.

### AI Integration

Google Gemini AI, accessed via the `@google/genai` SDK, is integrated for natural language processing. It leverages system prompt engineering to constrain AI responses to a knowledge base derived from scraped website content and uploaded documents.

### File Storage

Google Cloud Storage (via Replit Object Storage) is used for storing user-uploaded files such as company logos and documents. Uppy.js facilitates client-side uploads using signed URLs.

### Authentication & Security

The system employs custom email/password authentication using `passport-local` with bcrypt for password hashing and session-based authentication backed by PostgreSQL. It includes robust security features like `sanitizeUser()` for API responses, backend self-modification protection for admin actions, CSRF protection, and comprehensive input validation with Zod schemas. Multi-tenant architecture scopes chatbots to their respective user accounts.

### Deployment Architecture

Frontend assets are built with Vite, and server code is bundled with esbuild. The application is configured for both development (Vite HMR, `tsx`) and production environments, with dynamic environment-based configurations. The SPA crawler intelligently handles JavaScript-rendered sites using Playwright, with production deployments utilizing system Chromium from Nix.

### Application Features

-   **Chatbot Creation Wizard:** A guided multi-step process for configuring chatbot name, knowledge base (website URLs, document uploads), personality, visual customization, support escalation options, and lead capture settings.
-   **Chat Widget:** An embeddable, customizable, and mobile-responsive AI chat interface with conversation history, escalation detection, and configurable lead capture forms.
-   **Dashboard:** Manages chatbots, provides quick actions (edit, delete, embed code, analytics, knowledge base refresh), and visual feature indicators.
-   **On-Demand Knowledge Base Refresh:** Intelligently updates chatbot knowledge from website URLs by detecting content changes via MD5 hashing. Only re-crawls URLs with modified content, preserving unchanged data and avoiding unnecessary document re-indexing.
-   **Lead Capture System:** Collects visitor contact information through configurable forms with customizable fields (name, email, phone, company, message) and timing triggers (immediately, after first message, after N messages). Includes lead management dashboard with CSV export functionality.
-   **Analytics Dashboard:** Offers comprehensive chatbot analytics including key metrics, detailed conversation transcripts, and message-level tracking.
-   **Freemium Pricing System:** Implements Free and Pro tiers with Stripe integration for subscription management, with server-side enforcement of Pro-only features (e.g., unlimited chatbots, full customization, analytics, lead capture).
-   **Admin System:** Provides administrators with full user management capabilities (promote/demote users, delete accounts, change subscriptions), system-wide statistics, and access to all chatbots, bypassing tier restrictions.
-   **Account Management:** Users can view profile information, subscription status, and manage billing via an integrated Stripe billing portal.
-   **Shareable Links & QR Codes:** Enables easy distribution of chatbots via direct links and QR codes, with a full-page chat interface.
-   **Intelligent SPA Crawler:** A dual-mode website crawler that automatically detects and renders JavaScript-heavy Single Page Applications using Playwright, with robust SSRF protection and resource limits.
-   **Q&A Caching System:** Reduces LLM API costs by caching question-answer pairs with MD5-based question normalization. Features automatic cache invalidation on knowledge base updates, hit count tracking, and admin-accessible cache statistics endpoint showing total cached questions, cache hits, hit rate, and estimated cost savings.

## External Dependencies

### Third-Party Services

-   **Google Cloud Platform:**
    -   **Gemini AI API:** Core AI model for natural language processing.
    -   **Google Cloud Storage:** Used for storing user files (logos, documents).
-   **Stripe:** Payment gateway for subscription management and billing.
-   **Replit Infrastructure:**
    -   **Replit Object Storage:** Managed object storage service, built on Google Cloud Storage.

### Key NPM Packages

-   **Frontend:** `@tanstack/react-query`, `@radix-ui/*`, `tailwindcss`, `wouter`, `@uppy/*`, `class-variance-authority`, `react-hook-form`, `zod`.
-   **Backend:** `express`, `@google/genai`, `@google-cloud/storage`, `drizzle-orm`, `@neondatabase/serverless`, `multer`, `passport`, `bcrypt`.
-   **Build Tools:** `vite`, `esbuild`, `tsx`, `drizzle-kit`, `playwright`.

### Environment Requirements

`DATABASE_URL`, `GEMINI_API_KEY`, `SESSION_SECRET`, `STRIPE_SECRET_KEY`, `VITE_STRIPE_PUBLIC_KEY`, `PUBLIC_OBJECT_SEARCH_PATHS`, `PRIVATE_OBJECT_DIR`, `DEFAULT_OBJECT_STORAGE_BUCKET_ID`.