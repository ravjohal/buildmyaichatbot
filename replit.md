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
- `GEMINI_API_KEY` - Google Gemini AI API key (configured)
- `PUBLIC_OBJECT_SEARCH_PATHS` - Object storage public path (configured)
- `PRIVATE_OBJECT_DIR` - Object storage private directory (configured)
- `DEFAULT_OBJECT_STORAGE_BUCKET_ID` - Object storage bucket ID (configured)
- `SESSION_SECRET` - Session management secret (configured)

## Recent Changes

**2025-10-12 - Website Crawling Feature:**
- ✅ Implemented automatic website crawling for chatbot knowledge base
- ✅ Users can add multiple URLs in wizard - content is automatically crawled
- ✅ Uses cheerio library for HTML text extraction
- ✅ Stores URLs in websiteUrls array (text[]) in database
- ✅ Stores crawled content in websiteContent field
- ✅ Backend crawls URLs on chatbot creation and update
- ✅ Basic SSRF protection added (blocks localhost, private IPs, metadata endpoints)
- ✅ Fixed routing bug (removed fragment wrappers in Switch)
- ⚠️ Note: For production, implement DNS-level SSRF protection or use sandboxed crawling service

**2025-10-12 - User Authentication & Database Migration:**
- ✅ Migrated from in-memory storage to PostgreSQL with Drizzle ORM
- ✅ Implemented Replit Auth user authentication (OIDC with Google, GitHub, X, Apple, email/password)
- ✅ Added multi-tenant architecture with user-scoped chatbots
- ✅ Created Landing page for unauthenticated users
- ✅ Fixed critical authentication bugs
- ✅ Session management with PostgreSQL storage and 1-week TTL
- ✅ Multi-tenant data isolation enforced (userId scoping on all chatbot CRUD)

**Previous Implementation:**
- ✅ Dashboard wizard flow fully functional
- ✅ Chat widget with Gemini AI responses working
- ✅ Escalation logic with phone number display operational
- ✅ Object storage integration complete

**Testing Status:**
- Website Crawling: ✅ PASSED (successfully crawled example.com)
- User Authentication Flow: ✅ PASSED
- Multi-Tenant Data Isolation: ✅ PASSED
- Dashboard Creation Flow: ✅ PASSED
- Chat Widget Functionality: ✅ PASSED  
- AI Response Generation: ✅ PASSED
- Escalation Logic: ✅ PASSED

## Application Features

### Chatbot Creation Wizard

**Step 1: Name & Description**
- Chatbot name input with validation
- Optional description field
- Auto-generated unique ID

**Step 2: Knowledge Base**
- Website URL input (multiple URLs supported)
- Document upload support (.pdf, .txt, .md)
- ObjectUploader component with Uppy integration
- Real-time upload progress

**Step 3: Personality & Tone**
- Welcome message customization
- Chat input placeholder text
- Personality tone selection (friendly, professional, casual)
- System prompt configuration

**Step 4: Visual Customization**
- Primary color picker
- Accent/secondary color picker
- Logo upload with ObjectUploader
- Real-time preview of chat widget appearance

**Step 5: Support Escalation**
- Escalation email configuration
- Support phone number input
- Custom escalation message with {phone} placeholder
- Escalation trigger keyword detection

**Completion**
- Success confirmation
- One-click embed code copy
- Direct navigation to dashboard

### Chat Widget Features

**User Interface:**
- Floating chat button with custom colors
- Expandable chat window (400x600px)
- Smooth animations and transitions
- Mobile-responsive design

**Conversation Features:**
- Welcome message display on first open
- AI-powered responses using Gemini 2.5 Flash
- Conversation history maintained during session
- Typing indicator during AI processing
- Escalation detection and phone number display
- Click-to-call functionality for phone numbers

**Technical Implementation:**
- Route-based widget access at /widget/:id
- JSON response parsing from API
- Proper null safety for all message content
- Real-time message rendering
- Auto-scroll to latest message

### Dashboard

**Chatbot Management:**
- List view of all created chatbots
- Quick actions: Edit, Delete, Copy Embed Code
- Visual indicators for configured features
- One-click embed code copy with toast notification

**Embed Code Generation:**
- Simple script tag for any website
- Automatic chatbot ID injection
- No configuration required on target site

## API Routes

### Chatbot Management
- `GET /api/chatbots` - Retrieve all chatbots
- `GET /api/chatbots/:id` - Get specific chatbot
- `POST /api/chatbots` - Create new chatbot with Zod validation
- `PUT /api/chatbots/:id` - Update chatbot configuration
- `DELETE /api/chatbots/:id` - Remove chatbot
- `PUT /api/chatbots/:id/logo` - Update chatbot logo URL

### Object Storage
- `POST /api/objects/upload` - Get presigned upload URL
- `GET /api/objects/:id` - Download object file

### AI Chat
- `POST /api/chat` - Process chat message with Gemini AI
  - Request: `{ chatbotId, message, conversationHistory }`
  - Response: `{ message, shouldEscalate }`
  - Knowledge base context injection
  - Escalation keyword detection

## Known Limitations & Future Enhancements

**Current Limitations:**
- No user authentication (single-user mode)
- In-memory storage (data lost on restart)
- Document content extraction not implemented
- No chat history persistence
- No analytics or reporting

**Planned Enhancements:**
- Multi-user authentication with Replit Auth
- PostgreSQL database migration
- PDF/TXT/MD content parsing and extraction
- Chat history storage and export
- Analytics dashboard (conversation metrics, satisfaction scores)
- A/B testing for chatbot configurations
- Integration with popular CRM systems
- Advanced AI model selection
- Custom training data upload