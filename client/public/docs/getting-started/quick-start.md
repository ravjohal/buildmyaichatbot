# Quick Start Guide

Create your first AI chatbot in just 5 minutes! This guide walks you through the essential steps to get your chatbot live on your website.

## Step 1: Create a New Chatbot

1. From your dashboard, click the **"Create Chatbot"** button
2. You'll enter the 7-step creation wizard

![Create Chatbot Button](#screenshot-dashboard-create)

## Step 2: Name Your Chatbot

1. Enter a descriptive name for your chatbot (e.g., "Customer Support Bot")
2. Click **"Next"** to continue

![Name Your Chatbot](#screenshot-wizard-step1)

> **Tip:** Choose a name that reflects the chatbot's purpose—you can always change it later.

## Step 3: Add Knowledge Sources

Your chatbot needs content to learn from. You have two options:

### Option A: Import from Website

1. Enter your website URL (e.g., `https://yourcompany.com`)
2. Click **"Add URL"**
3. The system will automatically crawl and index your website content

### Option B: Upload Documents

1. Click **"Upload Documents"**
2. Select PDF files, Word documents, or text files
3. Files will be processed and indexed automatically

![Knowledge Base Configuration](#screenshot-wizard-step2)

> **Note:** The chatbot will use this content to answer visitor questions. You can add more sources anytime.

## Step 4: Set Personality & Customization

1. Choose a personality style (Professional, Friendly, or Custom)
2. Upload your company logo
3. Set your brand colors
4. Click **"Next"** to continue

![Customization Options](#screenshot-wizard-step4)

## Step 5: Configure Support Options (Optional)

This step is optional but recommended:

### Lead Capture
- Enable "Capture Leads" to collect visitor contact information
- Choose when to show the contact form

### Live Agent Handoff
- Enable "Live Agent Handoff" to allow human takeover
- Set business hours for agent availability

![Support Configuration](#screenshot-wizard-step5)

## Step 6: Complete Setup

1. Review your chatbot settings
2. Click **"Create Chatbot"**
3. Wait for indexing to complete (usually 1-2 minutes)

![Indexing Progress](#screenshot-indexing)

## Step 7: Embed on Your Website

Once indexing is complete:

1. Copy the embed code provided
2. Paste it before the closing `</body>` tag on your website
3. Your chatbot is now live!

```html
<!-- Paste this before </body> -->
<script>
  (function() {
    var script = document.createElement('script');
    script.src = 'https://buildmychatbot.ai/widget.js';
    script.setAttribute('data-chatbot-id', 'YOUR_CHATBOT_ID');
    document.body.appendChild(script);
  })();
</script>
```

![Embed Code](#screenshot-embed-code)

## What's Next?

Congratulations! Your chatbot is live. Here's what you can do next:

- **[Invite Team Members](/help/team-management)** - Add agents to handle live chats
- **[View Analytics](/help/analytics-dashboard)** - Track conversations and performance
- **[Train Your Chatbot](/help/manual-training)** - Improve answers by correcting responses
- **[Set Up CRM Integration](/help/crm-integration)** - Automatically sync leads

## Need Help?

If you run into any issues:
- Check our detailed [Chatbot Creation Wizard](/help/chatbot-wizard) guide
- Review [Knowledge Base Management](/help/knowledge-base) for tips on content
- Contact support from your dashboard
