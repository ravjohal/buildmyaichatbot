(function() {
  console.log('[ChatBot Widget] Script started loading');
  
  const script = document.currentScript;
  const chatbotId = script.getAttribute('data-chatbot-id');
  
  console.log('[ChatBot Widget] Chatbot ID:', chatbotId);
  console.log('[ChatBot Widget] Script src:', script.src);
  
  if (!chatbotId) {
    console.error('[ChatBot Widget] ERROR: data-chatbot-id attribute is required');
    return;
  }

  console.log('[ChatBot Widget] Creating iframe...');
  const iframe = document.createElement('iframe');
  iframe.src = `${window.location.origin}/widget/${chatbotId}`;
  iframe.style.cssText = 'position: fixed; bottom: 0; right: 0; width: 450px; height: 650px; border: none; background: transparent; z-index: 2147483647; pointer-events: auto;';
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
  
  // Add click tracking on the iframe
  iframe.addEventListener('click', function(e) {
    console.log('[ChatBot Widget] Click detected on iframe!', e);
  });
  
  document.body.appendChild(iframe);
  console.log('[ChatBot Widget] Iframe appended to body');
  
  // Log all iframes on the page
  setTimeout(() => {
    console.log('[ChatBot Widget] All iframes on page:', document.querySelectorAll('iframe'));
    console.log('[ChatBot Widget] Widget iframe element:', document.getElementById('chatbot-widget-iframe'));
  }, 1000);
})();
