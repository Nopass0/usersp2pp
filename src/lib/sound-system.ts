// Advanced sound system for loud, reliable notification sounds
// This system uses multiple approaches to ensure sound plays in all browsers

// Global audio elements for better browser compatibility
const notificationAudios: HTMLAudioElement[] = [];
let audioContext: AudioContext | null = null;
let hasUserInteracted = false;

// Initialize the audio system - call this on app startup
export function initSoundSystem() {
  if (typeof window === 'undefined') return;
  
  try {
    // Create audio context for Web Audio API
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Pre-create multiple audio elements for more reliable playback
    for (let i = 0; i < 3; i++) {
      const audio = document.createElement('audio');
      audio.src = "/sounds/notification.mp3";
      audio.volume = 1.0;
      audio.preload = "auto";
      audio.id = `notification-audio-${i}`;
      
      // Make them play as soon as possible
      audio.setAttribute('playsinline', '');
      audio.setAttribute('muted', '');
      audio.muted = false; // Unmute after adding attribute

      // Add to DOM to improve browser support
      if (document.body) {
        document.body.appendChild(audio);
        notificationAudios.push(audio);
        
        // Force load the audio
        audio.load();
        
        // Try an initial silent play to get permission (will likely fail but worth trying)
        const originalVolume = audio.volume;
        audio.volume = 0;
        audio.play().catch(() => {}).finally(() => {
          audio.volume = originalVolume;
        });
      }
    }
    
    console.log("Emergency sound system initialized with", notificationAudios.length, "audio elements");
    
    // Create a visible button in the corner to enable sound
    createSoundEnableButton();
    
    // Add user interaction listeners
    setupUserInteractionListeners();
  } catch (error) {
    console.error("Error initializing emergency sound system:", error);
  }
}

// Create a button that enables sound when clicked
function createSoundEnableButton() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (!document.body) return;
  
  // Check if button already exists
  if (document.getElementById('enable-sound-button')) return;
  
  const button = document.createElement('button');
  button.id = 'enable-sound-button';
  button.textContent = '🔊 ВКЛЮЧИТЬ СИРЕНУ';
  button.style.position = 'fixed';
  button.style.bottom = '10px';
  button.style.right = '10px';
  button.style.zIndex = '9999';
  button.style.padding = '8px 16px';
  button.style.backgroundColor = '#ff3e00';
  button.style.color = 'white';
  button.style.border = 'none';
  button.style.borderRadius = '4px';
  button.style.cursor = 'pointer';
  button.style.fontWeight = 'bold';
  
  button.onclick = () => {
    // User interaction - try to play all sounds
    notificationAudios.forEach(audio => {
      audio.muted = false;
      audio.play().catch(() => {}).finally(() => {
        audio.pause();
        audio.currentTime = 0;
      });
    });
    
    // Also try to resume audio context
    if (audioContext?.state === 'suspended') {
      audioContext.resume();
    }
    
    hasUserInteracted = true;
    button.textContent = '✅ СИРЕНА ВКЛЮЧЕНА';
    setTimeout(() => {
      button.style.display = 'none';
    }, 3000);
    
    // Test sound
    playEmergencySiren();
  };
  
  document.body.appendChild(button);
}

// Set up listeners for user interaction
function setupUserInteractionListeners() {
  if (typeof window === 'undefined') return;
  
  const interactionEvents = ['click', 'touchstart', 'keydown'];
  
  const handleUserInteraction = () => {
    hasUserInteracted = true;
    
    // Try to resume audio context
    if (audioContext?.state === 'suspended') {
      audioContext.resume();
    }
    
    // Remove event listeners once user has interacted
    interactionEvents.forEach(event => 
      window.removeEventListener(event, handleUserInteraction));
      
    // Hide the button after interaction
    const button = document.getElementById('enable-sound-button');
    if (button) {
      button.style.display = 'none';
    }
  };
  
  // Add event listeners for user interaction
  interactionEvents.forEach(event => 
    window.addEventListener(event, handleUserInteraction));
}

// Play emergency siren with maximum volume
export function playEmergencySiren() {
  try {
    // Try using pre-created audio elements
    playSoundWithMultipleAudioElements();
    
    // Also try Web Audio API approach
    playSoundWithAudioContext();
    
    // And inline audio as a fallback
    playSoundWithInlineAudio();
    
    // Use PC beep as final fallback
    playPcBeep();
  } catch (error) {
    console.error("Error playing emergency siren:", error);
  }
}

// Multiple audio elements approach
function playSoundWithMultipleAudioElements() {
  // First try the pre-created elements
  notificationAudios.forEach((audio, index) => {
    setTimeout(() => {
      if (audio) {
        // Reset to beginning to ensure it plays
        audio.currentTime = 0;
        
        // Ensure maximum volume
        audio.volume = 1.0;
        audio.muted = false;
        
        // Play with error handling
        audio.play().catch(() => {});
      }
    }, index * 50); // Stagger slightly
  });
  
  // Also try the traditional approach as fallback
  try {
    const audio = new Audio("/sounds/notification.mp3");
    audio.volume = 1.0;
    audio.play().catch(() => {});
  } catch (e) {
    // Ignore and try other methods
  }
}

// Web Audio API approach
function playSoundWithAudioContext() {
  if (!audioContext) return;
  
  try {
    // Create multiple oscillators for louder effect
    for (let i = 0; i < 3; i++) {
      // Create and configure oscillator
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      // Use different waveforms for harsher sound
      oscillator.type = i === 0 ? 'sawtooth' : (i === 1 ? 'square' : 'triangle');
      oscillator.frequency.value = 1500 + (i * 200); // Different frequencies
      
      gainNode.gain.value = 0.7; // High volume
      
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
  } catch (error) {
    // Silent fail, try other methods
  }
}

// Inline Audio approach with data URI
function playSoundWithInlineAudio() {
  try {
    // Try with a data URI approach (works in most browsers)
    const audio = new Audio("data:audio/wav;base64,//uQRAAAAWMSLwUIYAAsYkXgoQwAEaYLWfkWgAI0wWs/ItAAAGDgYtAgAyN+QWaAAihwMWm4G8QQRDiMcCBcH3Cc+CDv/7xA4Tvh9Rz/y8QADBwMWgQAZG/ILNAARQ4GLTcDeIIIhxGOBAuD7hOfBB3/94gcJ3w+o5/5eIAIAAAVwWgQAVQ2ORaIQwEMAJiDg95G4nQL7mQVWI6GwRcfsZAcsKkJvxgxEjzFUgfHoSQ9Qq7KNwqHwuB13MA4a1q/DmBrHgPcmjiGoh//EwC5nGPEmS4RcfkVKOhJf+WOgoxJclFz3kgn//dBA+ya1GhurNn8zb//9NNutNuhz31f////9vt///z+IdAEAAAK4LQIAKobHItEIYCGAExBwe8jcToF9zIKrEdDYIuP2MgOWFSE34wYiR5iqQPj0JIeoVdlG4VD4XA67mAcNa1fhzA1jwHuTRxDUQ//iYBczjHiTJcIuPyKlHQkv/LHQUYkuSi57yQT//uggfZNajQ3Vmz+Zt//+mm3Wm3Q576v////+32///5/EOgAAADVghQAAAAA==");
    audio.volume = 1.0;
    audio.play().catch(() => {});
  } catch (e) {
    // Silent fallback
  }
}

// Function to play PC beep using the motherboard speaker
function playPcBeep() {
  if (typeof window === 'undefined') return;
  
  // Try BEL character method (works in terminal emulators)
  try {
    // Try directly first - this is the most reliable for system beep
    console.log('\u0007'); // BEL character (ASCII 7)
  } catch (e) {
    // Silent fallback
  }
  
  // Create multiple loud siren beeps for emergency alerting
  for (let i = 0; i < 6; i++) {
    setTimeout(() => {
      try {
        // Try to use console.log approach with special character
        console.log('\u0007'); // BEL character (ASCII 7)
      } catch (e) {
        // Silent fallback
      }
    }, i * 300); // Space out the beeps
  }
}