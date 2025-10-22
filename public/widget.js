(function() {
  console.log('[ChatBot Widget] Script started loading');
  
  // Get the chatbot ID from the script tag's data attribute
  const currentScript = document.currentScript || document.querySelector('script[data-chatbot-id]');
  const chatbotId = currentScript?.getAttribute('data-chatbot-id');
  
  if (!chatbotId) {
    console.error('[ChatBot Widget] No chatbot ID provided');
    return;
  }

  console.log('[ChatBot Widget] Chatbot ID:', chatbotId);

  // Get the origin from the current script's src attribute
  // The script src will be like: https://buildchatbot.replit.app/widget.js
  const scriptSrc = currentScript?.getAttribute('src') || '';
  console.log('[ChatBot Widget] Script src:', scriptSrc);
  
  // Extract origin from script src (this is the chatbot server's domain)
  let origin;
  if (scriptSrc) {
    try {
      // Parse the script URL to get the origin (protocol + hostname + port)
      const scriptUrl = new URL(scriptSrc);
      origin = scriptUrl.origin;
    } catch (e) {
      console.error('[ChatBot Widget] Failed to parse script src:', e);
      origin = window.location.origin; // Fallback to current page origin
    }
  } else {
    origin = window.location.origin;
  }

  console.log('[ChatBot Widget] Using origin:', origin);

  // Create container div for the widget
  const container = document.createElement('div');
  container.id = 'chatbot-widget-container';
  container.style.cssText = `
    position: fixed;
    bottom: 0;
    right: 0;
    z-index: 999999;
    pointer-events: none;
  `;

  console.log('[ChatBot Widget] Creating iframe...');

  // Create iframe for the chatbot
  const iframe = document.createElement('iframe');
  iframe.id = 'chatbot-widget-iframe';
  
  // Point iframe to the chatbot server's widget page
  iframe.src = `${origin}/widget/${chatbotId}`;
  
  console.log('[ChatBot Widget] Iframe src:', iframe.src);
  
  iframe.style.cssText = `
    position: fixed;
    bottom: 0;
    right: 0;
    width: 450px;
    height: 650px;
    border: none;
    background: transparent;
    z-index: 2147483647;
    pointer-events: auto;
  `;
  
  console.log('[ChatBot Widget] Iframe style:', iframe.style.cssText);
  
  iframe.setAttribute('title', 'Customer Support Chat');
  iframe.setAttribute('allow', 'clipboard-write');

  // Append iframe to container
  container.appendChild(iframe);
  
  // Append container to body when DOM is ready
  if (document.body) {
    document.body.appendChild(container);
    console.log('[ChatBot Widget] Iframe appended to body');
  } else {
    document.addEventListener('DOMContentLoaded', function() {
      document.body.appendChild(container);
      console.log('[ChatBot Widget] Iframe appended to body (after DOMContentLoaded)');
    });
  }
})();
