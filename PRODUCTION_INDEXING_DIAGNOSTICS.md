# Production Indexing Diagnostics & Fixes

## ✅ **FIXED** - Playwright Browser Installation (Nov 3, 2025)

**Issue:** Playwright browsers were not installed in production, causing all website crawling to fail.

**Solution:** Updated `build.sh` to run `npx playwright install chromium --with-deps` as part of the build process. This ensures Chromium is available for website crawling in production.

---

## 🔍 Problem Summary

Indexing was not working in production, with jobs appearing to run indefinitely with no console output.

## 🎯 Root Causes Identified

### 1. **Worker May Not Be Starting**
The indexing worker relies on the `server.listen()` callback in `server/index.ts` to initialize. In some production deployments, this callback might not execute properly due to:
- Different build/start codepath
- Container initialization issues
- Module loading failures

### 2. **Playwright/Chromium Availability Issues**
Production environment (NODE_ENV=production) attempts to use system Chromium from Nix. Potential issues:
- System Chromium path not found correctly
- Missing browser dependencies
- Silent browser launch failures

### 3. **No Visibility When Worker Fails**
Previous implementation had:
- No health checks on startup
- No heartbeat/alive logging
- Silent failures with no error traces
- No timeout protection for stuck jobs

## ✅ Fixes Implemented

### 1. **Comprehensive Health Monitoring**

**Worker Startup Health Check:**
```
[WORKER] ========================================
[WORKER] Starting indexing worker...
[WORKER] Environment: production
[WORKER] Poll interval: 3000 ms
[WORKER] Job timeout: 15 minutes
[WORKER] ========================================
[WORKER-HEALTH] Testing Playwright/Chromium availability...
[WORKER-HEALTH] Environment: production
[WORKER-HEALTH] Default Chromium path: /path/to/chrome
[WORKER-HEALTH] System Chromium found: /nix/store/.../chromium-browser
[WORKER-HEALTH] ✓ Playwright/Chromium is operational
[WORKER] ✓ Indexing worker started successfully
```

**What It Does:**
- Tests actual browser launch on startup
- Logs Chromium paths and availability
- Continues even if browser unavailable (can still process document uploads)
- **CRITICAL**: If you see Playwright errors in production logs, this is the smoking gun

### 2. **Heartbeat Logging**

Every 30 seconds, worker logs:
```
[WORKER-HEARTBEAT] Worker alive | Jobs processed: 5 | Uptime: 300s
```

**Purpose:**
- Proves worker loop is running
- Shows job processing statistics
- Makes it obvious when worker crashes or stops

### 3. **Enhanced Error Logging**

All errors now include:
```
[WORKER] ✗ Error processing job abc-123:
[WORKER] Error stack: <full stack trace>
```

**Benefits:**
- Full stack traces for debugging
- Clear error markers (✗ vs ✓)
- Environment context in all log messages

### 4. **Job Timeout Protection**

- **Maximum job time**: 15 minutes
- **Auto-fail stuck jobs**: Prevents indefinite "processing" state
- **Timeout logging**: Clear indication when jobs timeout

### 5. **Better Playwright Configuration**

**Increased Timeouts:**
- Page load timeout: 30 seconds (was 15s)
- Wait strategy: `domcontentloaded` (was `networkidle`)
- JavaScript render wait: 3 seconds (was 2s)

**Why This Helps:**
- Modern sites with analytics never reach `networkidle`
- 30-second timeout handles slow/heavy sites
- More reliable for real-world websites

## 📋 How to Diagnose Production Issues

### Step 1: Check if Worker Started

Search production logs for:
```bash
grep "\[WORKER\]" production.log
```

**Expected Output:**
```
[WORKER] ========================================
[WORKER] Starting indexing worker...
[WORKER] ✓ Indexing worker started successfully
```

**❌ If you don't see this:**
- Worker never started
- Check `server.listen()` callback execution
- Check for module import errors
- Verify production build includes `indexing-worker.ts`

### Step 2: Check Playwright/Chromium Health

Look for health check results:
```bash
grep "\[WORKER-HEALTH\]" production.log
```

**✅ Success:**
```
[WORKER-HEALTH] ✓ Playwright/Chromium is operational
```

**❌ Failure:**
```
[WORKER-HEALTH] ✗ Playwright/Chromium FAILED: <error message>
[WORKER] ✗ CRITICAL: Playwright/Chromium is not available!
```

**If you see this failure:**
1. Check if Chromium is installed: `which chromium-browser`
2. Verify `replit.nix` includes chromium dependencies
3. Check Playwright browser installation
4. Try manually: `npx playwright install chromium`

### Step 3: Check Worker is Alive

Look for heartbeat logs:
```bash
grep "\[WORKER-HEARTBEAT\]" production.log | tail -5
```

**Expected Output (every 30s):**
```
[WORKER-HEARTBEAT] Worker alive | Jobs processed: 0 | Uptime: 30s
[WORKER-HEARTBEAT] Worker alive | Jobs processed: 0 | Uptime: 60s
[WORKER-HEARTBEAT] Worker alive | Jobs processed: 2 | Uptime: 90s
```

**❌ If heartbeats stop:**
- Worker loop crashed
- Check for errors: `grep "\[WORKER\] ✗" production.log`
- Worker may need restart

### Step 4: Check for Job Processing

When jobs are running:
```bash
grep "\[WORKER\] Found.*pending" production.log
grep "\[WORKER\] ✓ Job.*completed" production.log
```

**Expected Pattern:**
```
[WORKER] Found 1 pending indexing job(s)
[WORKER] Processing indexing job abc-123
[WORKER] Job progress: 1/1 completed, 0 failed, 0 cancelled
[WORKER] ✓ Job abc-123 completed with status: completed
```

### Step 5: Check for Errors

Search for error markers:
```bash
grep "✗" production.log
grep -A 5 "\[WORKER\] ✗" production.log
```

**Common Errors:**

**Timeout Error:**
```
[WORKER] ✗ Job abc-123 TIMED OUT - marking as failed
```
→ Job took longer than 15 minutes, check website size/complexity

**Chromium Error:**
```
[PlaywrightRenderer] ✗ RENDER ERROR for https://example.com
page.goto: Timeout 30000ms exceeded
```
→ Website too slow or blocking requests

**Storage Limit Error:**
```
Storage limit exceeded: free tier allows 100MB, currently using 95MB
```
→ User hit storage limit

## 🚀 Recommended Production Actions

### Immediate Actions

1. **Check Production Logs**
   ```bash
   # In Replit deployment logs or container logs
   grep "\[WORKER" production.log | head -50
   ```

2. **Verify Worker Started**
   - Look for `[WORKER] ✓ Indexing worker started successfully`
   - If missing, worker never initialized

3. **Check Chromium Availability**
   - Look for `[WORKER-HEALTH] ✓ Playwright/Chromium is operational`
   - If failed, check Nix dependencies

4. **Monitor Heartbeats**
   - Should see `[WORKER-HEARTBEAT]` every 30 seconds
   - Absence means worker crashed

### If Worker Isn't Starting

**Option A: Verify Production Build**
```bash
# Check if indexing-worker.ts is bundled
ls -la dist/
cat dist/index.js | grep "startIndexingWorker"
```

**Option B: Add Startup Logging**
Add to `server/index.ts`:
```javascript
console.log('[STARTUP] About to import indexing worker...');
const { startIndexingWorker } = await import('./indexing-worker');
console.log('[STARTUP] Imported successfully, starting worker...');
await startIndexingWorker();
console.log('[STARTUP] Worker start complete');
```

**Option C: Check for Import Errors**
Look for any module loading errors in production logs

### If Chromium Fails

**Option A: Verify Nix Packages**
```bash
# In Replit shell
which chromium-browser
chromium-browser --version
```

**Option B: Install Playwright Browsers**
Add to `package.json`:
```json
{
  "scripts": {
    "postinstall": "npx playwright install chromium"
  }
}
```

**Option C: Use System Chromium**
Already configured in `replit.nix`:
```nix
deps = [
  pkgs.chromium
  pkgs.playwright-driver
  # ... other deps
];
```

## 📊 Success Indicators

When everything is working correctly, you should see:

```
[WORKER] ========================================
[WORKER] Starting indexing worker...
[WORKER] Environment: production
[WORKER] Poll interval: 3000 ms
[WORKER] Job timeout: 15 minutes
[WORKER] ========================================
[WORKER-HEALTH] Testing Playwright/Chromium availability...
[WORKER-HEALTH] ✓ Playwright/Chromium is operational
[WORKER] ✓ Indexing worker started successfully
[WORKER-HEARTBEAT] Worker alive | Jobs processed: 0 | Uptime: 30s
[WORKER] Found 1 pending indexing job(s)
[WORKER] Processing indexing job abc-123
[WORKER] Recursively crawling website: https://example.com
[WORKER] Crawled 15 pages from https://example.com
[WORKER] ✓ Stored 145 chunks for https://example.com
[WORKER] Job progress: 1/1 completed, 0 failed, 0 cancelled
[WORKER] ✓ Job abc-123 completed with status: completed
[WORKER-HEARTBEAT] Worker alive | Jobs processed: 1 | Uptime: 60s
```

## 🔧 Advanced Debugging

### Enable Playwright Debug Logging

Add to production environment:
```bash
DEBUG=pw:browser* NODE_ENV=production npm start
```

### Test Chromium Directly

```bash
# In production environment
node -e "
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  console.log('✓ Chromium launched:', await browser.version());
  await browser.close();
})();
"
```

### Check Database for Stuck Jobs

```sql
SELECT 
  id,
  status,
  started_at,
  EXTRACT(EPOCH FROM (NOW() - started_at))/60 as minutes_running
FROM indexing_jobs
WHERE status = 'processing'
ORDER BY started_at DESC;
```

## 📝 Summary

The production indexing issue was likely caused by:
1. Worker not starting due to deployment differences
2. Playwright/Chromium not being available
3. Silent failures with no diagnostic logging

The fixes provide:
1. **Health checks** showing Chromium availability
2. **Heartbeat logging** proving worker is alive
3. **Timeout protection** preventing stuck jobs
4. **Enhanced errors** with full stack traces
5. **Better browser config** handling real-world websites

**Next Step**: Check production logs for `[WORKER]` and `[WORKER-HEALTH]` messages to identify the exact issue.
