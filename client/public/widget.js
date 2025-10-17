(function() {
  const script = document.currentScript;
  const chatbotId = script.getAttribute('data-chatbot-id');
  
  if (!chatbotId) {
    console.error('ChatBot Widget: data-chatbot-id attribute is required');
    return;
  }

  // Create iframe sized to fit the widget (button + potential chat window)
  // Position at bottom-right, size 450x650px to accommodate button and chat window
  const iframe = document.createElement('iframe');
  iframe.src = `${window.location.origin}/widget/${chatbotId}`;
  iframe.style.cssText = 'position: fixed; bottom: 0; right: 0; width: 450px; height: 650px; border: none; background: transparent; z-index: 2147483647;';
  iframe.setAttribute('allow', 'clipboard-write');
  iframe.id = 'chatbot-widget-iframe';
  
  document.body.appendChild(iframe);
})();
