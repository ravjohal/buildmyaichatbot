# CRM Integration

Automatically send captured leads to your CRM system. BuildMyChatbot.Ai works with any CRM that accepts webhooks or has an API.

## Supported CRMs

Our generic webhook system works with:

- **Salesforce** - Sales Cloud, Service Cloud
- **HubSpot** - Marketing Hub, Sales Hub
- **Pipedrive** - Full CRM platform
- **Zoho CRM** - All editions
- **ActiveCampaign** - CRM + Marketing automation
- **Freshsales** - Freshworks CRM
- **Any System** - With REST API support

---

## How It Works

When a visitor submits the contact form:

1. Lead captured in BuildMyChatbot.Ai
2. System sends HTTP POST request to your CRM webhook
3. CRM creates/updates the contact record
4. Sync status shown in Leads dashboard
5. Automatic retry if sync fails

![CRM Sync Flow](#screenshot-sync-flow)

---

## Setup Instructions

Configure CRM integration in the chatbot wizard:

### Step 1: Access CRM Settings

1. Edit your chatbot (or create new)
2. Navigate to **Step 7: CRM Integration**
3. Toggle **"Enable CRM Integration"** to ON

![Enable CRM Integration](#screenshot-enable-crm)

### Step 2: Enter Webhook URL

Get your webhook URL from your CRM, then:

1. Copy the webhook/API endpoint URL
2. Paste into **"Webhook URL"** field

**Example URLs:**

**Salesforce:**
```
https://webto.salesforce.com/servlet/servlet.WebToLead?encoding=UTF-8
```

**HubSpot:**
```
https://api.hubapi.com/contacts/v1/contact/
```

**Zapier (Universal):**
```
https://hooks.zapier.com/hooks/catch/123456/abcdef/
```

![Webhook URL Field](#screenshot-webhook-url)

### Step 3: Choose Authentication Type

Select how your CRM authenticates requests:

**None**
- No authentication required
- Public webhooks

**Bearer Token**
- Token-based auth (most common)
- Example: `Bearer sk_live_abc123...`

**API Key**
- Key sent in header
- Example: `X-API-Key: abc123...`

**Basic Auth**
- Username and password
- Base64 encoded automatically

![Authentication Options](#screenshot-auth-options)

### Step 4: Enter Authentication Credentials

Based on the auth type selected:

**For Bearer Token:**
- Paste your API token

**For API Key:**
- Header Name: `X-API-Key` (or your CRM's header)
- API Key Value: Your key

**For Basic Auth:**
- Username: Your CRM username
- Password: Your CRM password

### Step 5: Map Fields

Map chatbot fields to your CRM fields:

| Chatbot Field | CRM Field Name | Example |
|--------------|----------------|---------|
| Name | first_name | John |
| Email | email | john@example.com |
| Phone | phone | +1-555-0123 |
| Company | company | Acme Inc |

**Finding CRM Field Names:**
1. Check your CRM's API documentation
2. Common names: `email`, `first_name`, `last_name`, `company`, `phone`
3. Custom fields: Usually have prefixes like `custom_field_123`

![Field Mapping](#screenshot-field-mapping)

### Step 6: Test Connection

Before saving, test the integration:

1. Click **"Test Connection"**
2. System sends a test lead to your CRM
3. Check your CRM for the test record
4. Verify field mapping is correct

**Test Lead Data:**
- Name: "Test Contact"
- Email: "test@buildmychatbot.ai"
- Timestamp in company field

If successful:
- ✓ "Connection successful!" message
- Test record appears in CRM

If failed:
- ⚠️ Error message with details
- Fix the issue and test again

![Test Connection](#screenshot-test-connection)

### Step 7: Save

Click **"Next"** or **"Save"** to enable CRM sync.

---

## Platform-Specific Guides

### Salesforce Setup

1. Go to **Setup → Web-to-Lead**
2. Enable Web-to-Lead
3. Copy the generated form URL
4. Use **None** for auth type
5. Map fields:
   - `first_name` → Name
   - `email` → Email
   - `phone` → Phone
   - `company` → Company

### HubSpot Setup

1. Go to **Settings → Integrations → API Key**
2. Create or copy your API key
3. Use webhook: `https://api.hubapi.com/contacts/v1/contact/`
4. Auth type: **API Key**
5. Header: `Authorization`
6. Value: `Bearer YOUR_API_KEY`
7. Map fields:
   - `email` → Email
   - `firstname` → Name
   - `phone` → Phone
   - `company` → Company

### Pipedrive Setup

1. Go to **Settings → API**
2. Copy your API token
3. Use webhook: `https://api.pipedrive.com/v1/persons?api_token=YOUR_TOKEN`
4. Auth type: **None** (token in URL)
5. Map fields:
   - `name` → Name
   - `email` → Email
   - `phone` → Phone
   - `org_id` → Company (requires company ID)

### Zapier (Universal Solution)

Use Zapier to connect to any CRM:

1. Create a new Zap
2. Trigger: **Webhooks by Zapier** → **Catch Hook**
3. Copy the webhook URL
4. Paste into BuildMyChatbot.Ai CRM settings
5. Auth type: **None**
6. In Zapier, set up action to your CRM
7. Map fields from webhook to CRM

**Benefits:**
- Works with 5,000+ apps
- No API knowledge needed
- Visual field mapping

![Zapier Integration](#screenshot-zapier)

---

## Viewing Sync Status

Check if leads synced successfully:

### Leads Dashboard

In the **Leads** dashboard, each lead shows sync status:

- ✓ **Synced** - Successfully sent to CRM
- ⚠️ **Failed** - Sync error occurred
- ↻ **Retrying** - Auto-retry in progress
- ⏳ **Pending** - Queued for sync

![Sync Status Indicators](#screenshot-sync-status)

### Viewing Error Details

If a sync fails:

1. Click the **Failed** status indicator
2. See error message
3. Common errors:
   - Invalid API key
   - Field mapping mismatch
   - Rate limit exceeded
   - Network timeout

### Automatic Retry

Failed syncs automatically retry:

- **1st retry** - After 1 minute
- **2nd retry** - After 5 minutes
- **3rd retry** - After 15 minutes
- **4th retry** - After 30 minutes
- **Final attempt** - After 1 hour

If all retries fail, status remains **Failed** and you receive an email notification.

---

## Custom Headers

Some CRMs require additional headers:

### Adding Custom Headers

1. In CRM settings, expand **"Custom Headers"**
2. Click **"Add Header"**
3. Enter header name and value
4. Repeat for multiple headers

**Common Custom Headers:**

**Content-Type:**
```
Content-Type: application/json
```

**Custom Identifier:**
```
X-Source: BuildMyChatbot
```

**User Agent:**
```
User-Agent: BuildMyChatbot/1.0
```

![Custom Headers](#screenshot-custom-headers)

---

## Advanced Field Mapping

### Static Values

Send the same value for every lead:

**Use Case:** Lead source tracking

**Setup:**
1. Map a static field
2. Field Name: `lead_source`
3. Value: `Chatbot`

Now every lead has `lead_source = "Chatbot"` in your CRM.

### Conditional Mapping

Coming soon:
- Map different values based on chatbot
- Custom transformations
- Date formatting

---

## Troubleshooting

### Connection Test Fails

**Common Causes:**

**Invalid URL:**
- Verify URL is correct
- Check for typos
- Ensure URL is publicly accessible

**Authentication Error:**
- Verify API key/token
- Check token hasn't expired
- Ensure correct auth type selected

**Field Validation:**
- CRM requires specific fields
- Field names don't match
- Missing required fields

**Rate Limits:**
- Too many test requests
- Wait a few minutes and try again

### Leads Not Syncing

**Check These:**

1. **CRM Integration Enabled?**
   - Go to Step 7: CRM Integration
   - Verify toggle is ON

2. **Lead Capture Working?**
   - Test submitting a contact form
   - Check if lead appears in Leads dashboard

3. **Webhook URL Correct?**
   - Verify URL hasn't changed
   - Test in browser (should respond)

4. **Authentication Valid?**
   - API key not expired
   - Credentials still active

### Duplicate Contacts in CRM

**Cause:** CRM creating new contact instead of updating existing

**Solutions:**

1. **Configure CRM Deduplication:**
   - Most CRMs have dedupe settings
   - Set email as unique identifier
   - Update existing instead of create new

2. **Use Zapier:**
   - Zapier can check for existing contacts
   - Update if found, create if new

### Partial Field Mapping

**Symptom:** Some fields sync, others don't

**Causes:**
- Field name mismatch
- CRM field is read-only
- Data type incompatibility

**Solutions:**
1. Double-check field names in CRM API docs
2. Verify CRM field is writable
3. Test with simple text fields first
4. Add one field at a time

---

## Best Practices

### Security

✅ **DO:**
- Use HTTPS webhook URLs only
- Rotate API keys regularly
- Use least-privilege API tokens
- Monitor failed sync attempts

❌ **DON'T:**
- Share API keys publicly
- Use overly permissive tokens
- Ignore failed sync notifications
- Store credentials in code

### Performance

**Sync Speed:**
- Typical sync: < 2 seconds
- Network delays may occur
- Retries handle temporary failures

**Rate Limits:**
- Respect your CRM's rate limits
- Most CRMs: 100-1000 requests/hour
- Automatic retry handles rate limit errors

### Monitoring

**Weekly Checklist:**
- Review failed syncs
- Check sync success rate
- Verify new leads in CRM
- Test connection monthly

**Monthly Tasks:**
- Rotate API keys (best practice)
- Review field mappings
- Update CRM documentation
- Test end-to-end flow

---

## Next Steps

Now that CRM integration is set up:

- **[Lead Capture](/help/lead-capture)** - Configure your contact form
- **[Keyword Alerts](/help/keyword-alerts)** - Get notified of important mentions
- **[Analytics Dashboard](/help/analytics-dashboard)** - Track lead sources
- **[Team Management](/help/team-management)** - Have team follow up on leads
