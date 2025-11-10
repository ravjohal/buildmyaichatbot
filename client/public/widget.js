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
  
  iframe.style.cssText = 'position: fixed; bottom: 0; right: 0; width: 450px; height: 720px; border: none; background: transparent; z-index: 2147483647; pointer-events: auto;';
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
  
  document.body.appendChild(iframe);
  console.log('[ChatBot Widget] Iframe appended to body');
})();
