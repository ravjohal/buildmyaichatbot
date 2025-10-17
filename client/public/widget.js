(function() {
  const script = document.currentScript;
  const chatbotId = script.getAttribute('data-chatbot-id');
  
  if (!chatbotId) {
    console.error('ChatBot Widget: data-chatbot-id attribute is required');
    return;
  }

  // Create widget container
  const widgetContainer = document.createElement('div');
  widgetContainer.id = 'chatbot-widget-container';
  widgetContainer.style.cssText = 'position: fixed; bottom: 0; right: 0; width: 100%; height: 100%; pointer-events: none; z-index: 2147483647;';
  document.body.appendChild(widgetContainer);

  // Create iframe for the widget - load the React route directly
  const iframe = document.createElement('iframe');
  iframe.src = `${window.location.origin}/widget/${chatbotId}`;
  iframe.style.cssText = 'width: 100%; height: 100%; border: none; background: transparent;';
  iframe.setAttribute('allow', 'clipboard-write');
  iframe.id = 'chatbot-widget-iframe';
  
  widgetContainer.appendChild(iframe);

  // Allow pointer events only on the widget area when chat is open
  window.addEventListener('message', function(event) {
    if (event.data.type === 'chatbot-widget-open') {
      widgetContainer.style.pointerEvents = 'all';
    } else if (event.data.type === 'chatbot-widget-close') {
      widgetContainer.style.pointerEvents = 'none';
    }
  });
})();
