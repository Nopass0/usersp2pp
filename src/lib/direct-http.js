// Direct HTTP service for making requests to the API server
// This script can be loaded directly in the HTML head to avoid CORS issues

(function() {
  // Create a global namespace for our HTTP utility
  window.DirectHTTP = {
    // Base URL for API calls - must be set via environment variable
    baseUrl: '',

    // API key for authentication - must be set via environment variable
    apiKey: '',
    
    // Set API key
    setApiKey: function(key) {
      this.apiKey = key;
    },
    
    // Get recent messages
    getRecentMessages: function(hours, callback) {
      const xhr = new XMLHttpRequest();
      // Always use server-side proxy to avoid mixed content issues
      xhr.open('GET', '/api/proxy/messages/recent?hours=' + (hours || 3), true);
      xhr.setRequestHeader('X-API-Key', this.apiKey);
      xhr.setRequestHeader('Accept', 'application/json');
      
      xhr.onload = function() {
        if (xhr.status >= 200 && xhr.status < 300) {
          let response;
          try {
            response = JSON.parse(xhr.responseText);
          } catch(e) {
            callback({ error: 'Failed to parse response' });
            return;
          }
          callback(null, response);
        } else {
          callback({ error: 'Request failed with status ' + xhr.status });
        }
      };
      
      xhr.onerror = function() {
        callback({ error: 'Network error' });
      };
      
      xhr.send();
    },
    
    // Trigger custom event when new messages are received
    triggerNewMessageEvent: function(messages) {
      const event = new CustomEvent('directhttp:new-messages', { 
        detail: { messages } 
      });
      window.dispatchEvent(event);
    },
    
    // Start polling for messages
    startPolling: function(intervalMs) {
      if (this._pollingInterval) {
        clearInterval(this._pollingInterval);
      }
      
      // Initial fetch
      this.getRecentMessages(3, (err, data) => {
        if (!err && data && data.messages) {
          this.triggerNewMessageEvent(data.messages);
        }
      });
      
      // Set up polling
      this._pollingInterval = setInterval(() => {
        this.getRecentMessages(1, (err, data) => {
          if (!err && data && data.messages) {
            this.triggerNewMessageEvent(data.messages);
          }
        });
      }, intervalMs || 5000);
    },
    
    // Stop polling
    stopPolling: function() {
      if (this._pollingInterval) {
        clearInterval(this._pollingInterval);
        this._pollingInterval = null;
      }
    }
  };
  
  // Auto-initialize polling when the page loads
  document.addEventListener('DOMContentLoaded', function() {
    // Try to get API config from meta tags or data attributes
    try {
      const apiKeyMeta = document.querySelector('meta[name="telegram-api-key"]');
      const apiUrlMeta = document.querySelector('meta[name="telegram-api-url"]');

      if (apiKeyMeta && apiKeyMeta.content) {
        window.DirectHTTP.apiKey = apiKeyMeta.content;
      }

      if (apiUrlMeta && apiUrlMeta.content) {
        window.DirectHTTP.baseUrl = apiUrlMeta.content;
      }

      // Check if values are in the global window object
      if (window.TELEGRAM_API_KEY) {
        window.DirectHTTP.apiKey = window.TELEGRAM_API_KEY;
      }

      if (window.TELEGRAM_API_URL) {
        window.DirectHTTP.baseUrl = window.TELEGRAM_API_URL;
      }
    } catch (e) {
      console.error('Error initializing API config:', e);
    }

    // Debug mixed content issues
    console.log('DirectHTTP initializing...');
    console.log('Page protocol:', window.location.protocol);
    console.log('Target API URL:', window.DirectHTTP.baseUrl || 'Not configured');
    console.log('Using proxy at: /api/proxy');
    
    // Check if we're on HTTPS and trying to access HTTP
    if (window.location.protocol === 'https:' && window.DirectHTTP.baseUrl.startsWith('http:')) {
      console.warn('⚠️ Mixed content warning: Accessing HTTP resource from HTTPS page');
      console.log('Solutions in place:');
      console.log('1. Content-Security-Policy headers in next.config.js');
      console.log('2. Meta tag in layout.tsx');
      console.log('3. Fallback proxy mechanism');
    }
    
    // Play PC beep when new messages arrive
    window.addEventListener('directhttp:new-messages', function(e) {
      if (e.detail.messages && e.detail.messages.length > 0) {
        console.log('Received new messages:', e.detail.messages.length);
        
        // Play system beep
        console.log('\u0007'); // ASCII BEL character
        
        // Also try to play an audio beep
        try {
          const audio = new Audio("data:audio/wav;base64,//uQRAAAAWMSLwUIYAAsYkXgoQwAEaYLWfkWgAI0wWs/ItAAAGDgYtAgAyN+QWaAAihwMWm4G8QQRDiMcCBcH3Cc+CDv/7xA4Tvh9Rz/y8QADBwMWgQAZG/ILNAARQ4GLTcDeIIIhxGOBAuD7hOfBB3/94gcJ3w+o5/5eIAIAAAVwWgQAVQ2ORaIQwEMAJiDg95G4nQL7mQVWI6GwRcfsZAcsKkJvxgxEjzFUgfHoSQ9Qq7KNwqHwuB13MA4a1q/DmBrHgPcmjiGoh//EwC5nGPEmS4RcfkVKOhJf+WOgoxJclFz3kgn//dBA+ya1GhurNn8zb//9NNutNuhz31f////9vt///z+IdAEAAAK4LQIAKobHItEIYCGAExBwe8jcToF9zIKrEdDYIuP2MgOWFSE34wYiR5iqQPj0JIeoVdlG4VD4XA67mAcNa1fhzA1jwHuTRxDUQ//iYBczjHiTJcIuPyKlHQkv/LHQUYkuSi57yQT//uggfZNajQ3Vmz+Zt//+mm3Wm3Q576v////+32///5/EOgAAADVghQAAAAA==");
          audio.volume = 0.5;
          audio.play();
        } catch (e) {
          // Ignore errors - the console.log beep should still work
          console.warn('Audio play error:', e);
        }
      }
    });
    
    // Test connection to API via proxy
    fetch('/api/proxy/ping', {
      method: 'GET',
      headers: {
        'X-API-Key': window.DirectHTTP.apiKey
      }
    })
    .then(() => {
      console.log('✅ Proxy connection test successful');
    })
    .catch(err => {
      console.warn('❌ Proxy connection test failed:', err.message);
    });
    
    // Start polling every 5 seconds
    console.log('Starting polling...');
    window.DirectHTTP.startPolling(5000);
  });
})();