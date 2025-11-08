# Chatbot Creation Wizard

The 7-step chatbot creation wizard guides you through building a fully customized AI chatbot. This comprehensive guide explains each step in detail.

## Overview

The chatbot wizard consists of 7 steps:

1. **Name & Basics** - Set up your chatbot name
2. **Knowledge Base** - Add content sources
3. **Personality** - Define how your chatbot communicates
4. **Customization** - Brand colors and visual design
5. **Escalation** - Live agent handoff and keyword alerts
6. **Lead Capture** - Collect visitor information
7. **CRM Integration** - Sync leads automatically

---

## Step 1: Name & Basics

Give your chatbot a clear, descriptive name.

### What to Do:

1. Enter a name in the **"Chatbot Name"** field
2. Click **"Next"** to continue

### Best Practices:

- Use a name that reflects the bot's purpose (e.g., "Support Assistant", "Sales Helper")
- Keep it professional and aligned with your brand
- Avoid special characters or emojis

![Step 1: Chatbot Name](#screenshot-step1)

---

## Step 2: Knowledge Base

Add content sources for your chatbot to learn from. The AI uses this content to answer visitor questions.

### Website URLs

Import content directly from your website:

1. Enter a URL in the **"Website URL"** field
2. Click **"Add URL"**
3. The system will crawl the page and linked pages
4. Repeat to add more URLs

**Supported:**
- Public websites (no login required)
- Single pages or entire sites
- Both static and JavaScript-based sites

**Example URLs:**
- `https://yourcompany.com` - Full site
- `https://yourcompany.com/faq` - Specific page
- `https://yourcompany.com/products` - Product section

### Document Uploads

Upload documents containing relevant information:

1. Click **"Upload Documents"**
2. Select PDF, Word (.docx), or text files
3. Files are processed automatically
4. Upload multiple documents at once

**Supported Formats:**
- PDF documents
- Microsoft Word (.docx)
- Plain text (.txt)

**Tips:**
- PDFs with clear text extract better than scanned images
- Organize content into smaller, focused documents
- Avoid password-protected files

### Refresh Knowledge Base

After creating your chatbot, you can update its knowledge:

1. Go to the chatbot's dashboard
2. Click **"Refresh Knowledge Base"**
3. The system detects content changes automatically
4. Only modified sources are re-indexed

![Step 2: Knowledge Base](#screenshot-step2)

> **Note:** Initial indexing takes 1-5 minutes depending on content size. You'll see progress in real-time.

---

## Step 3: Personality

Define how your chatbot communicates with visitors.

### Personality Presets

Choose from three preset styles:

- **Professional** - Formal, business-appropriate tone
- **Friendly** - Casual, approachable conversation
- **Custom** - Write your own personality guidelines

### Custom Instructions

For maximum control, add custom instructions:

**Examples:**
- "Always greet users warmly and use their name if provided"
- "When discussing pricing, focus on value over cost"
- "Keep responses concise—under 3 sentences when possible"
- "Never discuss competitor products"

**Best Practices:**
- Be specific about tone and style
- Include do's and don'ts
- Test different instructions to see what works

![Step 3: Personality](#screenshot-step3)

---

## Step 4: Customization

Personalize your chatbot's visual appearance.

### Logo Upload

1. Click **"Upload Logo"**
2. Select an image file (PNG, JPG, or SVG)
3. Logo appears in the chat header

**Requirements:**
- Recommended size: 200x200 pixels
- Maximum file size: 2MB
- Transparent background works best (PNG)

### Brand Colors

Customize the chat widget colors:

**Primary Color**
- Used for chat bubbles and buttons
- Click the color picker to choose

**Accent Color**
- Used for highlights and links
- Should complement primary color

**Header Background**
- Color behind the chatbot name/logo

**Color Tips:**
- Ensure sufficient contrast for readability
- Test on both light and dark backgrounds
- Match your website's existing brand colors

### Chat Position

Choose where the chat widget appears:

- **Bottom Right** (default) - Standard position
- **Bottom Left** - Alternative placement

### Welcome Message

Customize the initial greeting:

1. Enter your message in the **"Welcome Message"** field
2. Keep it friendly and informative

**Example:**
"Hi! I'm here to help answer your questions about [Your Company]. How can I assist you today?"

![Step 4: Customization](#screenshot-step4)

---

## Step 5: Escalation

Configure how visitors can reach human support.

### Live Agent Handoff

Allow visitors to request human assistance:

1. Toggle **"Enable Live Agent Handoff"** to ON
2. Configure business hours:
   - Select days of the week
   - Set start and end times
   - Choose timezone
3. Visitors see a "Request Live Agent" button during these hours

**How It Works:**
- Visitor clicks "Request Live Agent"
- Request appears in your team's Live Chats dashboard
- Team members can accept and chat in real-time via WebSocket

### Business Hours

Set when live agents are available:

- **Days of Week** - Check days your team is available
- **Start Time** - When agents begin (e.g., 9:00 AM)
- **End Time** - When agents finish (e.g., 5:00 PM)
- **Timezone** - Your team's timezone

Outside these hours, visitors see: "Our team is currently offline. Please leave a message and we'll respond soon."

### Keyword Alerts

Get notified when visitors mention specific words:

1. Toggle **"Enable Keyword Alerts"** to ON
2. Add keywords (e.g., "refund", "cancel", "urgent")
3. Choose notification channels:
   - **Email** - Sent to your account email
   - **In-App** - Appears in notification bell

**Use Cases:**
- Escalation words: "speak to manager", "complaint"
- Product interest: "pricing", "demo", "buy now"
- Support needs: "not working", "error", "help"

![Step 5: Escalation](#screenshot-step5)

---

## Step 6: Lead Capture

Collect visitor contact information.

### Enable Lead Capture

Toggle **"Capture Leads"** to ON.

### Capture Timing

Choose when to show the contact form:

- **Before First Message** - Collect info upfront
- **After Chatbot Can't Help** - Only when necessary
- **After 3 Messages** - Let conversation flow first

### Required Fields

Select which fields to collect:

- Name (always recommended)
- Email (always recommended)
- Phone (optional)
- Company (optional for B2B)

### External Forms

Instead of the built-in form, you can use your own:

1. Toggle **"Use External Form"** to ON
2. Enter the form URL (e.g., Google Forms, Typeform)
3. Visitors see an "Open Contact Form" button
4. Form opens in a new tab

**Supported:**
- Google Forms
- Typeform
- JotForm
- Any public form URL

![Step 6: Lead Capture](#screenshot-step6)

---

## Step 7: CRM Integration

Automatically send captured leads to your CRM.

### Supported CRMs

BuildMyChatbot.Ai works with any CRM that accepts webhooks:

- Salesforce
- HubSpot
- Pipedrive
- Zoho CRM
- Any system with a REST API

### Setup Instructions

1. Toggle **"Enable CRM Integration"** to ON
2. Enter your **Webhook URL** (from your CRM)
3. Choose **Authentication Type**:
   - None
   - Bearer Token
   - API Key
   - Basic Auth
4. Map fields from the chatbot to CRM fields
5. Click **"Test Connection"** to verify

### Field Mapping

Map chatbot fields to your CRM:

| Chatbot Field | CRM Field Name |
|--------------|----------------|
| Name         | contact_name   |
| Email        | email_address  |
| Phone        | phone_number   |
| Company      | company_name   |

### Testing

Before saving:

1. Click **"Test Connection"**
2. A test lead is sent to your CRM
3. Verify it appears correctly
4. Adjust mapping if needed

### Sync Tracking

View CRM sync status in the Leads dashboard:

- ✓ Success - Lead sent successfully
- ⚠️ Failed - Click to see error details
- ↻ Retry - Automatic retry with exponential backoff

![Step 7: CRM Integration](#screenshot-step7)

---

## After Creation

Once you complete all steps:

1. **Indexing Starts** - Content is processed (1-5 minutes)
2. **Progress Bar** - Shows real-time indexing status
3. **Chatbot Ready** - You'll see the embed code
4. **Add to Website** - Copy/paste the script tag

### Next Steps

- **[Embed Your Chatbot](/help/embedding)** - Add to your website
- **[Invite Team Members](/help/team-management)** - Add agents for live chat
- **[View Analytics](/help/analytics-dashboard)** - Track performance
- **[Test Your Chatbot](/help/testing)** - Try it out before going live

---

## Editing Your Chatbot

To modify an existing chatbot:

1. Go to the Chatbots dashboard
2. Click the **Edit** button on any chatbot
3. You'll enter edit mode with all 7 steps
4. Click any step to jump directly to it
5. Changes save automatically

**Note:** If you change knowledge sources, you'll be prompted to re-index.
