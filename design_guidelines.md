# Design Guidelines: BuildMyChatbot.Ai

## Brand Identity

**Brand Name:** BuildMyChatbot.Ai  
**Logo:** Stylized "BC" letters in modern geometric design  
**Brand Personality:** Professional, innovative, tech-forward, trustworthy  
**Target Audience:** Non-technical business owners seeking AI-powered customer support solutions

**Logo Usage:**
- Primary logo: Full "BC" mark with "BuildMyChatbot.Ai" wordmark
- Navigation logo: 48px height for headers and sidebars
- Hero logo: 64-96px height for landing page
- Favicon: "BC" mark only
- Always maintain clear space around logo (minimum padding equal to logo height × 0.25)

---

## Design Approach: Professional SaaS Product System

**Selected Approach:** Design System with modern tech aesthetic

**Core Principles:**
- Clarity over decoration: Every element serves a functional purpose
- Progressive disclosure: Complex features revealed as needed
- Trust through consistency: Predictable patterns reduce cognitive load
- Professional warmth: Approachable but not playful
- Tech-forward design: Modern, clean, AI-focused aesthetic

---

## Color Palette

**Brand Colors:**
- **Navy Background:** 217 65% 9% (deep navy blue - #0F1829)
- **Bright Blue Accent:** 210 100% 65% (vibrant blue - #4A9FFF)
- **White:** 0 0% 100% (crisp white for text and surfaces)
- **Light Blue:** 210 100% 70% (used for ".Ai" suffix and secondary highlights)

**Light Mode:**
- **Background:** 0 0% 100% (pure white)
- **Card/Surface:** 220 13% 97% (subtle gray for cards)
- **Border:** 220 13% 91%
- **Primary:** 210 100% 65% (bright blue - #4A9FFF)
- **Primary Foreground:** 0 0% 100% (white text on primary)
- **Text Primary:** 217 65% 9% (navy for main text)
- **Text Secondary:** 215 16% 47% (muted slate)
- **Accent:** 210 100% 70% (light blue for highlights)
- **Accent Foreground:** 217 65% 9% (navy text on accent)

**Dark Mode:**
- **Background:** 217 65% 9% (navy background - #0F1829)
- **Card/Surface:** 217 45% 14% (slightly lighter navy for cards)
- **Border:** 217 35% 20%
- **Primary:** 210 100% 65% (bright blue - maintained)
- **Primary Foreground:** 0 0% 100% (white)
- **Text Primary:** 210 40% 98% (near white)
- **Text Secondary:** 215 20% 70% (light gray)
- **Accent:** 210 100% 70% (light blue)
- **Accent Foreground:** 0 0% 100% (white)

**Semantic Colors:**
- **Success:** 142 71% 45% (green for confirmations)
- **Warning:** 38 92% 50% (amber for cautions)
- **Error:** 0 72% 51% (red for errors)
- **Info:** 210 100% 65% (use primary blue)

**Sidebar Colors (Dark Mode Optimized):**
- **Sidebar Background:** 217 65% 9% (navy)
- **Sidebar Foreground:** 210 40% 98% (white)
- **Sidebar Primary:** 210 100% 65% (bright blue)
- **Sidebar Accent:** 217 45% 14% (lighter navy for hover states)
- **Sidebar Border:** 217 35% 20%

---

## Typography

**Font Families:**
- **Primary:** 'Inter', system-ui, sans-serif (body, UI elements)
- **Display:** 'Inter', system-ui, sans-serif (headings - use heavier weights for contrast)
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

**Brand Typography:**
- Use font-semibold or font-bold for headings to ensure strong contrast against backgrounds
- ".Ai" suffix should use text-primary or accent color to differentiate from "BuildMyChatbot"
- Maintain Inter font family throughout for consistency

---

## Layout System

**Spacing Primitives:** Tailwind units of 4, 6, 8, 12, 16, 24
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
- Persistent left sidebar with BC logo, "BuildMyChatbot.Ai" wordmark, main nav items
- Top bar with sidebar toggle, breadcrumbs, and theme toggle
- Mobile: Collapsible drawer with overlay
- Sidebar background uses navy color with bright blue accents for active items

**Dashboard Cards:**
- Card surface with subtle border, rounded-md corners
- Hover state with subtle elevation (use hover-elevate utility)
- Action buttons positioned top-right
- Status badges with semantic colors

**Wizard Steps:**
- Numbered step indicator at top with visual progress
- Content area with clear section headings
- Bottom action bar with "Back" and "Continue" buttons
- Visual completion checkmarks on completed steps

**Form Elements:**
- Labels: text-sm font-medium mb-2
- Inputs: Consistent height (h-11), rounded-md, border with focus ring
- File upload: Drag-drop zone with dashed border, icon, and helper text
- Color picker: Preview circle next to hex input
- Toggle switches for boolean settings

**Buttons:**
- Primary actions: Use primary color (bright blue) with white text
- Secondary actions: Use outline or ghost variants
- Destructive actions: Use destructive variant (red)
- Icon buttons: Use size="icon" variant

### Client-Side Chat Widget

**Floating Button:**
- Fixed bottom-right position (bottom-6 right-6)
- Circular, 60px diameter, shadow-xl
- Primary brand color (bright blue) background with white icon
- Subtle pulse animation on first load

**Chat Window:**
- Slides up from button position with smooth animation
- Dimensions: 400px wide × 600px tall on desktop, full-screen on mobile
- Rounded-2xl with shadow-2xl
- Header: BC logo (40px), "BuildMyChatbot.Ai" branding, minimize/close buttons
- Uses brand colors: navy background in dark mode, white in light mode

**Message Styles:**
- User messages: Right-aligned, primary brand color (bright blue) background, white text
- Bot messages: Left-aligned, surface background, primary text
- Typing indicator: Three animated dots in bot message style

---

## Key Screens & Flows

**Landing Page (Marketing):**
- Hero section: BC logo, bold headline "Build Your AI Support Assistant in Minutes"
- Features section: 3-column grid with icons
- Widget demo: Interactive preview
- Pricing table: Free, Pro, Scale tiers
- Footer with BuildMyChatbot.Ai branding

**Authentication Pages:**
- Centered card with BC logo at top (64px height)
- "BuildMyChatbot.Ai" wordmark below logo
- Clean, focused forms with primary CTA buttons
- Navy accent elements

**Dashboard:**
- Sidebar with BC logo and navigation
- Welcome message with quick stats
- "Create New Chatbot" CTA with primary color
- Grid of existing chatbots

**Creation Wizard:**
- Clean, focused, one thing at a time
- Progress clearly visible with brand colors
- Success screen with BC logo and celebration

---

## Images & Visual Assets

**Logo Files:**
- Primary: BC logo with full wordmark (SVG preferred)
- Mark only: BC letters for favicon and small spaces
- Use bright blue (#4A9FFF) for logo elements

**Icons:**
- Use Lucide React icons throughout
- Match icon color to text color for consistency
- Use primary color for accent icons

**Illustrations:**
- Modern, tech-focused style
- Use brand colors: navy, bright blue, white
- Friendly but professional tone

---

## Dark Mode Strategy

**Approach:** Navy-based dark mode that mirrors brand identity

**Key Differences:**
- Background: Switch to navy (#0F1829) instead of black
- Cards: Slightly lighter navy for elevation
- Text: Near-white with good contrast
- Primary blue: Maintains brightness and visibility
- Borders: Subtle with low contrast
- Elevate utilities: Blue-tinted translucency for hover states

**Testing:**
- Ensure all text meets WCAG AA contrast requirements
- Verify CTA buttons stand out clearly
- Test charts and data visualizations for readability

---

## Accessibility

- Maintain WCAG AA contrast ratios (4.5:1 for normal text, 3:1 for large text)
- Bright blue primary color (#4A9FFF) on navy background: excellent contrast
- White text on navy background: excellent contrast
- All interactive elements have visible focus states
- Keyboard navigation supported throughout
- Screen reader friendly labels and ARIA attributes
