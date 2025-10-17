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
  widgetContainer.style.cssText = 'position: fixed; bottom: 0; right: 0; width: 100%; height: 100%; z-index: 2147483647; pointer-events: none;';
  document.body.appendChild(widgetContainer);

  // Create iframe for the widget - load the React route directly
  const iframe = document.createElement('iframe');
  iframe.src = `${window.location.origin}/widget/${chatbotId}`;
  iframe.style.cssText = 'width: 100%; height: 100%; border: none; background: transparent; pointer-events: auto;';
  iframe.setAttribute('allow', 'clipboard-write');
  iframe.id = 'chatbot-widget-iframe';
  
  widgetContainer.appendChild(iframe);

  // Listen for widget state changes - no need to toggle pointer events on open/close
  // The iframe content handles its own click areas
  window.addEventListener('message', function(event) {
    // Messages are received but we don't need to do anything with them for pointer events
    // The iframe content manages its own interaction areas
  });
})();
