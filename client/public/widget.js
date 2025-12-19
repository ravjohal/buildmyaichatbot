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
      const scriptUrl = new URL(scriptSrc);
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
  
  // START COLLAPSED: Small size for just the launcher button, pointer-events only on the button area
  // This prevents the transparent iframe from blocking clicks on the host page
  iframe.style.cssText = 'position: fixed; bottom: 0; right: 0; width: 100px; height: 100px; border: none; background: transparent; z-index: 2147483647; pointer-events: none;';
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
        // Expanded: Full chat window size with pointer-events enabled
        iframe.style.width = '450px';
        iframe.style.height = '720px';
        iframe.style.pointerEvents = 'auto';
        console.log('[ChatBot Widget] Expanded to full size');
      } else {
        // Collapsed: Small area for just the launcher button, pointer-events disabled on iframe
        // The button inside will still be clickable because we enable pointer-events on specific elements
        iframe.style.width = '100px';
        iframe.style.height = '100px';
        iframe.style.pointerEvents = 'none';
        console.log('[ChatBot Widget] Collapsed to launcher size');
      }
    }
  });
  
  document.body.appendChild(iframe);
  console.log('[ChatBot Widget] Iframe appended to body');
})();
