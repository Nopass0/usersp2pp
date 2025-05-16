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

  // Siren scheduling and setup
  function setupEmergencySiren() {
    // Play siren test when the page loads (for debugging)
    // Uncomment to test on page load:
    // setTimeout(() => {
    //   playEmergencySiren();
    // }, 2000);

    // Set up keyboard listener to play siren on certain keys
    document.addEventListener('keydown', function(event) {
      // Play siren on Escape key
      if (event.key === 'Escape') {
        playEmergencySiren();
      }
    });

    // Create emergency button for all pages
    const sirenButton = document.createElement('div');
    sirenButton.innerHTML = '🚨';
    sirenButton.style.position = 'fixed';
    sirenButton.style.bottom = '20px';
    sirenButton.style.right = '20px';
    sirenButton.style.backgroundColor = 'red';
    sirenButton.style.color = 'white';
    sirenButton.style.padding = '10px';
    sirenButton.style.borderRadius = '50%';
    sirenButton.style.cursor = 'pointer';
    sirenButton.style.zIndex = '9999';
    sirenButton.style.width = '50px';
    sirenButton.style.height = '50px';
    sirenButton.style.display = 'flex';
    sirenButton.style.alignItems = 'center';
    sirenButton.style.justifyContent = 'center';
    sirenButton.style.fontSize = '24px';
    sirenButton.style.boxShadow = '0 0 10px rgba(255, 0, 0, 0.7)';
    sirenButton.title = 'СИРЕНА ТРЕВОГИ';

    // Add click handler to manually trigger siren
    sirenButton.addEventListener('click', function() {
      playEmergencySiren();
    });

    // Add to document after it's loaded
    document.addEventListener('DOMContentLoaded', function() {
      if (document.body) {
        document.body.appendChild(sirenButton);
      }
    });

    // If already loaded, add it now
    if (document.body) {
      document.body.appendChild(sirenButton);
    }

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

  // Initialize emergency siren system
  setupEmergencySiren();
})();