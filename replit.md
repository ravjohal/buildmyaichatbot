# BuildMyChatbot.Ai

## Overview

BuildMyChatbot.Ai is a SaaS web application designed to empower non-technical business owners to create, customize, and deploy AI-powered customer support chatbots. Its primary purpose is to provide efficient, AI-driven customer support, thereby reducing operational costs and enhancing customer satisfaction. The platform offers a guided creation wizard, extensive customization options, and an embeddable widget for seamless website integration. Key features include streaming LLM responses, chunk-based knowledge retrieval, AI responses from diverse content sources, multi-tier user management, comprehensive analytics, and a freemium pricing model with Stripe integration.

## Recent Updates

### November 2025 - Marketing & SEO Improvements

**Landing Page Redesign (Marketing Optimization):**
- Complete copy overhaul with emotional, value-driven messaging to improve conversions
- Hero section leads with pain-focused headline: "Stop Making Customers Search. Let Them Ask."
- Added trust indicators with industry-verified statistics (70% ticket reduction based on real Chatbase/Wonderchat case studies)
- Pain points vs solutions comparison section highlighting customer frustrations and AI benefits
- FAQ section with 7 questions addressing common objections (technical skills, pricing, customization, guarantees)
- Multiple strategic CTAs throughout page with urgency messaging ("Start Free in 5 Minutes")
- All statistical claims backed by real AI chatbot industry data (Chatbase 60% reduction, Wonderchat 70%, Klarna 67%, industry avg 40-70%)

**SEO Structured Data Fixes:**
- Resolved all Google Search Console merchant listings errors
- Added required image field to all Product/WebApplication schemas
- Added shippingDetails (digital delivery: $0 cost, 0 days transit) for SaaS compliance
- Added hasMerchantReturnPolicy (30-day refund window) representing digital product refund policy
- Fixed addressCountry from "Worldwide" to "US" (ISO 3166-1 alpha-2 compliance)
- Both Landing and Pricing pages now fully compliant with Google merchant listing requirements

**Blog System Implementation:**
- Created public-facing blog for SEO content marketing and educational resources
- PostgreSQL database schema with support for markdown content, SEO metadata, and publishing workflow
- Public API endpoints: GET /api/blog/posts (listing) and GET /api/blog/posts/:slug (single post)
- Responsive blog listing page with card-based grid layout at /blog
- Individual blog post pages at /blog/:slug with react-markdown rendering and remark-gfm
- Integrated blog navigation in Landing page header and Footer
- First published article: "10 Ways AI Chatbots Transform Customer Support in 2025" (8 min read)
- SEO-optimized with unique meta descriptions, keywords, and Open Graph tags per article
- Public routes requiring no authentication for maximum reach and search engine visibility

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions

The frontend leverages React, TypeScript, and Vite, with Wouter for routing and TanStack Query for server state management. Tailwind CSS combined with shadcn/ui (New York variant) establishes a professional SaaS aesthetic. The design incorporates a multi-step chatbot creation wizard, real-time customization previews, and a responsive layout. A consistent `DashboardHeader` across all authenticated pages ensures unified global navigation.

### Technical Implementations

The backend is built using Express.js, Node.js, and TypeScript, adhering to a RESTful API design. Zod handles data validation. PostgreSQL with Drizzle ORM manages data persistence. The embeddable chat widget is isolated within an iframe. The system utilizes Playwright for operations, including rendering Single Page Applications (SPAs) with SSRF protection. Database connection resilience features automatic retry logic with exponential backoff for Neon serverless connections. PDF extraction employs a 6-strategy fallback system, incorporating `pdf-parse`, `unpdf` (based on Mozilla's PDF.js), and regex-based methods. An intelligent chunker processes large paragraphs by splitting them into sentences or fixed-size blocks with overlap. Chatbot responses include source attribution linking to specific page URLs and support configurable custom instructions for AI behavior.

### Feature Specifications

*   **Chatbot Creation Wizard:** A 7-step guided process covering configuration, knowledge base (URLs, documents), personality, visual customization, support escalation, lead capture, and CRM integration.
*   **Chat Widget:** Embeddable, customizable, mobile-responsive AI chat interface with streaming responses, suggested questions, conversation history, escalation detection, and configurable lead capture forms.
*   **Smart Suggested Questions:** AI (Gemini) generates FAQ-style questions from website content during indexing.
*   **Streaming LLM Responses:** Uses Server-Sent Events (SSE) for real-time, word-by-word display.
*   **Chunk-Based Knowledge Retrieval:** Content is semantically chunked, vectorized, and used for top-k similarity search.
*   **Visual Content Display:** Chatbots scrape and index images from websites, displaying them inline in chat responses via semantic similarity search.
*   **Q&A Caching System:** Reduces LLM costs by caching question-answer pairs with hybrid exact and semantic matching using pgvector.
*   **Manual Answer Training:** Allows owners to correct AI responses via the Analytics interface.
*   **Lead Capture System:** Collects visitor contact information via configurable forms, with a management dashboard and CSV export. Supports directing visitors to external forms.
*   **On-Demand Knowledge Base Refresh:** Intelligently updates knowledge bases from website URLs by detecting content changes.
*   **Analytics Dashboard:** Provides comprehensive chatbot analytics, including metrics, conversation transcripts, and performance breakdowns.
*   **3-Tier Pricing System:** Implements Free, Pro, and Scale tiers with server-side enforcement of limits.
*   **Admin System:** Offers full user management, system-wide statistics, and access to all chatbots for administrators. Includes comprehensive user details view with accordion-based chatbot information display showing all configuration, visual settings, features, and AI behavior for each chatbot.
*   **Account Management:** Users manage profile, subscription, and billing via an integrated Stripe portal.
*   **Shareable Links & QR Codes:** Enables distribution of chatbots via direct links and QR codes with a full-page chat interface.
*   **Intelligent SPA Crawler:** Dual-mode crawler automatically detects and renders JavaScript-heavy SPAs using Playwright.
*   **Satisfaction Ratings:** Allows visitors to rate their chat experience.
*   **Proactive Chat Popup:** Displays a customizable popup notification after a configurable delay.
*   **Email Notifications:** Sends automated alerts via Resend for new leads, unanswered questions, and performance reports.
*   **Async Indexing Pipeline:** Non-blocking chatbot creation with background processing, error recovery, and real-time status updates.
*   **Live Agent Handoff:** Allows visitors to request human support when the chatbot cannot assist. Features real-time WebSocket-based chat, a handoff queue, agent dashboard, and email notifications. Configurable business hours for live agent availability.
*   **Team Management System:** Account owners can invite team members with role-based access (owner/team_member), email invitations, and a management dashboard. Implements tier-based team member limits and a granular role-based permissions system.
*   **CRM Integration:** Generic webhook-based system for sending captured leads to CRMs, supporting various authentication types, custom headers, field mapping, automatic retry, and real-time sync tracking.
*   **Keyword Alerts:** Notifies chatbot owners when specific keywords are mentioned in chat. Features configurable keyword lists, dual-channel notifications (email/in-app), real-time detection, alert history, and a notifications panel.
*   **In-App Help Center:** Comprehensive self-service documentation accessible to all users via DashboardHeader. Features 10 step-by-step guides covering Phase 1 features, organized into 4 categories. Includes real-time search, URL-based article routing, markdown rendering (react-markdown + remark-gfm), and mobile-responsive three-pane layout with manifest-driven architecture.
*   **Tabbed Chatbot View:** Comprehensive read-only overview at `/view/:id` organizing all chatbot information into 6 tabs: Overview (basic info & statistics), Knowledge Base (URLs & documents), Personality (system prompt & custom instructions), Appearance (brand colors, logo, welcome message, suggested questions), Features (escalation & lead capture settings), and Analytics (metrics, conversation history, manual answer training). Supports `?tab=` query parameter for deep linking to specific tabs.
*   **Blog System:** Public-facing blog for SEO content marketing and thought leadership. Features PostgreSQL-backed content management, markdown article rendering with remark-gfm, SEO metadata support, blog listing page at `/blog` with card-based grid, individual article pages at `/blog/:slug`, and integrated navigation in Landing header and Footer. Articles include author attribution, read time estimates, published dates, and conversion-optimized CTAs.

### System Design Choices

*   **Data Storage:** PostgreSQL with Drizzle ORM for all persistent data.
*   **AI Integration:** Google Gemini AI (gemini-2.5-flash) via `@google/genai` SDK for NLP, with a streaming API, system prompt engineering, and chunk-based retrieval. Response priority: Manual Override → Exact Cache → Semantic Cache → LLM with Chunks.
*   **Knowledge Base Architecture:** Custom Playwright-based crawler with pgvector embeddings (via `@xenova/transformers`) for website content. Decision made (Nov 2025) to keep current system over Google Gemini File Search API due to: superior website handling, real-time URL updates, direct source attribution, full chunking control, and zero indexing costs. File Search deemed better suited for document uploads (PDFs/Word) rather than website crawling.
*   **File Storage:** Google Cloud Storage (via Replit Object Storage) for user-uploaded files, with Uppy.js for client-side uploads using signed URLs.
*   **Authentication & Security:** Custom email/password authentication (passport-local, bcrypt, session-based), CSRF protection, and Zod input validation. Multi-tenant architecture.
*   **Payment Processing:** Stripe integration with automatic subscription tier management via webhooks. Subscription cancellations preserve access until the billing period ends, with prominent UI indicators (banner on Dashboard, detailed alert on Account page) showing end date and CTAs to re-subscribe. Webhooks handle `cancel_at_period_end` flag and various subscription statuses for proper tier management.
*   **Deployment Architecture:** Frontend built with Vite, server code with esbuild, configured for development and production.
*   **Static File Serving:** In development, Vite serves static files from `client/public/` (e.g., `widget.js`, `demo.html`). In production, the build output goes to `dist/public/`. The embeddable widget script (`widget.js`) must be updated in `client/public/` to see changes during development.

## External Dependencies

### Third-Party Services

*   **Google Cloud Platform:** Gemini AI API (NLP), Google Cloud Storage (user file storage).
*   **Stripe:** Payment gateway for subscription management.
*   **Resend:** Transactional email service.
*   **Replit Infrastructure:** Replit Object Storage (managed object storage built on Google Cloud Storage).

### Key NPM Packages

*   **Frontend:** `@tanstack/react-query`, `@radix-ui/*`, `tailwindcss`, `wouter`, `@uppy/*`, `class-variance-authority`, `react-hook-form`, `zod`.
*   **Backend:** `express`, `@google/genai`, `@google-cloud/storage`, `drizzle-orm`, `@neondatabase/serverless`, `multer`, `passport`, `bcrypt`, `@xenova/transformers`, `resend`, `unpdf`.
*   **Build Tools:** `vite`, `esbuild`, `tsx`, `drizzle-kit`, `playwright`.

### Environment Requirements

`DATABASE_URL`, `GEMINI_API_KEY`, `SESSION_SECRET`, `STRIPE_SECRET_KEY`, `VITE_STRIPE_PUBLIC_KEY`, `RESEND_API_KEY`, `PUBLIC_OBJECT_SEARCH_PATHS`, `PRIVATE_OBJECT_DIR`, `DEFAULT_OBJECT_STORAGE_BUCKET_ID`.