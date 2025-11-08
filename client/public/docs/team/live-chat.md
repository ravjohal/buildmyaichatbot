# Live Agent Handoff

When your chatbot can't help or a visitor requests human support, live agent handoff lets your team take over in real-time. This guide explains how live chat works.

## How Live Agent Handoff Works

### The Visitor Experience

1. Visitor chats with your AI chatbot
2. Chatbot detects it can't help OR visitor clicks "Request Live Agent"
3. Request is sent to your team
4. Team member accepts and responds
5. Real-time chat conversation begins via WebSocket
6. Visitor receives instant, human support

### The Agent Experience

1. New handoff request appears in **Live Chats** dashboard
2. Agent clicks **"Accept"** to take the conversation
3. WebSocket connection established
4. Agent and visitor chat in real-time
5. Agent marks conversation complete when done

---

## Prerequisites

Before using live agent handoff:

✅ **Enable Live Agent Handoff**
- Go to chatbot edit mode
- Step 5: Escalation
- Toggle "Enable Live Agent Handoff" to ON

✅ **Configure Business Hours** (Optional)
- Set days and times when agents are available
- Handoff button only shows during these hours
- Outside hours: Visitors see offline message

✅ **Have Team Members** (Optional)
- Invite team members to help with live chats
- Grant "Respond to Live Chats" permission
- Owner can always handle chats

![Enable Live Agent Handoff](#screenshot-enable-handoff)

---

## Accessing Live Chats Dashboard

### Navigate to Live Chats

1. Click **"Live Chats"** in the main navigation
2. You'll see two tabs:
   - **Pending Requests** - New handoff requests waiting
   - **Active Chats** - Ongoing conversations

![Live Chats Dashboard](#screenshot-live-chats)

### Dashboard Overview

**Pending Requests Tab:**
- Shows all unaccepted handoff requests
- Displays visitor info and chatbot name
- Time since request was created
- Accept button for each request

**Active Chats Tab:**
- Shows conversations you're currently handling
- Real-time message updates
- Complete chat button
- Message input field

---

## Accepting Handoff Requests

### Viewing Pending Requests

The **Pending Requests** tab shows:

For each request:
- **Visitor Name** - If provided, otherwise "Anonymous"
- **Chatbot** - Which chatbot the visitor is using
- **Time** - How long they've been waiting
- **Preview** - Last message from visitor
- **Accept Button** - Click to take the conversation

### Accepting a Request

To accept a handoff:

1. Click **"Accept"** on any pending request
2. Request moves to **Active Chats** tab
3. WebSocket connection established
4. You can now send/receive messages in real-time

![Pending Requests](#screenshot-pending-requests)

> **Note:** Once accepted, only you can see and respond to that chat. Other team members see it's been claimed.

---

## Chatting with Visitors

### Sending Messages

In the **Active Chats** tab:

1. Select a conversation from the list
2. Type your message in the input field
3. Press **Enter** or click **Send**
4. Message appears instantly for the visitor

### Message Features

**Real-Time Delivery:**
- Messages sent and received instantly via WebSocket
- No page refresh needed
- Typing indicators show when either party is typing

**Message History:**
- See the full conversation history
- Includes AI chatbot messages before handoff
- Scrollable message list

**Visitor Information:**
- Name (if provided)
- Email (if captured)
- Chatbot they're using
- Conversation start time

![Active Chat](#screenshot-active-chat)

### Best Practices

**Response Time:**
- Respond within 30 seconds for best experience
- Let visitor know if you need time to research
- Don't leave visitors waiting without acknowledgment

**Communication Style:**
- Be friendly and professional
- Use visitor's name if available
- Acknowledge their issue clearly
- Provide specific, helpful answers

**Conversation Flow:**
- Greet the visitor
- Confirm their question/issue
- Provide solution or next steps
- Ask if they need additional help
- Thank them before closing

**Example Response Pattern:**
```
Agent: Hi [Name]! I see you have a question about [topic]. Let me help you with that.

Agent: [Provide answer or solution]

Agent: Does this help resolve your question? Is there anything else I can assist you with?

Agent: Great! Thanks for chatting with us. Have a wonderful day!
```

---

## Completing Conversations

When a conversation is resolved:

1. Click the **"Mark as Complete"** button
2. Chat moves from Active to Closed
3. Visitor sees "Conversation ended" message
4. Chat history is preserved for analytics

![Complete Conversation](#screenshot-complete-chat)

> **Tip:** Always confirm the visitor's question is answered before marking complete.

---

## Business Hours Configuration

Control when live agent handoff is available:

### Setting Business Hours

1. Edit your chatbot
2. Go to **Step 5: Escalation**
3. Toggle **"Configure Business Hours"** to ON
4. Set the following:

**Days of Week:**
- Check boxes for days your team is available
- Uncheck closed days

**Hours:**
- **Start Time** - When agents begin (e.g., 9:00 AM)
- **End Time** - When agents finish (e.g., 5:00 PM)

**Timezone:**
- Select your team's timezone
- Ensures accurate availability checking

![Business Hours Configuration](#screenshot-business-hours)

### How Business Hours Work

**During Business Hours:**
- Visitor sees "Request Live Agent" button
- Handoff requests can be created
- Team can accept and respond

**Outside Business Hours:**
- No "Request Live Agent" button shown
- Instead displays: "Our team is currently offline"
- Visitor can still use AI chatbot
- Optional: Show contact form or offline message

### Timezone-Aware Checking

The system:
- Uses the chatbot's configured timezone
- Converts visitor's local time to chatbot timezone
- Checks if current time falls within business hours
- Accounts for daylight saving time

> **Example:** If your business hours are 9 AM - 5 PM EST, a visitor at 3 PM EST sees the handoff button, but a visitor at 7 PM EST does not.

---

## Notifications

Get notified when handoff requests arrive:

### Email Notifications

Automatic emails when:
- New handoff request created
- Request has been waiting 5+ minutes
- Visitor sends message in active chat

**Email Contains:**
- Visitor name and info
- Chatbot name
- Message preview
- Link to Live Chats dashboard

### In-App Notifications

Coming soon:
- Browser notifications for new requests
- Sound alerts for new messages
- Desktop notifications (optional)

---

## Team Collaboration

Multiple team members can handle live chats:

### How It Works

- **Pending Requests** - Visible to all team members with permission
- **First Come, First Served** - First to click "Accept" gets the chat
- **Active Chats** - Only visible to assigned agent
- **Load Balancing** - Requests distributed among available agents

### Best Practices

**Availability:**
- Log in during business hours
- Check Live Chats dashboard regularly
- Accept requests promptly

**Coordination:**
- Use team chat/Slack to coordinate
- Let team know when stepping away
- Communicate about difficult cases

**Coverage:**
- Ensure someone monitors dashboard during hours
- Plan breaks and shifts
- Have backup agents available

---

## Monitoring & Analytics

Track live chat performance:

### Available Metrics

In the **Analytics** dashboard:
- Number of handoff requests
- Average response time
- Number of conversations per agent
- Visitor satisfaction ratings
- Conversation transcripts

### Conversation History

View past conversations:
1. Go to **Analytics**
2. Click on a conversation
3. See full transcript including:
   - AI chatbot messages
   - Live agent messages
   - Timestamps
   - Visitor satisfaction rating

---

## Troubleshooting

### Not Receiving Handoff Requests

**Possible Causes:**
- Live Agent Handoff not enabled
- Outside business hours
- Missing "Respond to Live Chats" permission

**Solutions:**
1. Check chatbot settings (Step 5: Escalation)
2. Verify current time is within business hours
3. Confirm you have the permission (check with owner)

### Messages Not Sending/Receiving

**Possible Causes:**
- WebSocket connection lost
- Network connectivity issue
- Browser incompatibility

**Solutions:**
1. Refresh the page
2. Check internet connection
3. Try a different browser (Chrome, Firefox, Safari recommended)
4. Check browser console for errors

### Can't Accept Handoff Request

**Possible Causes:**
- Another agent already accepted it
- Page needs refresh
- Session expired

**Solutions:**
1. Refresh the page
2. Check if request moved to Active Chats
3. Log out and log back in
4. Clear browser cache

---

## Best Practices Summary

✅ **DO:**
- Monitor Live Chats dashboard during business hours
- Respond to visitors within 30 seconds
- Confirm issues are resolved before completing
- Use professional, friendly communication
- Keep business hours accurate
- Coordinate with team members

❌ **DON'T:**
- Accept more chats than you can handle
- Leave visitors waiting without explanation
- Close chats before confirming resolution
- Set business hours when team isn't available
- Ignore pending requests
- Forget to mark conversations complete

---

## Next Steps

- **[Team Management](/help/team-management)** - Invite agents to help
- **[Team Permissions](/help/permissions)** - Control who can respond
- **[Analytics Dashboard](/help/analytics-dashboard)** - Track performance
- **[Keyword Alerts](/help/keyword-alerts)** - Get notified of specific mentions
