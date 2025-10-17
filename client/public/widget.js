(function() {
  const script = document.currentScript;
  const chatbotId = script.getAttribute('data-chatbot-id');
  
  if (!chatbotId) {
    console.error('ChatBot Widget: data-chatbot-id attribute is required');
    return;
  }

  // Create iframe for the widget with pointer-events: none so page is clickable
  const iframe = document.createElement('iframe');
  iframe.src = `${window.location.origin}/widget/${chatbotId}`;
  iframe.style.cssText = 'position: fixed; bottom: 0; right: 0; width: 100%; height: 100%; border: none; background: transparent; z-index: 2147483647; pointer-events: none;';
  iframe.setAttribute('allow', 'clipboard-write');
  iframe.id = 'chatbot-widget-iframe';
  
  document.body.appendChild(iframe);
})();
