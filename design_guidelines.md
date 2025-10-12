# Design Guidelines: AI-Powered Customer Support Chatbot Builder

## Design Approach: Professional SaaS Product System

**Selected Approach:** Design System (Stripe/Linear-inspired clean aesthetic)

**Justification:** This is a utility-focused B2B SaaS product for non-technical users requiring maximum clarity, learnability, and trust. The interface must guide users confidently through complex workflows while maintaining a professional, modern appearance that instills confidence in the AI technology.

**Core Principles:**
- Clarity over decoration: Every element serves a functional purpose
- Progressive disclosure: Complex features revealed as needed
- Trust through consistency: Predictable patterns reduce cognitive load
- Professional warmth: Approachable but not playful

---

## Color Palette

**Light Mode:**
- **Primary Brand:** 214 88% 51% (vibrant blue - trust, technology)
- **Primary Hover:** 214 88% 45%
- **Background:** 0 0% 100% (pure white)
- **Surface:** 220 13% 97% (subtle gray for cards)
- **Border:** 220 13% 91%
- **Text Primary:** 222 47% 11% (near black)
- **Text Secondary:** 215 16% 47% (muted slate)

**Dark Mode:**
- **Primary Brand:** 214 88% 58%
- **Primary Hover:** 214 88% 65%
- **Background:** 222 47% 11%
- **Surface:** 217 33% 17%
- **Border:** 217 33% 24%
- **Text Primary:** 210 40% 98%
- **Text Secondary:** 215 16% 65%

**Semantic Colors:**
- **Success:** 142 71% 45% (green for confirmations)
- **Warning:** 38 92% 50% (amber for cautions)
- **Error:** 0 72% 51% (red for errors)
- **Info:** 199 89% 48% (cyan for information)

---

## Typography

**Font Families:**
- **Primary:** 'Inter', system-ui, sans-serif (body, UI elements)
- **Display:** 'Inter', system-ui, sans-serif (headings - use weight variation)
- **Mono:** 'JetBrains Mono', 'Courier New', monospace (code snippets, embed codes)

**Scale & Hierarchy:**
- **Hero Heading:** text-5xl md:text-6xl, font-bold, tracking-tight
- **Page Title:** text-3xl md:text-4xl, font-bold
- **Section Heading:** text-2xl, font-semibold
- **Card Title:** text-xl, font-semibold
- **Body Large:** text-lg, font-normal
- **Body:** text-base, font-normal
- **Small:** text-sm, font-normal
- **Tiny:** text-xs, font-medium (labels, captions)

---

## Layout System

**Spacing Primitives:** Tailwind units of 2, 4, 6, 8, 12, 16, 24
- Component padding: p-4 to p-6
- Section spacing: py-12 to py-24
- Card gaps: gap-4 to gap-6
- Form field spacing: space-y-4

**Container Strategy:**
- **Full Dashboard:** max-w-7xl mx-auto (main app container)
- **Wizard Steps:** max-w-3xl mx-auto (focused creation flow)
- **Widget Preview:** Fixed dimensions, centered in viewport
- **Forms:** max-w-2xl for optimal readability

**Grid Patterns:**
- **Dashboard Cards:** grid-cols-1 md:grid-cols-2 lg:grid-cols-3
- **Settings Forms:** Single column for clarity
- **Widget Customization:** Two-column split (controls left, preview right)

---

## Component Library

### Admin Dashboard Interface

**Navigation:**
- Persistent left sidebar (w-64) with logo, main nav items, and user menu at bottom
- Top bar with breadcrumbs, global search, and profile dropdown
- Mobile: Collapsible drawer with overlay

**Dashboard Cards:**
- White/dark surface with subtle border, rounded-xl corners
- Hover state with subtle shadow elevation (shadow-md to shadow-lg)
- Action buttons positioned top-right
- Status badges with semantic colors

**Wizard Steps:**
- Numbered step indicator at top (1→2→3→4→5) with visual progress
- Content area with clear section headings
- Bottom action bar with "Back" and "Continue" buttons, sticky positioning
- Visual completion checkmarks on completed steps

**Form Elements:**
- Labels: text-sm font-medium mb-2
- Inputs: Consistent height (h-11), rounded-lg, border focus ring with primary color
- File upload: Drag-drop zone with dashed border, icon, and helper text
- Color picker: Preview circle next to hex input
- Toggle switches for boolean settings (not checkboxes)

**Knowledge Base Setup:**
- URL input with validation indicator and "Scan Website" button
- Document upload area: Grid of uploaded files with thumbnails, names, and remove icons
- Processing status: Animated progress indicator during indexing

**Customization Preview:**
- Live preview panel showing widget as it will appear
- Split view: Controls on left (60%), live preview on right (40%)
- Preview updates in real-time as user adjusts settings

**Embed Code Display:**
- Code block with syntax highlighting (light/dark aware)
- One-click copy button positioned top-right
- Clear step-by-step instructions below with numbered list
- Platform-specific tabs (Generic HTML, WordPress, Squarespace)

### Client-Side Chat Widget

**Floating Button:**
- Fixed bottom-right position (bottom-6 right-6)
- Circular, 60px diameter, shadow-xl
- Primary brand color background with white icon
- Subtle pulse animation on first load (then static)
- Unread badge indicator if needed

**Chat Window:**
- Slides up from button position with smooth animation
- Dimensions: 400px wide × 600px tall on desktop, full-screen on mobile
- Rounded-2xl with shadow-2xl
- Header: Custom logo (40px), business name, minimize/close buttons
- Body: Messages container with smooth scroll
- Footer: Input field with send button

**Message Styles:**
- User messages: Right-aligned, primary brand color background, white text, rounded-2xl rounded-tr-sm
- Bot messages: Left-aligned, surface background, primary text, rounded-2xl rounded-tl-sm
- Timestamp: text-xs text-secondary below each message
- Typing indicator: Three animated dots in bot message style

**Welcome Screen:**
- Centered welcome message with larger text
- Suggested questions as clickable pills (bg-surface, hover:bg-primary hover:text-white)
- Arranged in 2-column grid with gap-2

**Escalation Display:**
- When providing phone number: Highlighted message with phone icon
- Click-to-call button on mobile devices
- "Call Support" CTA in primary color

---

## Key Screens & Flows

**Landing Page (Marketing):**
- Hero section (80vh): Bold headline "Build Your AI Support Assistant in Minutes", subheading, CTA button, hero image/illustration showing dashboard
- Features section: 3-column grid showcasing core capabilities with icons
- How It Works: 5-step visual process flow
- Widget demo: Interactive preview of chat widget
- Pricing table: Simple 2-3 tier comparison
- Footer with trust badges, links, newsletter signup

**Dashboard:**
- Welcome message with quick stats (total chatbots, conversations this month)
- "Create New Chatbot" prominent CTA card at top
- Grid of existing chatbots with preview thumbnails, status, and quick actions
- Empty state: Illustration with encouraging message and create button

**Creation Wizard:**
- Clean, focused, one thing at a time
- Progress clearly visible
- Next/Back navigation always accessible
- Success confirmation screen with immediate "Get Embed Code" option

**Chat Widget (Embedded):**
- Seamless brand integration with client's site
- Instant load with no layout shift
- Accessible keyboard navigation
- Responsive from 320px to 1920px viewports

---

## Images & Visual Assets

**Dashboard/Marketing Images:**
- Hero illustration: Modern, abstract representation of AI + customer service (chat bubbles, network nodes, friendly robot character)
- Feature icons: Use Heroicons (outline style) for consistency
- Dashboard screenshots: Actual product UI mockups showing key features
- Success/empty states: Friendly illustrations (undraw.co style)

**No custom SVG generation needed - use Heroicons CDN for all interface icons**