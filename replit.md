# AI Chatbot Builder

## Overview

This SaaS web application enables non-technical business owners to create, customize, and deploy AI-powered customer support chatbots for their websites. It features a guided wizard for chatbot creation based on website content and uploaded documents, with extensive customization options. The project consists of an Admin Builder Application (React-based dashboard) and an Embeddable Widget for website integration. The business vision is to empower businesses with efficient, AI-driven customer support, reducing operational costs and improving customer satisfaction.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

The frontend is built with React and TypeScript, using Vite for development and Wouter for routing. TanStack Query manages server state, and Tailwind CSS with shadcn/ui (New York variant) provides a professional SaaS aesthetic inspired by Stripe/Linear. Key UI patterns include a multi-step wizard for chatbot creation, real-time customization previews, and a responsive design.

### Backend Architecture

The backend uses Express.js with Node.js and TypeScript. It follows a RESTful API design pattern with Zod for data validation. Data is currently stored in-memory using an `IStorage` interface, with Drizzle ORM schemas prepared for a PostgreSQL migration. Widget delivery is iframe-based for isolation, integrated via a simple script tag.

### Data Storage

Currently utilizes an in-memory Map-based storage (`MemStorage`). A migration path to PostgreSQL with Drizzle ORM and Neon serverless PostgreSQL is prepared, with schemas defined for chatbot configurations including name, URLs, content, styling, and behavior.

### AI Integration

The application integrates with Google Gemini AI via the `@google/genai` SDK for natural language processing. It uses system prompt engineering to constrain responses to a knowledge base constructed from website content (scraped) and uploaded documents (PDF, TXT, MD).

### File Storage

Google Cloud Storage (via Replit Object Storage) is integrated for storing company logos and documents. Uppy.js handles client-side file uploads, utilizing signed URLs for direct browser-to-storage uploads.

### Authentication & Security

The MVP currently assumes a single user with no authentication. CSRF protection is implemented, and input validation is enforced with Zod schemas. The architecture is designed for future integration of session-based authentication.

### Deployment Architecture

Frontend assets are built with Vite, and server code is bundled with esbuild. The application is configured for development with Vite HMR and `tsx`, and for production with environment-based configurations.

### Application Features

**Chatbot Creation Wizard:** A multi-step wizard guides users through configuring chatbot name, knowledge base (website URLs, document uploads), personality (welcome message, tone), visual customization (colors, logo), and support escalation (email, phone number, escalation message).

**Chat Widget:** An embeddable, customizable, and mobile-responsive chat interface featuring AI-powered responses, conversation history, typing indicators, and escalation detection.

**Dashboard:** Provides chatbot management capabilities, including listing all chatbots, quick actions (edit, delete, copy embed code), visual feature indicators, and simplified embed code generation.

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

`DATABASE_URL`, `GEMINI_API_KEY`, `PUBLIC_OBJECT_SEARCH_PATHS`, `PRIVATE_OBJECT_DIR`, `DEFAULT_OBJECT_STORAGE_BUCKET_ID`, `SESSION_SECRET`.