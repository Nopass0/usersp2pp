// Emergency siren sound player that works independent of any notification system
// This script plays a LOUD SIREN sound for critical alerts

(function() {
  // Emergency siren functionality
  function playEmergencySiren() {
    console.log("PLAYING EMERGENCY SIREN");
    
    // Try multiple methods to ensure siren plays on any browser
    
    // 1. Console bell character (for system beep)
    for (let i = 0; i < 5; i++) {
      setTimeout(() => console.log('\u0007'), i * 200);
    }
    
    // 2. Play notification sound using regular audio element
    try {
      // Try the main notification sound file directly
      const audio = new Audio("/sounds/notification.mp3");
      audio.volume = 1.0; // Maximum volume
      audio.play().catch(e => console.log("Direct audio play failed, trying alternatives"));
      
      // Play multiple instances for louder effect
      setTimeout(() => {
        const audio2 = new Audio("/sounds/notification.mp3");
        audio2.volume = 1.0;
        audio2.play().catch(() => {});
      }, 100);
      
      setTimeout(() => {
        const audio3 = new Audio("/sounds/notification.mp3");
        audio3.volume = 1.0;
        audio3.play().catch(() => {});
      }, 200);
    } catch (e) {
      console.log("Audio playback error:", e);
    }
    
    // 3. Try to use Web Audio API for a siren sound
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      
      // Create multiple oscillators for louder effect
      for (let i = 0; i < 3; i++) {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        // Use different waveforms for harsher sound
        oscillator.type = i === 0 ? 'sawtooth' : (i === 1 ? 'square' : 'triangle');
        oscillator.frequency.value = 1500 + (i * 200); // Different frequencies
        
        gainNode.gain.value = 0.5; // High volume
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        // Play a siren pattern
        oscillator.start();
        
        // Sweep frequency for siren effect
        let direction = 1;
        let frequency = 1500 + (i * 200);
        
        const sweepInterval = setInterval(() => {
          frequency += direction * 100;
          if (frequency > 2000) direction = -1;
          if (frequency < 800) direction = 1;
          oscillator.frequency.value = frequency;
        }, 40 + (i * 10));
        
        // Stop after 2 seconds
        setTimeout(() => {
          clearInterval(sweepInterval);
          oscillator.stop();
        }, 2000);
      }
    } catch (e) {
      console.log("Web Audio API error:", e);
    }
  }
  
  // Siren setup function without visible UI button
  function setupEmergencySiren() {
    // Set up keyboard listener for hidden developer shortcut
    document.addEventListener('keydown', function(event) {
      // Play siren only with special key combination (Ctrl+Alt+S)
      if (event.ctrlKey && event.altKey && event.key === 's') {
        console.log("Developer emergency siren shortcut activated");
        playEmergencySiren();
      }
    });
    
    // Preload the notification sound for faster playback
    const preloadAudio = new Audio("/sounds/notification.mp3");
    preloadAudio.preload = "auto";
    preloadAudio.volume = 0; // Silent preload
    preloadAudio.load();
    
    // Setup browser notification permission request
    if ('Notification' in window) {
      // Request permission on page load
      document.addEventListener('DOMContentLoaded', function() {
        if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
          setTimeout(function() {
            Notification.requestPermission();
          }, 5000); // Wait 5 seconds before asking
        }
      });
    }
  }
  
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
    
    // Setup emergency siren (without visible UI)
    setupEmergencySiren();
    
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