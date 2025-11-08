# Managing Your Knowledge Base

Your chatbot's knowledge base is the foundation of its ability to answer questions. This guide explains how to add, update, and optimize your content sources.

## What is a Knowledge Base?

The knowledge base consists of all content your chatbot uses to answer questions:

- Website pages and content
- Uploaded documents (PDFs, Word files)
- Training data and examples

The system automatically:
- Extracts text and images from sources
- Splits content into semantic chunks
- Creates vector embeddings for similarity search
- Generates suggested questions from your content

---

## Adding Knowledge Sources

### Website URLs

Import content from any public website:

1. Navigate to your chatbot dashboard
2. Click **"Edit"** on your chatbot
3. Go to **Step 2: Knowledge Base**
4. Enter a URL in the "Website URL" field
5. Click **"Add URL"**

**What Gets Indexed:**
- Page text content
- Headings and subheadings
- Lists and tables
- Images with alt text
- Links to other pages (if on same domain)

**Supported Websites:**
- Static HTML sites
- WordPress blogs
- React/Vue single-page apps
- Documentation sites
- E-commerce product pages

![Adding Website URL](#screenshot-add-url)

#### URL Examples

**Full Website:**
```
https://yourcompany.com
```
Indexes your entire site (recommended for comprehensive coverage)

**Specific Section:**
```
https://yourcompany.com/help
https://yourcompany.com/products
```
Indexes only pages within that section

**Single Page:**
```
https://yourcompany.com/faq
```
Indexes just that one page

### Document Uploads

Upload files containing relevant information:

1. Click **"Upload Documents"**
2. Select files from your computer
3. Wait for upload and processing
4. Documents appear in your sources list

**Supported Formats:**
- PDF (.pdf)
- Microsoft Word (.docx)
- Plain Text (.txt)

**File Size Limits:**
- Free Plan: Up to 10MB per file
- Starter Plan: Up to 25MB per file
- Pro/Scale Plans: Up to 100MB per file

![Uploading Documents](#screenshot-upload-docs)

#### Document Best Practices

**For PDFs:**
- Use text-based PDFs (not scanned images)
- Ensure proper formatting and structure
- Include headers for better organization
- Avoid password-protected files

**For Word Documents:**
- Use headings (H1, H2, H3) for structure
- Keep formatting simple
- Avoid complex tables or layouts

**Content Tips:**
- Break large documents into smaller, focused files
- Use clear, descriptive filenames
- Remove outdated or irrelevant content
- Include FAQs and common questions

---

## Viewing Your Sources

See all knowledge sources in one place:

1. Edit your chatbot
2. Go to **Step 2: Knowledge Base**
3. View the **"Current Sources"** list

Each source shows:
- **Type** (Website or Document)
- **Name** (URL or filename)
- **Status** (Indexed, Processing, or Error)
- **Last Updated** date
- **Actions** (Refresh or Delete)

![Knowledge Sources List](#screenshot-sources-list)

---

## Refreshing Knowledge Base

Update your chatbot's knowledge when content changes:

### Manual Refresh

1. Go to your chatbot dashboard
2. Click **"Refresh Knowledge Base"**
3. The system checks all sources for changes
4. Only modified content is re-indexed

**When to Refresh:**
- After updating your website content
- When adding new products or services
- After publishing new blog posts
- When FAQs change

### How It Works

The refresh process:

1. **Content Detection** - Checks MD5 hash of each source
2. **Change Identification** - Compares to previous version
3. **Selective Re-indexing** - Only processes changed content
4. **Update Embeddings** - Regenerates vectors for new content
5. **Preserve Cache** - Keeps existing Q&A pairs

**Time Required:**
- No changes: 5-10 seconds
- Minor changes: 30-60 seconds
- Major changes: 2-5 minutes

![Refresh Progress](#screenshot-refresh)

> **Tip:** Refresh runs in the background—you can continue working while it completes.

---

## Removing Sources

Delete content sources you no longer need:

1. Find the source in your sources list
2. Click the **Delete** (trash) icon
3. Confirm the deletion

**What Happens:**
- Source is removed from knowledge base
- Related chunks and embeddings are deleted
- Chatbot no longer uses that content
- Cached answers from that source remain (until manually removed)

> **Warning:** Deleting a source cannot be undone. Re-add the source if needed.

---

## Visual Content

Your chatbot can display images from indexed sources:

### Automatic Image Indexing

When crawling websites, the system:
- Identifies relevant images
- Extracts image URLs
- Creates descriptions using AI
- Stores embeddings for semantic search

### How Images Are Used

When a visitor asks about something visual:
- System searches for relevant images
- Displays images inline with text response
- Includes image captions when available

**Example Use Cases:**
- Floor plans for real estate
- Product photos for e-commerce
- Diagrams for technical docs
- Before/after comparisons

![Image Display Example](#screenshot-images)

---

## Suggested Questions

The AI automatically generates FAQ-style questions from your content:

### How It Works

During indexing:
1. AI analyzes your content
2. Generates natural questions people might ask
3. Stores questions with your chatbot
4. Displays 3-4 random questions when chat opens

**Example Generated Questions:**
- "What are your business hours?"
- "How do I reset my password?"
- "What's included in the premium plan?"
- "Do you offer refunds?"

### Benefits

- Helps visitors start conversations
- Reduces "What can you help with?" messages
- Showcases your chatbot's capabilities
- Improves engagement rates

![Suggested Questions](#screenshot-suggested-questions)

---

## Optimizing Your Knowledge Base

### Content Quality Tips

**Be Comprehensive:**
- Include all important information
- Cover common questions and scenarios
- Provide detailed explanations

**Be Organized:**
- Use clear headings and sections
- Structure content logically
- Group related information together

**Be Concise:**
- Remove fluff and filler
- Get to the point quickly
- Use bullet points and lists

**Be Current:**
- Update outdated information
- Remove deprecated content
- Refresh regularly

### Performance Tips

**Avoid Duplicate Content:**
- Don't index the same page multiple times
- Remove redundant documents
- Consolidate similar content

**Balance Coverage:**
- Too little content: Chatbot can't answer questions
- Too much content: Slower responses, less accuracy
- Sweet spot: Focused, relevant content

**Monitor Analytics:**
- Check "Unanswered Questions" in Analytics
- Add content to address common gaps
- Remove content that's never used

---

## Troubleshooting

### "Indexing Failed" Error

**Possible Causes:**
- Website requires authentication
- Page blocked by robots.txt
- Server timeout or connection error
- PDF is scanned image (not text)

**Solutions:**
- Ensure pages are publicly accessible
- Check robots.txt allows crawling
- Try uploading content as document instead
- Use text-based PDFs

### Chatbot Gives Incorrect Answers

**Possible Causes:**
- Outdated content in knowledge base
- Conflicting information across sources
- Content not specific enough

**Solutions:**
- Refresh your knowledge base
- Remove conflicting sources
- Use Manual Answer Training to correct responses

### Indexing Takes Too Long

**Normal Times:**
- Small website (10 pages): 1-2 minutes
- Medium website (50 pages): 3-5 minutes
- Large website (100+ pages): 5-10 minutes
- Single document: 30-60 seconds

**If Stuck:**
- Wait 15 minutes and check again
- Refresh the page
- Contact support if still processing after 30 minutes

---

## Best Practices Summary

✅ **DO:**
- Start with your most important content
- Use clear, well-structured documents
- Refresh after significant content updates
- Remove outdated or irrelevant sources
- Test your chatbot after adding content

❌ **DON'T:**
- Index your entire website if only part is relevant
- Upload scanned PDFs (use text-based PDFs)
- Forget to refresh after website updates
- Include confidential or sensitive information
- Add duplicate content from multiple sources

---

## Next Steps

Now that your knowledge base is set up:

- **[Customize Your Chatbot](/help/customization)** - Brand colors and personality
- **[Train Your Chatbot](/help/manual-training)** - Improve answer accuracy
- **[Embed Your Chatbot](/help/embedding)** - Add to your website
- **[View Analytics](/help/analytics-dashboard)** - See how it performs
