# Embedding Your Chatbot

Add your AI chatbot to your website with a simple script tag. This guide explains how to embed and customize the chat widget.

## Quick Embed

The fastest way to add your chatbot:

### Step 1: Get Your Embed Code

1. Go to your Chatbots dashboard
2. Click on a chatbot
3. Copy the embed code displayed

The code looks like this:

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

![Embed Code Display](#screenshot-embed-code)

### Step 2: Add to Your Website

1. Open your website's HTML file or template
2. Find the closing `</body>` tag
3. Paste the script just before `</body>`
4. Save and publish your website

### Step 3: Test

1. Visit your website
2. Look for the chat widget in the bottom-right corner
3. Click to open and test the chatbot

![Chat Widget on Website](#screenshot-widget-live)

---

## Installation Methods

### HTML Websites

For static HTML sites:

1. Open your main HTML file (usually `index.html`)
2. Scroll to the bottom
3. Paste the embed code before `</body>`
4. Upload the updated file to your server

### WordPress

For WordPress sites:

**Method 1: Theme Footer**
1. Go to **Appearance → Theme Editor**
2. Select **footer.php**
3. Paste code before `</body>`
4. Update file

**Method 2: Plugin**
1. Install a "Header Footer Code Manager" plugin
2. Add the script to footer
3. Apply to all pages

![WordPress Installation](#screenshot-wordpress)

### Shopify

For Shopify stores:

1. Go to **Online Store → Themes**
2. Click **Actions → Edit Code**
3. Open `theme.liquid`
4. Paste code before `</body>`
5. Save

### Squarespace

For Squarespace sites:

1. Go to **Settings → Advanced → Code Injection**
2. Paste code in **Footer** section
3. Save

### Webflow

For Webflow sites:

1. Go to **Project Settings → Custom Code**
2. Paste in **Footer Code** section
3. Publish site

### Custom Platforms

For any other platform:

1. Find theme/template editor
2. Locate the global footer file
3. Add script before `</body>`
4. Save and publish

---

## Chat Widget Customization

Customize appearance in the chatbot wizard:

### Visual Settings

Configure in **Step 4: Customization**:

- **Logo** - Your company logo in chat header
- **Primary Color** - Chat bubbles and buttons
- **Accent Color** - Highlights and links
- **Header Background** - Color behind logo/name
- **Position** - Bottom-right or bottom-left

Changes apply automatically to the embedded widget.

![Customization Settings](#screenshot-customization)

### Welcome Message

Set the initial greeting:

1. Edit your chatbot
2. Go to **Step 4: Customization**
3. Enter your **Welcome Message**
4. Appears when chat first opens

**Example:**
"Hi! 👋 I'm here to help with any questions about our products and services. How can I assist you today?"

---

## Proactive Chat Popup

Make the chat widget announce itself:

### What It Is

A small notification that appears after a visitor spends time on your page:
- "Hi! Need help? Chat with us!"
- Draws attention to the chat widget
- Auto-dismisses after a few seconds

### Enabling Proactive Popup

1. Edit your chatbot
2. Go to **Step 4: Customization**
3. Toggle **"Proactive Popup"** to ON
4. Set delay (e.g., 10 seconds)
5. Customize popup message

### Best Practices

**Delay Timing:**
- **5 seconds** - Aggressive, high engagement
- **10 seconds** - Balanced approach
- **30 seconds** - Less intrusive

**Message Tips:**
- Keep it short and friendly
- Create urgency without being pushy
- Mention specific value ("Get 24/7 support")

**Example Messages:**
- "Questions? We're here to help!"
- "Need assistance? Let's chat!"
- "Can I help you find something?"

![Proactive Popup](#screenshot-popup)

---

## Alternative Embedding Options

### Shareable Link

Share your chatbot directly via URL:

1. Go to chatbot dashboard
2. Find your chatbot
3. Click **"Copy Link"**
4. Share the link anywhere

**Use Cases:**
- Email signatures
- Social media bios
- QR codes
- Direct messages

Example URL:
```
https://buildmychatbot.ai/chat/YOUR_CHATBOT_ID
```

Visitors see a full-page chat interface.

![Shareable Link Interface](#screenshot-shareable-link)

### QR Code

Generate a QR code for your chatbot:

1. Go to chatbot dashboard
2. Click the **QR Code** icon
3. Download the QR image
4. Print or display digitally

**Use Cases:**
- Business cards
- Flyers and posters
- Product packaging
- Trade show booths
- Restaurant table tents

![QR Code Download](#screenshot-qr-code)

### iframe Embed (Advanced)

Embed as an iframe for more control:

```html
<iframe
  src="https://buildmychatbot.ai/chat/YOUR_CHATBOT_ID"
  width="400"
  height="600"
  frameborder="0"
  style="border: none; border-radius: 10px;"
></iframe>
```

**Use Cases:**
- Dedicated support page
- Custom page layouts
- Full control over positioning and size

---

## Testing Your Installation

### Verify Installation

1. Visit your website
2. Check for chat widget in bottom corner
3. Click to open chat
4. Send a test message
5. Verify chatbot responds

### Common Test Scenarios

- **Knowledge Test** - Ask a question from your content
- **Lead Capture** - Submit the contact form
- **Live Agent** - Request live support
- **Mobile Test** - Check on phone/tablet
- **Different Pages** - Test on multiple pages

![Testing Checklist](#screenshot-testing)

---

## Troubleshooting

### Chat Widget Not Appearing

**Possible Causes:**
- Script not installed correctly
- JavaScript errors on page
- Ad blocker blocking widget
- Chatbot ID incorrect

**Solutions:**
1. Verify script is before `</body>`
2. Check browser console for errors
3. Disable ad blockers
4. Confirm chatbot ID matches your chatbot
5. Clear browser cache and reload

### Widget Showing for a Moment Then Disappearing

**Cause:** Another script might be removing it

**Solution:**
1. Check for conflicting scripts
2. Load widget script last
3. Contact support if issue persists

### Widget Not Styled Correctly

**Possible Causes:**
- CSS conflicts with your site
- Customization not saved
- Browser caching old styles

**Solutions:**
1. Clear browser cache
2. Check customization settings saved
3. Try in incognito window
4. Update browser

### Mobile Display Issues

**Possible Causes:**
- Viewport meta tag missing
- CSS conflicts on mobile
- Widget not responsive

**Solutions:**
1. Ensure viewport meta tag in `<head>`:
   ```html
   <meta name="viewport" content="width=device-width, initial-scale=1">
   ```
2. Test on actual mobile devices
3. Check for CSS overrides

---

## Advanced Customization

### Hide on Specific Pages

Use JavaScript to conditionally load:

```html
<script>
  // Only load on product pages
  if (window.location.pathname.includes('/products')) {
    (function() {
      var script = document.createElement('script');
      script.src = 'https://buildmychatbot.ai/widget.js';
      script.setAttribute('data-chatbot-id', 'YOUR_CHATBOT_ID');
      document.body.appendChild(script);
    })();
  }
</script>
```

### Trigger Chat Programmatically

Open chat via JavaScript:

```javascript
// Open chat widget
window.openChatWidget();

// Close chat widget
window.closeChatWidget();
```

Use cases:
- "Chat with us" buttons
- Help links
- Custom triggers

### Pass User Data

Pre-fill visitor information:

```html
<script>
  window.chatbotUserData = {
    name: 'John Doe',
    email: 'john@example.com'
  };
</script>
<!-- Then load widget script -->
```

> **Note:** Advanced customization features require Pro or Scale plan.

---

## Performance Considerations

### Load Time

The widget:
- Loads asynchronously (doesn't block page load)
- Minimal impact on performance
- ~50KB total size

### Best Practices

**Placement:**
- Load script at bottom of page
- After main content loads
- Before analytics scripts (optional)

**Optimization:**
- Widget lazy-loads when needed
- Uses browser caching
- Optimized for mobile networks

---

## Next Steps

Now that your chatbot is embedded:

- **[Customize Appearance](/help/customization)** - Match your brand
- **[View Analytics](/help/analytics-dashboard)** - Track conversations
- **[Set Up Live Chat](/help/live-chat)** - Handle complex questions
- **[Capture Leads](/help/lead-capture)** - Collect visitor info
