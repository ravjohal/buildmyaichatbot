# AI Chatbot Builder

## Overview

This is a SaaS web application that enables non-technical business owners to create, customize, and deploy AI-powered customer support chatbots for their websites. The platform provides a guided wizard interface for building chatbots that can answer questions based on website content and uploaded documents, with full customization of appearance and behavior.

The application consists of two main components:
1. **Admin Builder Application** - A React-based dashboard where users create and manage chatbots
2. **Embeddable Widget** - A client-side chat interface that can be embedded on any website via a simple script tag

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Technology Stack:**
- React with TypeScript for type safety
- Vite as the build tool and development server
- Wouter for lightweight client-side routing
- TanStack Query (React Query) for server state management
- Tailwind CSS with shadcn/ui component library (New York variant)

**Design System:**
- Professional SaaS aesthetic inspired by Stripe/Linear
- Focus on clarity over decoration with progressive disclosure patterns
- Custom color system supporting light/dark modes
- Typography using Inter for UI and JetBrains Mono for code snippets
- Comprehensive component library from Radix UI primitives

**Key UI Patterns:**
- Multi-step wizard flow for chatbot creation
- Real-time preview of chatbot appearance during customization
- Toast notifications for user feedback
- Responsive design with mobile-first approach

### Backend Architecture

**Technology Stack:**
- Express.js server running on Node.js
- TypeScript throughout for type safety
- In-memory storage (MemStorage) for MVP with interface-based design for future database migration
- RESTful API design pattern

**API Endpoints:**
- `GET /api/chatbots` - List all chatbots
- `GET /api/chatbots/:id` - Get single chatbot
- `POST /api/chatbots` - Create new chatbot
- `PUT /api/chatbots/:id` - Update chatbot
- `DELETE /api/chatbots/:id` - Delete chatbot
- `POST /api/chat` - Process chat messages

**Data Validation:**
- Zod schemas for runtime type validation
- Shared schema definitions between client and server (`@shared/schema`)
- Drizzle ORM schemas prepared for PostgreSQL migration

**Widget Delivery:**
- Iframe-based isolation for security and styling independence
- Simple script tag integration (`<script src="/widget.js" data-chatbot-id="...">`)
- Cross-origin messaging for widget state management

### Data Storage

**Current Implementation:**
- In-memory Map-based storage (MemStorage class)
- IStorage interface abstraction for easy database migration

**Prepared Migration Path:**
- Drizzle ORM configuration for PostgreSQL
- Schema defined for Neon serverless PostgreSQL
- Database URL configuration via environment variables

**Data Models:**
- Chatbots table with fields for name, URLs, content, styling, and behavior
- Document references stored as text arrays
- No persistent chat history in MVP (session-based only)

### AI Integration

**Google Gemini AI:**
- Uses `@google/genai` SDK for natural language processing
- System prompt engineering to constrain responses to knowledge base
- Context-aware responses based on website content and uploaded documents
- Escalation detection for routing to human support

**Knowledge Base Construction:**
- Website scraping capability for URL-based content ingestion
- Document upload support (PDF, TXT, MD formats)
- Content concatenation for AI context window

### File Storage

**Google Cloud Storage Integration:**
- Replit Object Storage via Google Cloud Storage SDK
- Uppy.js for client-side file upload UI with AWS S3 compatibility layer
- Support for company logos and document storage
- Public/private object path segregation

**Upload Flow:**
- Client requests signed upload URL from server
- Direct upload to object storage from browser
- Server tracks file references in chatbot configuration

### Authentication & Security

**Current State:**
- No authentication in MVP (single-user assumption)
- CSRF protection via Express middleware
- Input validation with Zod schemas

**Prepared for Future:**
- Session-based architecture ready for auth integration
- Credential management via environment variables

### Deployment Architecture

**Build Process:**
- Vite builds optimized React bundle to `dist/public`
- esbuild bundles server code to `dist/index.js`
- Static assets served from built public directory

**Development Environment:**
- Vite dev server with HMR for frontend
- tsx for TypeScript execution in development
- Replit-specific plugins for error overlay and dev tools

**Production Considerations:**
- Environment-based configuration (NODE_ENV)
- Separate client and server build artifacts
- Static file serving with Express in production

## External Dependencies

### Third-Party Services

**Google Cloud Platform:**
- **Gemini AI API** - Natural language processing and chat responses
- **Google Cloud Storage** - File storage for logos and documents (via Replit Object Storage)

**Replit Infrastructure:**
- **Replit Sidecar** - OAuth token provider for Google Cloud services
- **Replit Object Storage** - Managed object storage service

### Key NPM Packages

**Frontend:**
- `@tanstack/react-query` - Server state management
- `@radix-ui/*` - Accessible UI primitives
- `tailwindcss` - Utility-first CSS framework
- `wouter` - Lightweight routing
- `@uppy/core`, `@uppy/dashboard`, `@uppy/aws-s3` - File upload UI and handling
- `class-variance-authority` - Component variant styling
- `react-hook-form` + `@hookform/resolvers` - Form handling
- `zod` - Schema validation

**Backend:**
- `express` - Web server framework
- `@google/genai` - Gemini AI SDK
- `@google-cloud/storage` - Cloud storage client
- `drizzle-orm` - Database ORM (prepared for use)
- `@neondatabase/serverless` - Neon PostgreSQL driver
- `multer` - Multipart form data handling

**Build Tools:**
- `vite` - Frontend build tool
- `esbuild` - Server bundler
- `tsx` - TypeScript execution
- `drizzle-kit` - Database migrations tool

**Environment Requirements:**
- `DATABASE_URL` - PostgreSQL connection string (for future use)
- `GEMINI_API_KEY` - Google Gemini AI API key
- `PUBLIC_OBJECT_SEARCH_PATHS` - Object storage configuration