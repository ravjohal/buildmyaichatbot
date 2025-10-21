(function() {
  // Get the chatbot ID from the script tag's data attribute
  const currentScript = document.currentScript || document.querySelector('script[data-chatbot-id]');
  const chatbotId = currentScript?.getAttribute('data-chatbot-id');
  
  if (!chatbotId) {
    console.error('[ChatWidget] No chatbot ID provided');
    return;
  }

  console.log('[ChatWidget] Initializing with chatbot ID:', chatbotId);

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

  // Create iframe for the chatbot
  const iframe = document.createElement('iframe');
  iframe.id = 'chatbot-widget-iframe';
  
  // Get the origin from the current script's src attribute
  const scriptSrc = currentScript?.getAttribute('src') || '';
  const origin = scriptSrc ? new URL(scriptSrc, window.location.href).origin : window.location.origin;
  
  iframe.src = `${origin}/widget/${chatbotId}`;
  iframe.style.cssText = `
    border: none;
    position: fixed;
    bottom: 0;
    right: 0;
    width: 100vw;
    height: 100vh;
    max-width: 100vw;
    max-height: 100vh;
    pointer-events: auto;
    background: transparent;
  `;
  iframe.setAttribute('title', 'Customer Support Chat');
  iframe.setAttribute('allow', 'clipboard-write');

  // Append iframe to container
  container.appendChild(iframe);
  
  // Append container to body when DOM is ready
  if (document.body) {
    document.body.appendChild(container);
    console.log('[ChatWidget] Widget iframe injected successfully');
  } else {
    document.addEventListener('DOMContentLoaded', function() {
      document.body.appendChild(container);
      console.log('[ChatWidget] Widget iframe injected successfully (after DOMContentLoaded)');
    });
  }
})();
