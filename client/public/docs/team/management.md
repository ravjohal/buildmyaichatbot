# Managing Your Team

BuildMyChatbot.Ai's team management system lets you invite colleagues to help handle live chats, manage chatbots, and more. This guide explains how to build and manage your team.

## Team Member Limits by Plan

Your subscription tier determines how many team members you can have:

| Plan | Team Member Limit |
|------|-------------------|
| Free | 0 (owner only) |
| Starter | 3 team members |
| Business/Pro | 10 team members |
| Scale | Unlimited |

> **Note:** The limit includes both active team members and pending invitations.

---

## Inviting Team Members

Add new team members to your account:

### Step 1: Navigate to Team Management

1. Click **"Team"** in the main navigation
2. You'll see your current team members
3. Click **"Invite Team Member"**

![Team Management Page](#screenshot-team-page)

### Step 2: Enter Team Member Details

In the invitation form:

1. **Email Address** - The person's work email
2. **First Name** - Their first name
3. **Last Name** - Their last name
4. Click **"Send Invitation"**

![Invite Team Member Form](#screenshot-invite-form)

### Step 3: Invitation Sent

The team member receives an email with:
- Invitation details
- Account creation/login instructions
- Unique invitation link
- Expiration date (7 days)

> **Tip:** Invitations expire after 7 days. If expired, send a new invitation.

---

## Accepting Invitations

When someone receives an invitation:

### For Existing Users

If they already have a BuildMyChatbot.Ai account:

1. Click the link in the email
2. Log in with existing credentials
3. Click **"Accept Invitation"**
4. They're added to your team instantly

### For New Users

If they don't have an account:

1. Click the link in the email
2. See the invitation details
3. Enter their information:
   - First Name
   - Last Name
   - Password (for their new account)
4. Click **"Accept & Create Account"**
5. Account is created and they join your team

![Accept Invitation Page](#screenshot-accept-invitation)

> **Default Access:** New team members can respond to live chats by default. You control additional permissions.

---

## Managing Team Member Permissions

Control what each team member can access:

### Permission Types

There are 6 permission types you can grant:

1. **View Analytics** 
   - Access chatbot analytics and performance data
   - See conversation transcripts
   - View satisfaction ratings

2. **Manage Chatbots** 
   - Create new chatbots
   - Edit existing chatbots
   - Delete chatbots
   - Refresh knowledge bases

3. **Respond to Live Chats** 
   - View live chat queue
   - Accept and respond to visitor chat requests
   - See chat history
   - *(Granted by default to all team members)*

4. **View Leads** 
   - Access captured lead information
   - Export leads to CSV
   - View lead details and conversation history

5. **Manage Team** 
   - Invite new team members
   - Remove team members
   - Modify team member permissions
   - View team list

6. **Access Settings** 
   - Modify account profile
   - View subscription status
   - Access billing portal
   - Change account settings

### Setting Permissions

To configure a team member's permissions:

1. Go to the **Team** page
2. Find the team member in the list
3. Click the **"Permissions"** button
4. A dialog opens showing all 6 permission types
5. Toggle each permission ON or OFF
6. Click **"Save Changes"**

![Permissions Dialog](#screenshot-permissions-dialog)

### Permission Best Practices

**Live Chat Agents (Default):**
- ✓ Respond to Live Chats
- ❌ Other permissions disabled

**Customer Support Leads:**
- ✓ Respond to Live Chats
- ✓ View Analytics
- ✓ View Leads
- ✓ Manage Team (to invite/remove agents)

**Marketing Team:**
- ✓ View Analytics
- ✓ View Leads
- ✓ Manage Chatbots (to update content)

**Account Administrators:**
- ✓ All permissions enabled
- Can function as a co-owner

> **Note:** Account owners always have full access—permissions don't apply to owners.

---

## Viewing Your Team

The Team page shows all members:

### Team Member List

Each team member card displays:
- **Name** - First and last name
- **Email** - Contact email address
- **Role** - "Team Member" or "Owner"
- **Status** - Active or Pending
- **Actions** - Permissions and Remove buttons

### Pending Invitations

Pending invitations show:
- **Email** - Invited email address
- **Invited By** - Who sent the invitation
- **Expires** - Expiration date
- **Actions** - Resend or Cancel

![Team Member List](#screenshot-team-list)

---

## Removing Team Members

Remove team members who no longer need access:

### Remove Active Member

1. Find the team member in the list
2. Click the **Remove** (trash) icon
3. Confirm the removal

**What Happens:**
- Team member loses access immediately
- They can no longer log in to your account
- Their user account remains (they can join other teams)
- Chat conversations they handled are preserved

### Cancel Pending Invitation

1. Find the pending invitation
2. Click **"Cancel Invitation"**
3. Invitation link becomes invalid

![Remove Team Member](#screenshot-remove-member)

> **Important:** Removing a team member cannot be undone. Send a new invitation if needed.

---

## Team Capacity

Monitor your team member usage:

### Capacity Display

At the top of the Team page, you'll see:
- **Current usage** (e.g., "2 of 3 team members")
- **Tier limit** for your subscription
- **Upgrade prompt** when at or near limit

### Reaching Your Limit

When you hit your team member limit:
- **Invite button** becomes disabled
- **Upgrade prompt** appears
- You must upgrade or remove members to add more

**Options:**
1. **Upgrade your plan** - Get a higher team limit
2. **Remove inactive members** - Free up slots
3. **Cancel pending invitations** - Invitations count toward limit

![Team Capacity Card](#screenshot-capacity)

---

## Multi-Tenant Security

Team members can only access resources owned by their account owner:

### What Team Members Can Access

Team members see and work with:
- ✓ Your chatbots (owner's chatbots)
- ✓ Your leads
- ✓ Your analytics
- ✓ Live chats from your chatbots

### What Team Members CANNOT Access

Team members have NO access to:
- ❌ Other teams' data
- ❌ Other accounts' chatbots
- ❌ Resources outside their owner's account

### Security Features

- **Automatic scoping** - All queries filtered to owner's resources
- **Permission enforcement** - Middleware validates every request
- **Audit trails** - Original team member ID preserved in logs
- **Session isolation** - Separate sessions per team member

> **Your data is secure:** Team members can only see what their account owner owns.

---

## Troubleshooting

### Invitation Not Received

If a team member doesn't receive the invitation email:

1. **Check spam/junk folder** - Emails sometimes get filtered
2. **Verify email address** - Ensure no typos
3. **Resend invitation** - Click "Resend" on the pending invitation
4. **Contact support** - If issues persist

### Can't Invite More Members

If the invite button is disabled:

1. **Check your tier limit** - See capacity at top of page
2. **Cancel pending invitations** - They count toward limit
3. **Remove inactive members** - Free up slots
4. **Upgrade your plan** - Get more seats

### Team Member Can't Access Feature

If a team member reports access issues:

1. **Check their permissions** - Click "Permissions" button
2. **Verify permission is enabled** - Toggle to ON if needed
3. **Save changes** - Click "Save Changes"
4. **Ask them to refresh** - Reload the page

---

## Best Practices Summary

✅ **DO:**
- Give team members only the permissions they need
- Regularly review and update permissions
- Remove team members who no longer work with you
- Use clear, descriptive names when inviting
- Monitor your team capacity

❌ **DON'T:**
- Give all permissions to everyone
- Leave expired invitations pending
- Share account owner credentials
- Grant "Manage Team" permission casually
- Exceed your tier limit unnecessarily

---

## Next Steps

Now that your team is set up:

- **[Live Agent Handoff](/help/live-chat)** - How team members handle chats
- **[Team Permissions](/help/permissions)** - Understanding access control
- **[View Analytics](/help/analytics-dashboard)** - Track team performance
- **[Upgrade Your Plan](/help/subscription-plans)** - Increase team capacity
