# Lead Capture Forms

Collect visitor contact information automatically through your chatbot. This guide explains how to configure and manage lead capture.

## What is Lead Capture?

Lead capture allows your chatbot to collect visitor information such as:
- Name
- Email address
- Phone number
- Company name

This information is stored in your Leads dashboard and can be:
- Exported to CSV
- Synced to your CRM automatically
- Reviewed with conversation context

---

## Enabling Lead Capture

Configure lead capture in the chatbot wizard:

### Step 1: Access Lead Capture Settings

1. Edit your chatbot (or create a new one)
2. Navigate to **Step 6: Lead Capture**
3. Toggle **"Capture Leads"** to ON

![Enable Lead Capture](#screenshot-enable-lead-capture)

### Step 2: Choose Capture Timing

Select when to show the contact form:

**Before First Message**
- Form appears immediately when chat opens
- Visitor must provide info before chatting
- Best for: Qualified lead generation, sales inquiries

**After Chatbot Can't Help**
- Form shows when AI can't answer
- Less intrusive than upfront collection
- Best for: Support escalation, backup option

**After 3 Messages**
- Let conversation flow naturally first
- Shows form after engagement is established
- Best for: Balance between UX and lead capture

![Capture Timing Options](#screenshot-timing)

### Step 3: Select Required Fields

Choose which fields to collect:

- ✅ **Name** - Always recommended
- ✅ **Email** - Always recommended
- ☐ **Phone** - Optional, good for sales/support callbacks
- ☐ **Company** - Optional, useful for B2B businesses

![Required Fields](#screenshot-fields)

> **Tip:** Fewer fields = higher completion rate. Only collect what you truly need.

---

## Using External Forms

Instead of the built-in form, direct visitors to your own external form:

### Supported Platforms

- Google Forms
- Typeform
- JotForm
- Microsoft Forms
- Any publicly accessible form URL

### Configuration

1. Go to **Step 6: Lead Capture**
2. Toggle **"Use External Form"** to ON
3. Enter your form URL
4. Click **"Next"**

**Example URLs:**
```
https://docs.google.com/forms/d/e/FORM_ID/viewform
https://yourcompany.typeform.com/to/FORM_ID
https://form.jotform.com/FORM_NUMBER
```

### Visitor Experience

When using external forms:
1. Visitor chats with chatbot
2. At the configured trigger point, they see "Open Contact Form" button
3. Button opens form in new tab
4. Visitor fills out your form
5. Returns to chat conversation

![External Form Button](#screenshot-external-form)

> **Note:** External form submissions don't appear in your Leads dashboard—they go directly to your form platform.

---

## Viewing Captured Leads

Access all captured leads in one place:

### Navigate to Leads Dashboard

1. Click **"Leads"** in the main navigation
2. See all captured leads in a table

### Lead Information Display

Each lead shows:
- **Name** - Visitor's name
- **Email** - Contact email
- **Phone** - Phone number (if collected)
- **Company** - Company name (if collected)
- **Chatbot** - Which chatbot captured the lead
- **Date** - When lead was captured
- **Conversation** - Link to full chat transcript
- **CRM Status** - Sync status (if CRM integration enabled)

![Leads Dashboard](#screenshot-leads-dashboard)

### Filtering & Searching

Find specific leads:
- **Search** - By name, email, or company
- **Filter by Chatbot** - See leads from specific bots
- **Date Range** - Leads from a specific time period
- **CRM Status** - Synced, failed, or pending

---

## Exporting Leads

Download your leads as a CSV file:

### Export Process

1. Go to the **Leads** dashboard
2. (Optional) Apply filters to export specific leads
3. Click **"Export to CSV"**
4. File downloads automatically

### CSV Contents

The exported file includes:
- Name
- Email
- Phone
- Company
- Chatbot Name
- Capture Date
- Conversation Link

![Export CSV](#screenshot-export)

### Use Cases for Export

- Import to email marketing tools (Mailchimp, Constant Contact)
- Add to spreadsheets for manual follow-up
- Share with sales team
- Backup lead data

---

## Lead Conversation Context

View the full conversation that led to the capture:

### Viewing Conversations

1. In the Leads dashboard, click a lead
2. See the conversation transcript
3. Review what the visitor asked
4. Understand their needs and intent

### Why Context Matters

Conversation context helps you:
- **Personalize follow-up** - Reference their specific questions
- **Qualify leads** - See what they're interested in
- **Improve responses** - Understand common customer pain points
- **Train sales team** - Show real examples of customer needs

![Lead Conversation](#screenshot-lead-conversation)

---

## CRM Integration

Automatically send captured leads to your CRM:

### Supported CRMs

- Salesforce
- HubSpot
- Pipedrive
- Zoho CRM
- Any CRM with webhook/API support

### Quick Setup

1. Configure CRM integration in **Step 7** of chatbot wizard
2. Enter webhook URL from your CRM
3. Map fields (Name → contact_name, Email → email_address, etc.)
4. Test connection
5. Leads automatically sync when captured

### Sync Status

In the Leads dashboard, each lead shows sync status:

- ✓ **Synced** - Successfully sent to CRM
- ⚠️ **Failed** - Click to see error details
- ↻ **Retrying** - Automatic retry in progress
- ⏳ **Pending** - Queued for sync

![CRM Sync Status](#screenshot-crm-status)

> **Detailed Setup:** See the [CRM Integration](/help/crm-integration) guide for complete instructions.

---

## Lead Notifications

Get notified when new leads are captured:

### Email Notifications

Automatic emails sent when:
- New lead is captured
- Email contains lead details and conversation link

**To enable:**
1. Notifications are ON by default
2. Emails sent to account owner email
3. Check spam folder if not receiving

### Frequency

- **Immediately** - Email sent as soon as lead is captured
- **No batching** - One email per lead

![Lead Notification Email](#screenshot-email)

---

## Best Practices

### Timing Recommendations

**Before First Message:**
- ✓ High-intent visitors (coming from ads, campaigns)
- ✓ Sales-focused chatbots
- ✗ Support/FAQ chatbots (too aggressive)

**After Chatbot Can't Help:**
- ✓ Support chatbots
- ✓ Mixed use cases
- ✓ Good balance of UX and capture rate

**After 3 Messages:**
- ✓ Educational/discovery chatbots
- ✓ When building trust first matters
- ✓ Long sales cycles

### Field Selection

**Always Include:**
- Name - Personalization and identification
- Email - Primary contact method

**Consider Adding:**
- Phone - If you call leads back
- Company - For B2B, lead qualification

**Avoid:**
- Too many fields - Reduces completion rate
- Unnecessary info - Only collect what you'll use

### Optimization Tips

**Test Different Timings:**
- Try different capture points
- Measure completion rates
- Adjust based on your audience

**Keep Forms Short:**
- Each additional field reduces completion
- 2-3 fields = good completion rate
- 5+ fields = significant drop-off

**Mobile-Friendly:**
- Forms work on all devices
- Touch-friendly inputs
- Large tap targets

**Clear Value Proposition:**
- Explain why you're collecting info
- "Get personalized recommendations"
- "Receive exclusive updates"

---

## Privacy & Compliance

### Data Handling

Lead data is:
- Stored securely in encrypted database
- Only accessible to account owner and authorized team members
- Retained according to your account settings
- Exportable at any time

### GDPR Compliance

For EU visitors:
- Include privacy notice in your chat widget
- Add link to your privacy policy
- Allow visitors to request data deletion
- Maintain consent records

### Best Practices

- Only collect necessary information
- Have a clear privacy policy
- Honor deletion requests promptly
- Secure lead data appropriately
- Don't share data without consent

---

## Troubleshooting

### Leads Not Being Captured

**Possible Causes:**
- Lead capture not enabled
- Visitor closed chat before form submission
- Network error during submission

**Solutions:**
1. Verify lead capture is enabled (Step 6)
2. Check required fields aren't too many
3. Test the form yourself
4. Check browser console for errors

### CRM Sync Failures

**Common Issues:**
- Incorrect webhook URL
- Authentication token expired
- Field mapping mismatch
- CRM rate limits

**Solutions:**
1. Test connection in CRM settings
2. Verify API credentials
3. Check field mapping
4. See detailed error in lead row

### External Form Not Opening

**Possible Causes:**
- Invalid URL
- URL blocked by popup blocker
- Form requires authentication

**Solutions:**
1. Verify URL is publicly accessible
2. Allow popups for your domain
3. Test URL in incognito window
4. Use a different form platform

---

## Next Steps

Now that lead capture is set up:

- **[CRM Integration](/help/crm-integration)** - Automatically sync leads
- **[Keyword Alerts](/help/keyword-alerts)** - Get notified of specific mentions
- **[Analytics Dashboard](/help/analytics-dashboard)** - Track conversion rates
- **[Team Management](/help/team-management)** - Have team follow up on leads
