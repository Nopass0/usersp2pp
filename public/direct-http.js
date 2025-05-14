// Direct HTTP service for making requests to the API server
// This script can be loaded directly in the HTML head to avoid CORS issues

(function() {
  // Create a global namespace for our HTTP utility
  window.DirectHTTP = {
    // Base URL for API calls
    baseUrl: 'http://95.163.152.102:8000',

    // API key for authentication
    apiKey: 'ob5QCRUUuz9HhoB1Yj9FEsm1Hb03U4tct71rgGcnVNE',

    // Set API key
    setApiKey: function(key) {
      this.apiKey = key;
    },

    // Flag to track if we should use proxy
    useProxy: false,

    // Get the effective URL based on whether we need to use the proxy
    getEffectiveUrl: function(path) {
      if (this.useProxy) {
        // Use the Next.js API proxy
        return '/api/proxy' + path;
      } else {
        return this.baseUrl + path;
      }
    },

    // Get recent messages
    getRecentMessages: function(hours, callback) {
      const self = this;
      const xhr = new XMLHttpRequest();
      const path = '/messages/recent?hours=' + (hours || 3);
      xhr.open('GET', this.getEffectiveUrl(path), true);
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
        console.error('Direct request failed, trying proxy...');
        if (!self.useProxy) {
          // If direct request failed, try using the proxy
          self.useProxy = true;
          self.getRecentMessages(hours, callback);
        } else {
          callback({ error: 'Network error (both direct and proxy failed)' });
        }
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
    // Play PC beep when new messages arrive
    window.addEventListener('directhttp:new-messages', function(e) {
      if (e.detail.messages && e.detail.messages.length > 0) {
        // Play system beep
        console.log('\u0007'); // ASCII BEL character
        
        // Also try to play an audio beep
        try {
          const audio = new Audio("data:audio/wav;base64,//uQRAAAAWMSLwUIYAAsYkXgoQwAEaYLWfkWgAI0wWs/ItAAAGDgYtAgAyN+QWaAAihwMWm4G8QQRDiMcCBcH3Cc+CDv/7xA4Tvh9Rz/y8QADBwMWgQAZG/ILNAARQ4GLTcDeIIIhxGOBAuD7hOfBB3/94gcJ3w+o5/5eIAIAAAVwWgQAVQ2ORaIQwEMAJiDg95G4nQL7mQVWI6GwRcfsZAcsKkJvxgxEjzFUgfHoSQ9Qq7KNwqHwuB13MA4a1q/DmBrHgPcmjiGoh//EwC5nGPEmS4RcfkVKOhJf+WOgoxJclFz3kgn//dBA+ya1GhurNn8zb//9NNutNuhz31f////9vt///z+IdAEAAAK4LQIAKobHItEIYCGAExBwe8jcToF9zIKrEdDYIuP2MgOWFSE34wYiR5iqQPj0JIeoVdlG4VD4XA67mAcNa1fhzA1jwHuTRxDUQ//iYBczjHiTJcIuPyKlHQkv/LHQUYkuSi57yQT//uggfZNajQ3Vmz+Zt//+mm3Wm3Q576v////+32///5/EOgAAADVghQAAAAA==");
          audio.volume = 0.5;
          audio.play();
        } catch (e) {
          // Ignore errors - the console.log beep should still work
        }
      }
    });
    
    // Start polling every 5 seconds
    window.DirectHTTP.startPolling(5000);
  });
})();