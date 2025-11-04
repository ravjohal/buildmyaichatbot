# BuildMyChatbot.Ai

## Overview

BuildMyChatbot.Ai is a SaaS web application enabling non-technical business owners to create, customize, and deploy AI-powered customer support chatbots for their websites. It offers a guided creation wizard, extensive customization, and an embeddable widget for seamless website integration. The project aims to provide efficient, AI-driven customer support, reducing operational costs and enhancing customer satisfaction. Key capabilities include streaming LLM responses, chunk-based knowledge retrieval with vector embeddings, AI responses from website content and documents, multi-tier user management, comprehensive analytics, and a freemium pricing model with Stripe integration.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions

The frontend uses React and TypeScript, with Vite for development and Wouter for routing. TanStack Query manages server state. Tailwind CSS with shadcn/ui (New York variant) provides a professional SaaS aesthetic, featuring a multi-step chatbot creation wizard, real-time customization previews, and a responsive layout. All authenticated pages utilize a `DashboardHeader` for consistent global navigation, ensuring a unified user experience.

### Technical Implementations

The backend is built with Express.js, Node.js, and TypeScript, following a RESTful API design. Zod is used for data validation. PostgreSQL with Drizzle ORM handles data persistence. The embeddable chat widget is delivered via an iframe for isolation. The system uses system Chromium from `replit.nix` for Playwright operations. Database connection resilience is achieved through automatic retry logic with exponential backoff for Neon serverless database connections. PDF extraction employs a 6-strategy fallback system, prioritizing the `unpdf` library for robust text extraction and including a regex-based last resort. Source attribution in chatbot responses links to specific page URLs.

### Feature Specifications

*   **Chatbot Creation Wizard:** A guided multi-step process for configuring chatbot name, knowledge base (website URLs, document uploads), personality, visual customization, suggested questions, support escalation, and lead capture.
*   **Chat Widget:** An embeddable, customizable, and mobile-responsive AI chat interface with real-time streaming responses, suggested questions, conversation history, escalation detection, and configurable lead capture forms.
*   **Smart Suggested Questions:** AI (Gemini) generates FAQ-style questions from website content during indexing, stored and randomly displayed in the chat widget.
*   **Streaming LLM Responses:** Implements Server-Sent Events (SSE) for real-time, word-by-word response display.
*   **Chunk-Based Knowledge Retrieval:** Content is split into semantic chunks with vector embeddings, and top-k similarity search retrieves the 5 most relevant chunks.
*   **Q&A Caching System:** Reduces LLM API costs by caching question-answer pairs with hybrid exact and semantic matching using pgvector embeddings.
*   **Manual Answer Training:** Enables chatbot owners to improve accuracy by manually correcting AI responses via the Analytics interface.
*   **Lead Capture System:** Collects visitor contact information via configurable forms, with a management dashboard and CSV export.
*   **On-Demand Knowledge Base Refresh:** Intelligently updates chatbot knowledge from website URLs by detecting content changes via MD5 hashing.
*   **Analytics Dashboard:** Offers comprehensive chatbot analytics, including key metrics, detailed conversation transcripts, and performance breakdowns.
*   **3-Tier Pricing System:** Implements Free, Pro, and Scale tiers with server-side enforcement and varying limits on chatbots, conversations, and storage.
*   **Admin System:** Provides full user management, system-wide statistics, and access to all chatbots for administrators.
*   **Account Management:** Users can manage profile, subscription status, and billing via an integrated Stripe portal.
*   **Shareable Links & QR Codes:** Enables easy distribution of chatbots via direct links and QR codes with a full-page chat interface.
*   **Intelligent SPA Crawler:** A dual-mode website crawler that automatically detects and renders JavaScript-heavy Single Page Applications using Playwright, with SSRF protection.
*   **Satisfaction Ratings:** Allows visitors to rate their chat experience (1-5 stars) for analytics.
*   **Proactive Chat Popup:** Automatically displays a customizable popup notification to website visitors after a configurable delay.
*   **Email Notifications:** Sends automated email alerts via Resend for new lead submissions, unanswered questions, and weekly performance reports.
*   **Async Indexing Pipeline:** Non-blocking chatbot creation with background processing for website crawling. Frontend displays real-time indexing status with polling. Worker processes jobs sequentially with automatic error recovery and progress tracking.

### System Design Choices

*   **Data Storage:** PostgreSQL with Drizzle ORM stores all persistent data, including users, chatbots, conversations, leads, Q&A cache, manual overrides, and knowledge chunks.
*   **AI Integration:** Google Gemini AI (gemini-2.5-flash) via the `@google/genai` SDK is used for NLP, with a streaming API. System prompt engineering and chunk-based retrieval optimize responses. Response priority is Manual Override → Exact Cache → Semantic Cache → LLM with Chunks.
*   **File Storage:** Google Cloud Storage (via Replit Object Storage) stores user-uploaded files, with Uppy.js for client-side uploads using signed URLs.
*   **Authentication & Security:** Custom email/password authentication (`passport-local`, bcrypt, session-based) with robust security features, CSRF protection, and Zod input validation. Multi-tenant architecture scopes chatbots.
*   **Payment Processing:** Stripe integration with automatic subscription tier management via webhooks.
*   **Deployment Architecture:** Frontend assets built with Vite, server code with esbuild. Configured for development and production, with dynamic environment-based configurations.

## External Dependencies

### Third-Party Services

*   **Google Cloud Platform:** Gemini AI API (NLP), Google Cloud Storage (user file storage).
*   **Stripe:** Payment gateway for subscription management and billing.
*   **Resend:** Transactional email service for notifications and reports.
*   **Replit Infrastructure:** Replit Object Storage (managed object storage built on Google Cloud Storage).

### Key NPM Packages

*   **Frontend:** `@tanstack/react-query`, `@radix-ui/*`, `tailwindcss`, `wouter`, `@uppy/*`, `class-variance-authority`, `react-hook-form`, `zod`.
*   **Backend:** `express`, `@google/genai`, `@google-cloud/storage`, `drizzle-orm`, `@neondatabase/serverless`, `multer`, `passport`, `bcrypt`, `@xenova/transformers`, `resend`.
*   **Build Tools:** `vite`, `esbuild`, `tsx`, `drizzle-kit`, `playwright`.

### Environment Requirements

`DATABASE_URL`, `GEMINI_API_KEY`, `SESSION_SECRET`, `STRIPE_SECRET_KEY`, `VITE_STRIPE_PUBLIC_KEY`, `RESEND_API_KEY`, `PUBLIC_OBJECT_SEARCH_PATHS`, `PRIVATE_OBJECT_DIR`, `DEFAULT_OBJECT_STORAGE_BUCKET_ID`.