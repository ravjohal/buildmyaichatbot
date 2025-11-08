# Keyword Alerts

Get notified when visitors mention specific words or phrases in chat. Perfect for catching urgent requests, product interest, and escalation triggers.

## What Are Keyword Alerts?

Keyword alerts monitor chat conversations and send notifications when visitors mention specific keywords:

**Example Keywords:**
- Urgency: "urgent", "ASAP", "emergency"
- Escalation: "speak to manager", "cancel subscription", "refund"
- Product Interest: "pricing", "demo", "buy now", "purchase"
- Support Issues: "not working", "error", "broken"

**Notification Channels:**
- **Email** - Sent to your account email immediately
- **In-App** - Appears in the notification bell with badge

---

## Setting Up Keyword Alerts

Configure alerts in the chatbot wizard:

### Step 1: Enable Keyword Alerts

1. Edit your chatbot (or create new)
2. Go to **Step 5: Escalation**
3. Scroll to **Keyword Alerts** section
4. Toggle **"Enable Keyword Alerts"** to ON

![Enable Keyword Alerts](#screenshot-enable-alerts)

### Step 2: Add Keywords

Add words or phrases to monitor:

1. Type a keyword in the input field
2. Press **Enter** or click **"Add"**
3. Keyword appears as a tag/pill
4. Repeat to add more keywords

**Tips:**
- Keywords are case-insensitive ("urgent" matches "URGENT")
- Add variations ("cancel" and "cancellation")
- Use phrases ("speak to manager", "talk to human")

![Add Keywords](#screenshot-add-keywords)

### Step 3: Choose Notification Channels

Select how you want to be notified:

- ✅ **Email Notifications** - Immediate emails to your inbox
- ✅ **In-App Notifications** - Bell icon with badge in header

You can enable both for maximum visibility.

![Notification Channels](#screenshot-channels)

### Step 4: Save

Click **"Next"** or **"Save"** to apply your settings.

---

## Managing Keywords

### Adding Keywords

1. Go to **Step 5: Escalation**
2. In Keyword Alerts section, type new keyword
3. Press **Enter**

### Removing Keywords

1. Find the keyword tag/pill
2. Click the **X** button on the keyword
3. Keyword is removed immediately

![Manage Keywords](#screenshot-manage-keywords)

### Best Practices

**Quantity:**
- Start with 5-10 important keywords
- Don't add too many (creates noise)
- Focus on high-priority triggers

**Selection:**
- Think about urgent situations
- Consider product/sales terms
- Include common problem phrases

**Avoid:**
- Common words ("the", "is", "can")
- Words in your bot's responses
- Overly broad terms

---

## Email Notifications

### What You Receive

When a keyword is triggered, you get an email with:

**Subject:**
"Keyword Alert: [Keyword] mentioned in chat"

**Contents:**
- Which keyword was triggered
- Visitor name (if available)
- Full message containing the keyword
- Chatbot name
- Timestamp
- Link to view conversation

### Email Frequency

- **Immediate** - Sent as soon as keyword is detected
- **One per trigger** - Each keyword mention sends an email
- **No batching** - Real-time delivery

![Email Notification Example](#screenshot-email-notification)

> **Tip:** Create an email filter/rule to organize keyword alert emails into a dedicated folder.

---

## In-App Notifications

### Notification Bell

The bell icon in the header shows:

- **Badge** - Red number indicating unread alerts
- **Popover** - Click to see all notifications
- **List** - Shows recent keyword alerts

![Notification Bell](#screenshot-bell-icon)

### Notification Details

Each notification shows:

- **Keyword triggered**
- **Visitor message** (preview)
- **Chatbot name**
- **Time** (e.g., "5 minutes ago")
- **Read/Unread status**

### Marking as Read

To mark notifications as read:

1. Click the notification bell
2. Click a specific notification to mark it read
3. Or click **"Mark All as Read"**

Unread notifications show with a blue dot.

![Notification Panel](#screenshot-notification-panel)

### Notification Polling

The system checks for new notifications:
- **Every 30 seconds** when dashboard is open
- **Automatic updates** - No page refresh needed
- **Badge updates** - Real-time unread count

---

## Alert History

View all past keyword triggers:

### Accessing Alert History

1. Go to **Analytics** dashboard
2. Click **"Keyword Alerts"** tab
3. See all triggered alerts

### History Display

Each alert shows:

- **Keyword** - Which keyword was triggered
- **Visitor** - Name or "Anonymous"
- **Message** - Full message text
- **Chatbot** - Which chatbot detected it
- **Date/Time** - When it was triggered
- **Conversation Link** - View full chat transcript

![Alert History](#screenshot-alert-history)

### Filtering History

Filter alerts by:
- **Date range** - Last 7 days, 30 days, custom
- **Keyword** - Specific keyword
- **Chatbot** - Alerts from one chatbot

---

## Use Cases

### Sales & Product Interest

Monitor buying signals:

**Keywords:**
- "pricing", "cost", "how much"
- "demo", "trial"
- "buy", "purchase", "order"
- "upgrade", "premium"

**Benefit:** Catch hot leads in real-time

### Urgent Support Issues

Identify critical problems:

**Keywords:**
- "urgent", "ASAP", "emergency"
- "down", "not working", "broken"
- "error", "crash", "bug"
- "lost access", "can't login"

**Benefit:** Prioritize urgent customer issues

### Escalation Triggers

Detect when customers want human help:

**Keywords:**
- "speak to manager"
- "talk to human"
- "real person"
- "representative", "agent"

**Benefit:** Route to live agent quickly

### Retention & Churn

Monitor at-risk customers:

**Keywords:**
- "cancel", "cancellation"
- "refund", "money back"
- "disappointed", "unhappy"
- "switch to [competitor]"

**Benefit:** Intervene before customer churns

### Feature Requests

Track product feedback:

**Keywords:**
- "feature request"
- "would be great if"
- "you should add"
- "why can't I"

**Benefit:** Gather customer feedback

---

## Best Practices

### Keyword Selection

✅ **DO:**
- Use specific, meaningful terms
- Include common misspellings if relevant
- Test keywords in real conversations
- Update based on actual triggers

❌ **DON'T:**
- Add generic, common words
- Overlap with chatbot's own responses
- Use more than 20 keywords
- Forget to review and refine

### Notification Management

✅ **DO:**
- Check in-app notifications regularly
- Set up email filters for organization
- Mark notifications as read after reviewing
- Review alert history weekly

❌ **DON'T:**
- Let unread notifications pile up
- Ignore important alerts
- Disable notifications entirely
- Over-rely on keywords for customer support

### Follow-Up Actions

When an alert triggers:

1. **Review** - Read the full conversation
2. **Assess** - Determine urgency and priority
3. **Act** - Reach out, escalate, or note for follow-up
4. **Track** - Record outcome in your CRM

---

## Troubleshooting

### Not Receiving Email Notifications

**Possible Causes:**
- Email notifications disabled
- Emails going to spam
- Incorrect email address

**Solutions:**
1. Check **Step 5: Escalation** - Email toggle ON
2. Check spam/junk folder
3. Add sender to safe senders list
4. Verify account email in settings

### In-App Notifications Not Showing

**Possible Causes:**
- Page not refreshing poll
- Browser blocking updates
- Notifications disabled

**Solutions:**
1. Refresh the page
2. Check notification toggle in settings
3. Try different browser
4. Clear cache and reload

### Keywords Not Triggering

**Possible Causes:**
- Keyword misspelled
- Case-sensitivity issue (shouldn't happen)
- Keyword not in visitor message

**Solutions:**
1. Verify keyword spelling
2. Test by sending a message with the keyword
3. Check alert history to confirm detection
4. Ensure keyword alerts are enabled

### Too Many False Positives

**Problem:** Getting alerts for irrelevant mentions

**Solutions:**
1. Use more specific keywords
2. Remove overly broad terms
3. Add phrase-based keywords instead of single words
4. Review and refine keyword list weekly

---

## Performance & Limits

### Detection Speed

- **Real-time** - Detected immediately in chat endpoint
- **Non-blocking** - Doesn't slow down chat response
- **Async** - Runs in background

### Limits by Plan

| Plan | Max Keywords per Chatbot |
|------|--------------------------|
| Free | 5 keywords |
| Starter | 10 keywords |
| Pro | 25 keywords |
| Scale | Unlimited |

---

## Next Steps

- **[Live Agent Handoff](/help/live-chat)** - Escalate conversations manually
- **[Lead Capture](/help/lead-capture)** - Collect visitor information
- **[Analytics Dashboard](/help/analytics-dashboard)** - Review triggered alerts
- **[CRM Integration](/help/crm-integration)** - Send alerts to your CRM
