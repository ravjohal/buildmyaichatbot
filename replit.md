# BuildMyChatbot.Ai

## Overview

BuildMyChatbot.Ai is a SaaS web application that enables non-technical business owners to create, customize, and deploy AI-powered chatbots. The platform primarily focuses on providing "intelligent search" to replace traditional website search bars with AI that delivers direct answers. It targets a broad market including content publishers, data sites, documentation platforms, and knowledge bases, alongside traditional support use cases. Key features include a guided creation wizard, Playwright-based SPA crawling, extensive customization, an embeddable widget, streaming LLM responses, chunk-based knowledge retrieval, multi-tier user management, comprehensive analytics, and a 4-tier pricing model integrated with Stripe.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions

The frontend uses React, TypeScript, Vite, Wouter for routing, and TanStack Query for server state management. Tailwind CSS with shadcn/ui (New York variant) provides a professional SaaS aesthetic. The design includes a multi-step chatbot creation wizard, real-time customization previews, and a responsive layout, with a consistent `DashboardHeader` for global navigation.

### Technical Implementations

The backend is built with Express.js, Node.js, and TypeScript, following a RESTful API design. Zod is used for data validation, and PostgreSQL with Drizzle ORM for data persistence. The embeddable chat widget is isolated in an iframe. Playwright is used for operations like rendering SPAs with SSRF protection. Database connections feature automatic retry logic. PDF extraction employs a 6-strategy fallback system. An intelligent chunker processes text for knowledge retrieval. Chatbot responses include source attribution and support configurable custom instructions.

### Feature Specifications

*   **Chatbot Creation Wizard:** A 7-step guide for configuration, knowledge base (URLs, documents), personality (including Gemini model selection), visual customization, support escalation, lead capture, and CRM integration.
*   **Chat Widget:** Embeddable, customizable, mobile-responsive AI chat with streaming responses, suggested questions, conversation history, escalation detection, and lead capture forms.
*   **Smart Suggested Questions:** AI (Gemini) generates FAQ-style questions from indexed website content.
*   **Streaming LLM Responses:** Uses Server-Sent Events (SSE) for real-time display.
*   **Chunk-Based Knowledge Retrieval:** Semantic chunking, vectorization, and top-k similarity search for content.
*   **Visual Content Display:** Indexes and displays images from websites inline in chat responses.
*   **Q&A Caching System:** Reduces LLM costs by caching question-answer pairs with hybrid matching using pgvector.
*   **Manual Answer Training:** Allows owners to correct AI responses via the Analytics interface.
*   **Lead Capture System:** Collects visitor contact information via configurable forms, with a dashboard and CSV export.
*   **On-Demand Knowledge Base Refresh:** Intelligently updates knowledge bases from website URLs.
*   **Analytics Dashboard:** Provides metrics, conversation transcripts, and performance breakdowns.
*   **4-Tier Pricing System:** Free, Starter ($24.99/month), Business ($49/month), and Scale ($129/month) tiers with server-side limit enforcement.
*   **Admin System:** Full user management, system-wide statistics, and access to all chatbots for administrators.
*   **Account Management:** Users manage profile, subscription, and billing via an integrated Stripe portal.
*   **Shareable Links & QR Codes:** For chatbot distribution via direct links and full-page chat interfaces.
*   **Intelligent SPA Crawler:** Dual-mode crawler for JavaScript-heavy SPAs using Playwright.
*   **Satisfaction Ratings:** Allows visitors to rate chat experiences.
*   **Proactive Chat Popup:** Customizable popup notification after a delay.
*   **Email Notifications:** Automated alerts via Resend for new leads, unanswered questions, and performance reports.
*   **Async Indexing Pipeline:** Non-blocking chatbot creation with background processing and real-time status updates.
*   **Live Agent Handoff:** Enables human support requests with real-time WebSocket chat, handoff queue, agent dashboard, and email notifications.
*   **Team Management System:** Role-based access for team members with invitations and a management dashboard.
*   **CRM Integration:** Webhook-based system for sending captured leads to CRMs, with various authentication types, custom headers, and field mapping.
*   **Keyword Alerts:** Notifies chatbot owners when specific keywords are mentioned in chat.
*   **In-App Help Center:** Comprehensive self-service documentation with search, article routing, and markdown rendering.
*   **Tabbed Chatbot View:** Read-only overview (`/view/:id`) organizing chatbot information into 6 tabs: Overview, Knowledge Base, Personality, Appearance, Features, and Analytics.
*   **Blog System:** Public-facing blog for SEO and content marketing, featuring PostgreSQL-backed content, markdown rendering, and SEO metadata.
*   **Branded Chat Widgets:** All chatbot widgets display "Powered by BuildMyChatbot.AI" branding at the bottom, with a clickable link to buildmychatbot.ai. Appears in embedded widgets, full-page chat interfaces, shareable links, and customization previews.

### System Design Choices

*   **Data Storage:** PostgreSQL with Drizzle ORM.
*   **AI Integration:** Google Gemini AI via `@google/genai` SDK for NLP, streaming API, system prompt engineering, and chunk-based retrieval. Supports model selection per chatbot with 5 options: gemini-2.5-flash (default), gemini-2.0-flash-exp, gemini-2.5-pro, gemini-1.5-flash, and gemini-1.5-pro. Response priority: Manual Override → Exact Cache → Semantic Cache → LLM with Chunks.
*   **Knowledge Base Architecture:** Custom Playwright-based crawler with pgvector embeddings (via `@xenova/transformers`) for website content.
*   **File Storage:** Google Cloud Storage (via Replit Object Storage) for user-uploaded files, with Uppy.js for client-side uploads.
*   **Authentication & Security:** Custom email/password authentication (passport-local, bcrypt, session-based), CSRF protection, and Zod input validation in a multi-tenant architecture.
*   **Payment Processing:** Stripe integration with automatic subscription tier management via webhooks.
*   **Deployment Architecture:** Frontend with Vite, server with esbuild.
*   **Static File Serving:** `client/public/` in development, `dist/public/` in production.

## External Dependencies

### Third-Party Services

*   **Google Cloud Platform:** Gemini AI API (NLP), Google Cloud Storage (user file storage).
*   **Stripe:** Payment gateway for subscription management.
*   **Resend:** Transactional email service.
*   **Replit Infrastructure:** Replit Object Storage.

### Key NPM Packages

*   **Frontend:** `@tanstack/react-query`, `@radix-ui/*`, `tailwindcss`, `wouter`, `@uppy/*`, `class-variance-authority`, `react-hook-form`, `zod`.
*   **Backend:** `express`, `@google/genai`, `@google-cloud/storage`, `drizzle-orm`, `@neondatabase/serverless`, `multer`, `passport`, `bcrypt`, `@xenova/transformers`, `resend`, `unpdf`.
*   **Build Tools:** `vite`, `esbuild`, `tsx`, `drizzle-kit`, `playwright`.

### Environment Requirements

`DATABASE_URL`, `GEMINI_API_KEY`, `SESSION_SECRET`, `STRIPE_SECRET_KEY`, `VITE_STRIPE_PUBLIC_KEY`, `RESEND_API_KEY`, `PUBLIC_OBJECT_SEARCH_PATHS`, `PRIVATE_OBJECT_DIR`, `DEFAULT_OBJECT_STORAGE_BUCKET_ID`.