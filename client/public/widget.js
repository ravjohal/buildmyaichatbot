(function() {
  console.log('[ChatBot Widget] Script started loading');
  
  const script = document.currentScript;
  const chatbotId = script.getAttribute('data-chatbot-id');
  
  if (!chatbotId) {
    console.error('[ChatBot Widget] ERROR: data-chatbot-id attribute is required');
    return;
  }

  console.log('[ChatBot Widget] Chatbot ID:', chatbotId);

  // Get the origin from the script's src attribute
  // This is crucial for embedding - the script src will be like:
  // https://buildchatbot.replit.app/widget.js
  const scriptSrc = script.getAttribute('src') || script.src;
  console.log('[ChatBot Widget] Script src:', scriptSrc);

  // Extract the chatbot server's origin from the script URL
  let chatbotServerOrigin;
  if (scriptSrc) {
    try {
      // Use base URL to handle relative paths like "/widget.js"
      const scriptUrl = new URL(scriptSrc, window.location.origin);
      chatbotServerOrigin = scriptUrl.origin;
    } catch (e) {
      console.error('[ChatBot Widget] Failed to parse script src, using fallback:', e);
      chatbotServerOrigin = window.location.origin;
    }
  } else {
    chatbotServerOrigin = window.location.origin;
  }

  console.log('[ChatBot Widget] Chatbot server origin:', chatbotServerOrigin);

  console.log('[ChatBot Widget] Creating iframe...');
  const iframe = document.createElement('iframe');
  
  // CRITICAL: Use the chatbot server's origin, NOT the current page's origin
  iframe.src = `${chatbotServerOrigin}/widget/${chatbotId}`;
  
  // START COLLAPSED: Small size for just the launcher button area (80x80 = 64px button + 8px padding each side)
  // With a small footprint, the iframe only covers the button area, not the whole page
  // pointer-events:auto is needed so the button can be clicked
  iframe.style.cssText = 'position: fixed; bottom: 0; right: 0; width: 80px; height: 80px; border: none; background: transparent; z-index: 2147483647; pointer-events: auto;';
  iframe.setAttribute('allow', 'clipboard-write');
  iframe.id = 'chatbot-widget-iframe';
  
  console.log('[ChatBot Widget] Iframe src:', iframe.src);
  console.log('[ChatBot Widget] Iframe style:', iframe.style.cssText);
  
  // Add load event listener
  iframe.addEventListener('load', function() {
    console.log('[ChatBot Widget] Iframe loaded successfully');
  });
  
  iframe.addEventListener('error', function(e) {
    console.error('[ChatBot Widget] Iframe error:', e);
  });

  // Listen for messages from the iframe to resize it
  window.addEventListener('message', function(event) {
    // Verify the message is from our chatbot origin
    if (event.origin !== chatbotServerOrigin) {
      return;
    }

    const data = event.data;
    if (data && data.type === 'chatbot-widget-resize') {
      console.log('[ChatBot Widget] Received resize message:', data);
      
      if (data.isOpen) {
        // Expanded: Full chat window size
        iframe.style.width = '450px';
        iframe.style.height = '720px';
        console.log('[ChatBot Widget] Expanded to full size');
      } else {
        // Collapsed: Small area for just the launcher button (80x80 = 64px button + 8px padding each side)
        // This small footprint only covers the button area, not the whole page
        iframe.style.width = '80px';
        iframe.style.height = '80px';
        console.log('[ChatBot Widget] Collapsed to launcher size');
      }
    }
  });
  
  document.body.appendChild(iframe);
  console.log('[ChatBot Widget] Iframe appended to body');
})();
