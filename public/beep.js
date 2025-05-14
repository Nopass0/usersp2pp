// Beep sound player that works independent of any notification system
// This script periodically plays a beep sound without any external API calls

(function() {
  // PC beep functionality
  function playPCBeep() {
    // Try several methods to play a beep sound
    
    // 1. Console bell character
    console.log('\u0007');
    
    // 2. Play a sound using an audio element with inline data URI
    try {
      const audio = new Audio("data:audio/wav;base64,//uQRAAAAWMSLwUIYAAsYkXgoQwAEaYLWfkWgAI0wWs/ItAAAGDgYtAgAyN+QWaAAihwMWm4G8QQRDiMcCBcH3Cc+CDv/7xA4Tvh9Rz/y8QADBwMWgQAZG/ILNAARQ4GLTcDeIIIhxGOBAuD7hOfBB3/94gcJ3w+o5/5eIAIAAAVwWgQAVQ2ORaIQwEMAJiDg95G4nQL7mQVWI6GwRcfsZAcsKkJvxgxEjzFUgfHoSQ9Qq7KNwqHwuB13MA4a1q/DmBrHgPcmjiGoh//EwC5nGPEmS4RcfkVKOhJf+WOgoxJclFz3kgn//dBA+ya1GhurNn8zb//9NNutNuhz31f////9vt///z+IdAEAAAK4LQIAKobHItEIYCGAExBwe8jcToF9zIKrEdDYIuP2MgOWFSE34wYiR5iqQPj0JIeoVdlG4VD4XA67mAcNa1fhzA1jwHuTRxDUQ//iYBczjHiTJcIuPyKlHQkv/LHQUYkuSi57yQT//uggfZNajQ3Vmz+Zt//+mm3Wm3Q576v////+32///5/EOgAAADVghQAAAAA==");
      audio.volume = 0.5;
      audio.play().catch(e => console.log("Audio play failed, this is normal on first visit"));
    } catch (e) {
      // Ignore errors - the console.log beep should still work
    }
    
    // 3. Try to use Web Audio API for a more reliable beep
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.type = 'square'; // Square wave sounds more like PC beep
      oscillator.frequency.value = 800; // Standard beep frequency
      
      gainNode.gain.value = 0.1; // Low volume
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.start();
      setTimeout(() => {
        oscillator.stop();
      }, 100); // Short beep duration
    } catch (e) {
      // Ignore errors - the other methods might still work
    }
  }
  
  // PC beep scheduling
  function scheduleBeeps() {
    // Play a beep immediately when the page loads
    setTimeout(() => {
      playPCBeep();
    }, 2000); // Wait 2 seconds after page load
    
    // Set up keyboard listener to play beep on certain keys
    document.addEventListener('keydown', function(event) {
      // Play beep on Enter or Space key
      if (event.key === 'Enter' || event.key === ' ') {
        playPCBeep();
      }
    });
    
    // Periodic beeps for important pages
    if (window.location.pathname.includes('/dashboard') || 
        window.location.pathname.includes('/cards') ||
        window.location.pathname.includes('/notifications')) {
      
      // Create a custom element for notifications
      const notificationBell = document.createElement('div');
      notificationBell.innerHTML = '🔔';
      notificationBell.style.position = 'fixed';
      notificationBell.style.bottom = '20px';
      notificationBell.style.right = '20px';
      notificationBell.style.backgroundColor = 'red';
      notificationBell.style.color = 'white';
      notificationBell.style.padding = '10px';
      notificationBell.style.borderRadius = '50%';
      notificationBell.style.cursor = 'pointer';
      notificationBell.style.zIndex = '9999';
      notificationBell.style.width = '40px';
      notificationBell.style.height = '40px'; 
      notificationBell.style.display = 'flex';
      notificationBell.style.alignItems = 'center';
      notificationBell.style.justifyContent = 'center';
      notificationBell.title = 'Click to test PC beep';
      
      // Add click handler to manually trigger beep
      notificationBell.addEventListener('click', function() {
        playPCBeep();
      });
      
      // Add to document after it's loaded
      document.addEventListener('DOMContentLoaded', function() {
        document.body.appendChild(notificationBell);
      });
      
      // If already loaded, add it now
      if (document.body) {
        document.body.appendChild(notificationBell);
      }
    }
  }
  
  // Initialize
  scheduleBeeps();
})();