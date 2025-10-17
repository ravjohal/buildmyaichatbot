(function() {
  const script = document.currentScript;
  const chatbotId = script.getAttribute('data-chatbot-id');
  
  if (!chatbotId) {
    console.error('ChatBot Widget: data-chatbot-id attribute is required');
    return;
  }

  // Create container that covers full page but doesn't block clicks
  const container = document.createElement('div');
  container.id = 'chatbot-widget-container';
  container.style.cssText = 'position: fixed; bottom: 0; right: 0; width: 100%; height: 100%; z-index: 2147483647; pointer-events: none;';
  
  // Create iframe for the widget - make it clickable
  const iframe = document.createElement('iframe');
  iframe.src = `${window.location.origin}/widget/${chatbotId}`;
  iframe.style.cssText = 'width: 100%; height: 100%; border: none; background: transparent; pointer-events: auto;';
  iframe.setAttribute('allow', 'clipboard-write');
  iframe.id = 'chatbot-widget-iframe';
  
  container.appendChild(iframe);
  document.body.appendChild(container);
})();
