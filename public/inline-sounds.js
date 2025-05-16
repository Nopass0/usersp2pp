// Inline emergency sounds to guarantee playback
// This uses base64 encoded sounds that don't rely on external files

(function() {
  // Very short emergency siren sound (base64 encoded)
  const INLINE_SIREN = 'data:audio/mpeg;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tQwAAAAAAAAAAAAAAAAAAAAAAASW5mbwAAAA8AAAAsAABNnAAODhgYISEhKjMzMzw8PEVPT09YWGFhYWpqanNzc3x8fISMjIyVlZ6enqenpq+vr7i4uMHBwcrS0tLb2+Tk5O3t7fb///8AAAAATGF2YzU4LjEzAAAAAAAAAAAAAAAAJAAAAAAAAAAAAE2cKw5hJwAA//tQxAADwotWWUlFHMBQrHsZMLSYHXZLGCQY2FNoZFoRTdh4kCJBhBXCDoJd9GFlbq5XizUVmZiYmDVdFxcXFxcAAAAAAAB+bEDpwWLnZMbU/6G3///4W4iqsxoWWVEWqqouhwTuHAAAAVkBKF3uCAYDD0BgMBqVLaAAAB8AYkOAAHgCdQhkTQVi7FhRlX5vgPfAgkSxf/E9wCAEG7EkGPw6DWbfYxLArVkLV0pzXp7G1PQ1IQwqE8uJzxJYBdgqj9RkgpKMtfOiE5oWMkSZAyZCkqPz+kR6HgsmkQhyVkqJDIAMWCQEJqRuVkrV3AAAAUYiOo+qoxiMqASMQ+HwjA3Kaw4W7JYyLGxo2Mjxwt3YyJGC3p//9C4vFYuLcXFcXF4vFc48XF4uKwcXiwWCucBYOLxYLBYOLBYLBYsF/iwWCwWCwf/FYsF/////+LBYLBcWCwAAAACLRaLRaLRQA=';
  const INLINE_SIREN2 = 'data:audio/mpeg;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tQwAAAAAAAAAAAAAAAAAAAAAAASW5mbwAAAA8AAAAvAABiHQAPDxgYGiIiIiQtLS01NTU3Pz8/QkJLSktLVFRUXFxeXl5nZ2dvb3h4eICAgIiIiJGRkZmZmZubpKSkrKysrrW1tb29vb/Hx8fJycnL09PT29vb3eTk5O3t7+/v+Pj4//8AAAAATGF2YzU4LjEzAAAAAAAAAAAAAAAAJAAAAAAAAAAAAGIdMBQvRgAA//tQxAAD0i9aW9lJLqDQfBk48aS4qJtAEDKDFDGRgxApgsBv7m79zmRLdVw8mBCJiICLd0XgpgwDwTm0LEhY+X//6M9bJMTL//z1+PmCCYJj9D//iAQh//////wQTH//+3IAkAAAAAGZzNmczNgGAKyAAAAAGEHLMIvJghgCsgAAAABLtdnZLON0AKyAAAAACFywYoiBxWXLoAVkAALJkCdlgTAI7qogGBqCiYjaNQHEIMmKv/cZgagwgRAYmw2DIwJQJL3kOwPDgGG9NqRjQpOEFTIYMoN0GcHRG5DJTUvHBaWZY4EYAOi8kmQsRCY2GIsYAwLCopKy1NygxDTZOQHQ8OixEMSkqLxeVDsMGYUNRqNDsvL0ExOR8NjMakZwlHAkSFAnEZefjIqLjMgLM7NR2eiBD/+eREdcuuXLri9cuuXVldXLrl1y65dXVldXXLq6urq6wiqursBFVVBFVVBFVVVVCKqqqpFX/Oqv7qruqququ7q7urururu+6qv/+//u7//8AAA=';
  
  // Longer siren for better alerting
  const INLINE_LONG_SIREN = 'data:audio/mpeg;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tQwAAAAAAAAAAAAAAAAAAAAAAASW5mbwAAAA8AAABBAABqwAACAgwMDBYWFhYgICAqKioqNDQ0NDo6Ojw8PDxHR0dRUVFRW1tbZWVlZW9vb3l5eXmDg4ONjY2Nl5eXoaGhoaurq7W1tbW/v7/JycnJ09PT3d3d3efn5/Hx8fP7+/v7+/v+/v7+//8AAAAATGF2YzU4LjEzAAAAAAAAAAAAAAAAJAAAAAAAAAAAAGrAuBK9kAAA//tQxAADwbdWUUIYGgCEJsroQI2ZiOFVnuUCGiEymgMYRglEjpJUPf/4rTI3a7ldcoiBsF27EBUEvO9S+bwrC3AeTgw0//kEQT///////BMP//9TcwfB8BAjRKkBomAVEIRpAHgQJUSlAASBQA8EM8iJIFzM4VTM4CAA8AAAABWQAHgQAAgHkRJEVdmcJpmcI7IADwIAAQCsgDwIAHgQI0SpAaJgFRCEaQB4ECVEpQAEgUAPBDPIiSBczOFUzOAgAPAAAAFZAHgQAAgHkRJEVdmcJpmcImhZFBoJJg8wQYDYFgEMHDCZCyAsL3HIxxMQPNHR4oCIKjHRyIACMGmVWBQJQwmMFByBw+GIxSBkgmHzEAvIYemIB8VCAgCxieNEEUSBQsYCFM7hOYwOQ8RiMvGqIzBRpn8LUmDpKQzXTIdGMzO9yGMxUbCEXjY/I50GCRmLhUIRaIiiNEQ0OkRomHYTCgvLxqUDY/IQgGwoKw1JQ8YiIXEQwNCkuMRoVlxSJiwhCcJhOLRoWlAVJxEUiEWl4nZYoK5SuU5QVyxgJfEAkoWE5XKCmUFLnFCwXFRYXFxcVFi8uKi4v//4AAAA=';
  
  // Oscillator-based siren that doesn't require audio files
  function createOscillatorSiren() {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      
      // Create multiple oscillators for a richer sound
      for (let i = 0; i < 3; i++) {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        // Different waveforms for each oscillator
        oscillator.type = ['sawtooth', 'square', 'triangle'][i % 3];
        oscillator.frequency.value = 880 + (i * 220); // Different base frequencies
        
        // Set volume
        gainNode.gain.value = 0.4;
        
        // Connect nodes
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        // Start oscillator
        oscillator.start();
        
        // Frequency sweep for siren effect
        let direction = 1;
        let frequency = 880 + (i * 220);
        let sweepInterval;
        
        sweepInterval = setInterval(() => {
          frequency += direction * 50;
          
          if (frequency > 1760) direction = -1;
          if (frequency < 440) direction = 1;
          
          oscillator.frequency.value = frequency;
        }, 30);
        
        // Stop after some time
        setTimeout(() => {
          clearInterval(sweepInterval);
          oscillator.stop();
        }, 3000);
      }
      
      return true;
    } catch (e) {
      console.error("Failed to create oscillator siren:", e);
      return false;
    }
  }

  // Play all inline sounds and methods for maximum effectiveness
  function playEmergencySiren() {
    console.log("EMERGENCY SIREN ACTIVATED");
    
    // Try to play oscillator-based siren
    const oscillatorSuccess = createOscillatorSiren();
    
    // Also try to play embedded audio in case oscillator fails
    try {
      // Try multiple audio elements with different encoded sirens
      const audio1 = new Audio(INLINE_SIREN);
      audio1.volume = 1.0;
      audio1.play().catch(e => console.error("Siren 1 failed:", e));
      
      const audio2 = new Audio(INLINE_SIREN2);
      audio2.volume = 1.0;
      setTimeout(() => audio2.play().catch(e => {}), 150);
      
      const audio3 = new Audio(INLINE_LONG_SIREN);
      audio3.volume = 1.0;
      setTimeout(() => audio3.play().catch(e => {}), 300);
      
      // Also try to play the notification sound file directly
      const audio4 = new Audio("/sounds/notification.mp3");
      audio4.volume = 1.0;
      setTimeout(() => audio4.play().catch(e => {}), 450);
    } catch (e) {
      console.error("Failed to play embedded audio:", e);
    }
    
    // Try system beep as well
    for (let i = 0; i < 5; i++) {
      setTimeout(() => {
        try {
          console.log('\u0007'); // BEL character for system beep
        } catch (e) {}
      }, i * 200);
    }
    
    // If browser supports notifications, also show one to request permission
    if ('Notification' in window && Notification.permission !== 'granted') {
      Notification.requestPermission();
    }
    
    // Flash the screen red for visual alert
    flashScreen();
  }
  
  // Flash the screen red for visual notification
  function flashScreen() {
    const flashOverlay = document.createElement('div');
    flashOverlay.style.position = 'fixed';
    flashOverlay.style.top = '0';
    flashOverlay.style.left = '0';
    flashOverlay.style.width = '100%';
    flashOverlay.style.height = '100%';
    flashOverlay.style.backgroundColor = 'rgba(255, 0, 0, 0.5)';
    flashOverlay.style.zIndex = '9998';
    flashOverlay.style.transition = 'opacity 0.5s';
    flashOverlay.style.pointerEvents = 'none';
    
    document.body.appendChild(flashOverlay);
    
    // Flash several times
    let flashCount = 0;
    const flashInterval = setInterval(() => {
      flashOverlay.style.opacity = flashOverlay.style.opacity === '0' ? '1' : '0';
      flashCount++;
      
      if (flashCount > 10) {
        clearInterval(flashInterval);
        document.body.removeChild(flashOverlay);
      }
    }, 250);
  }
  
  // Function to create a siren button is removed
  
  // Try to unlock audio playback on various user interactions
  function setupAudioUnlocker() {
    const events = ['click', 'touchstart', 'touchend', 'mousedown', 'keydown'];
    const unlockAudio = function() {
      // Create and play a silent audio to unlock audio playback
      const silentAudio = new Audio("data:audio/mp3;base64,SUQzBAAAAAABEVRYWFgAAAAtAAADY29tbWVudABCaWdTb3VuZEJhbmsuY29tIC8gTGFTb25vdGhlcXVlLm9yZwBURU5DAAAAHQAAA1N3aXRjaCBQbHVzIMKpIE5DSCBTb2Z0d2FyZQBUSVQyAAAABgAAAzIyMzUAVFNTRQAAAA8AAANMYXZmNTcuODMuMTAwAAAAAAAAAAAAAAD/80DEAAAAA0gAAAAATEFNRTMuMTAwVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/zQsRbAAADSAAAAABVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/zQMSkAAADSAAAAABVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV");
      silentAudio.play().catch(e => {});
      
      // Also try to resume AudioContext if it exists
      if (window.audioContext && window.audioContext.state === 'suspended') {
        window.audioContext.resume();
      }
      
      // Remove this event listener after first interaction
      events.forEach(e => document.removeEventListener(e, unlockAudio));
    };
    
    // Add event listeners
    events.forEach(e => document.addEventListener(e, unlockAudio));
  }
  
  // Initialize when document is ready
  function init() {
    // Create global audio context for the page to use
    try {
      window.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      console.error("AudioContext not supported");
    }

    // Setup audio unlocker
    setupAudioUnlocker();

    // Export functions to global scope for other scripts to use
    window.playEmergencySiren = playEmergencySiren;
  }
  
  // Initialize when page is loaded
  if (document.readyState === 'complete') {
    init();
  } else {
    window.addEventListener('load', init);
  }
})();