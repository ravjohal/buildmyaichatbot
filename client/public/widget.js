(function() {
  console.log('[ChatBot Widget] Script started loading');
  
  const script = document.currentScript;
  const chatbotId = script.getAttribute('data-chatbot-id');
  
  if (!chatbotId) {
    console.error('[ChatBot Widget] ERROR: data-chatbot-id attribute is required');
    return;
  }

  console.log('[ChatBot Widget] Chatbot ID:', chatbotId);

  const scriptSrc = script.getAttribute('src') || script.src;
  console.log('[ChatBot Widget] Script src:', scriptSrc);

  let chatbotServerOrigin;
  if (scriptSrc) {
    try {
      const scriptUrl = new URL(scriptSrc, window.location.origin);
      chatbotServerOrigin = scriptUrl.origin;
    } catch (e) {
      console.error('[ChatBot Widget] Failed to parse script src, using fallback:', e);
      chatbotServerOrigin = window.location.origin;
    }
  } else {
    chatbotServerOrigin = window.location.origin;
  }

  console.log('[ChatBot Widget] Chatbot server origin:', chatbotServerOrigin);

  let isWidgetOpen = false;

  console.log('[ChatBot Widget] Creating iframe...');
  const iframe = document.createElement('iframe');
  iframe.src = `${chatbotServerOrigin}/widget/${chatbotId}`;
  iframe.style.cssText = 'position: fixed; bottom: 0; right: 0; width: 80px; height: 80px; border: none; background: transparent; z-index: 2147483647; pointer-events: auto;';
  iframe.setAttribute('allow', 'clipboard-write');
  iframe.id = 'chatbot-widget-iframe';
  
  console.log('[ChatBot Widget] Iframe src:', iframe.src);
  console.log('[ChatBot Widget] Iframe style:', iframe.style.cssText);

  // Create a transparent click catcher overlay on the PARENT page
  // This ensures clicks reach the widget even when cross-origin iframe interactions fail
  const clickCatcher = document.createElement('div');
  clickCatcher.id = 'chatbot-widget-click-catcher';
  clickCatcher.style.cssText = 'position: fixed; bottom: 0; right: 0; width: 80px; height: 80px; z-index: 2147483648; cursor: pointer; background: transparent;';
  
  clickCatcher.addEventListener('click', function(e) {
    console.log('[ChatBot Widget] Click catcher clicked, sending toggle message to iframe');
    e.preventDefault();
    e.stopPropagation();
    
    // Send message to iframe to toggle the chat
    if (iframe.contentWindow) {
      iframe.contentWindow.postMessage({ type: 'chatbot-widget-toggle' }, chatbotServerOrigin);
    }
  });

  // Add load event listener
  iframe.addEventListener('load', function() {
    console.log('[ChatBot Widget] Iframe loaded successfully');
  });
  
  iframe.addEventListener('error', function(e) {
    console.error('[ChatBot Widget] Iframe error:', e);
  });

  // Listen for messages from the iframe to resize it
  window.addEventListener('message', function(event) {
    if (event.origin !== chatbotServerOrigin) {
      return;
    }

    const data = event.data;
    if (data && data.type === 'chatbot-widget-resize') {
      console.log('[ChatBot Widget] Received resize message:', data);
      isWidgetOpen = data.isOpen;
      
      if (data.isOpen) {
        // Expanded: Full chat window size - hide click catcher so user can interact with chat
        // Make responsive: use min of 450px or viewport width minus padding
        const maxWidth = Math.min(450, window.innerWidth - 16);
        const maxHeight = Math.min(720, window.innerHeight - 16);
        iframe.style.width = maxWidth + 'px';
        iframe.style.height = maxHeight + 'px';
        iframe.style.maxWidth = 'calc(100vw - 16px)';
        iframe.style.maxHeight = 'calc(100vh - 16px)';
        clickCatcher.style.display = 'none';
        console.log('[ChatBot Widget] Expanded to size:', maxWidth + 'x' + maxHeight);
      } else {
        // Collapsed: Small area for just the launcher button
        iframe.style.width = '80px';
        iframe.style.height = '80px';
        clickCatcher.style.display = 'block';
        clickCatcher.style.width = '80px';
        clickCatcher.style.height = '80px';
        console.log('[ChatBot Widget] Collapsed to launcher size');
      }
    }
  });
  
  document.body.appendChild(iframe);
  document.body.appendChild(clickCatcher);
  console.log('[ChatBot Widget] Iframe and click catcher appended to body');
  
  // Handle window resize while widget is open
  window.addEventListener('resize', function() {
    if (isWidgetOpen) {
      const maxWidth = Math.min(450, window.innerWidth - 16);
      const maxHeight = Math.min(720, window.innerHeight - 16);
      iframe.style.width = maxWidth + 'px';
      iframe.style.height = maxHeight + 'px';
    }
  });
})();
