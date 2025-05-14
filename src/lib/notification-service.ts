import { create } from "zustand";
import { persist } from "zustand/middleware";

// Define types for Cabinet Message from API
export interface CabinetMessage {
  chat_id: number;
  chat_name: string;
  cabinet_name: string;
  cabinet_id: string;
  message: string;
  timestamp: number;
  message_id: string | number; // Can be string or number
}

// Global event to trigger notification display
const AUTO_DISPLAY_EVENT = "notification:new-message";

// Function to trigger notification display
export function triggerNotificationDisplay() {
  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(new CustomEvent(AUTO_DISPLAY_EVENT));
    } catch (error) {
      console.error("Error triggering notification display event:", error);
    }
  }
}

// Function to listen for notification display events
export function onNewNotification(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {};

  // Create a wrapper function to handle any errors
  const safeCallback = () => {
    try {
      callback();
    } catch (error) {
      console.error("Error in notification callback:", error);
    }
  };

  window.addEventListener(AUTO_DISPLAY_EVENT, safeCallback);
  return () => window.removeEventListener(AUTO_DISPLAY_EVENT, safeCallback);
}

// Notification store interface
interface NotificationState {
  apiKey: string;
  apiUrl: string;
  polling: boolean;
  pollInterval: number;
  lastChecked: number | null;
  notifications: CabinetMessage[];
  soundEnabled: boolean;
  pcBeepEnabled: boolean; // Added PC beep option
  error: string | null;

  // Actions
  setApiConfig: (apiKey: string, apiUrl: string) => void;
  startPolling: () => void;
  stopPolling: () => void;
  setPollInterval: (interval: number) => void;
  setSoundEnabled: (enabled: boolean) => void;
  setPcBeepEnabled: (enabled: boolean) => void; // Toggle PC beep
  clearNotifications: () => void;
  addNotifications: (notifications: CabinetMessage[]) => void;
  setError: (error: string | null) => void;
}

// Create notification store with persistence
export const useNotificationStore = create<NotificationState>()(
  persist(
    (set, get) => ({
      apiKey: process.env.NEXT_PUBLIC_TELEGRAM_API_KEY || "ob5QCRUUuz9HhoB1Yj9FEsm1Hb03U4tct71rgGcnVNE",
      apiUrl: process.env.NEXT_PUBLIC_TELEGRAM_API_URL || "http://192.168.1.106:8000",
      polling: false,
      pollInterval: 5000, // 5 seconds default
      lastChecked: null,
      notifications: [],
      soundEnabled: true,
      pcBeepEnabled: true, // PC beep enabled by default
      error: null,
      
      setApiConfig: (apiKey, apiUrl) => set({ apiKey, apiUrl, error: null }),
      
      startPolling: () => {
        const state = get();
        if (state.polling) return;
        
        // Validate API configuration before starting
        if (!state.apiKey || !state.apiUrl) {
          set({ 
            error: "API configuration missing. Please configure API key and URL.",
            polling: false
          });
          console.error("Cannot start polling: API configuration missing");
          return;
        }
        
        set({ polling: true, error: null });
        
        // Start polling function
        const pollMessages = async () => {
          if (!get().polling) return;
          
          try {
            await fetchAndProcessMessages();
          } catch (error) {
            console.error("Error polling for messages:", error);
            set({ error: error instanceof Error ? error.message : "Unknown error polling messages" });
          } finally {
            // Schedule next poll
            if (get().polling) {
              setTimeout(pollMessages, get().pollInterval);
            }
          }
        };
        
        // Start initial poll
        pollMessages();
      },
      
      stopPolling: () => set({ polling: false }),
      
      setPollInterval: (interval) => set({ pollInterval: interval }),
      
      setSoundEnabled: (enabled) => set({ soundEnabled: enabled }),

      setPcBeepEnabled: (enabled) => set({ pcBeepEnabled: enabled }),

      clearNotifications: () => set({ notifications: [] }),

      setError: (error) => set({ error }),
      
      addNotifications: (newNotifications) => {
        set((state) => {
          // Filter out duplicates based on message_id (as string for consistency)
          const existingMessageIds = new Set(
            state.notifications.map((n) => n.message_id.toString())
          );

          const filteredNew = newNotifications.filter(
            (n) => !existingMessageIds.has(n.message_id.toString())
          );
          
          // If we have new notifications
          if (filteredNew.length > 0) {
            // Play sound if enabled
            if (state.soundEnabled) {
              playNotificationSound();
            }
            
            // Trigger notification display
            triggerNotificationDisplay();
          }
          
          return {
            notifications: [...filteredNew, ...state.notifications],
            lastChecked: Date.now(),
            error: null,
          };
        });
      },
    }),
    {
      name: "notification-storage",
      partialize: (state) => ({
        apiKey: state.apiKey,
        apiUrl: state.apiUrl,
        pollInterval: state.pollInterval,
        soundEnabled: state.soundEnabled,
        pcBeepEnabled: state.pcBeepEnabled,
        lastChecked: state.lastChecked,
        error: state.error,
      }),
    }
  )
);

// Function to fetch messages from API
export async function fetchAndProcessMessages() {
  const { apiKey, apiUrl, lastChecked, addNotifications, setError } = useNotificationStore.getState();

  if (!apiKey || !apiUrl) {
    const errorMsg = "API configuration missing";
    console.error(errorMsg);
    setError(errorMsg);
    return;
  }

  // Handle missing/improper protocol in URL
  if (!/^https?:\/\//i.test(apiUrl)) {
    const errorMsg = "API URL must include protocol (https:// or http://)";
    console.error(errorMsg);
    setError(errorMsg);
    return;
  }
  
  try {
    // Determine time period for recent messages (use last 3 hours if no lastChecked)
    const hours = lastChecked ? 
      Math.max(1, Math.ceil((Date.now() - lastChecked) / (60 * 60 * 1000))) : 
      3;
    
    // Add a timeout to the fetch request
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    try {
      // Use the proxy URL for HTTP requests
      const useProxy = apiUrl.startsWith('http://');
      const url = useProxy
        ? `/api/proxy/messages/recent?hours=${hours}`
        : `${apiUrl}/messages/recent?hours=${hours}`;

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "accept": "application/json",
          "X-API-Key": apiKey
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch messages: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.messages && Array.isArray(data.messages) && data.messages.length > 0) {
        addNotifications(data.messages);
        
        // Save to database via API endpoint
        await saveMessagesToDatabase(data.messages);
      }
      
      // Clear any previous errors on successful fetch
      setError(null);
    } catch (fetchError) {
      if (fetchError.name === 'AbortError') {
        throw new Error('API request timed out');
      }
      throw fetchError;
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error fetching messages";
    console.error("Error fetching messages:", errorMsg);
    setError(errorMsg);
    throw error;
  }
}

// Function to save messages to database
async function saveMessagesToDatabase(messages: CabinetMessage[]) {
  try {
    // Call the API endpoint to save messages
    const response = await fetch('/api/notifications/save', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ messages }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error saving messages (${response.status}):`, errorText);
    }
  } catch (error) {
    console.error("Error saving messages to database:", error);
  }
}

// Flag to track if user has interacted with the page
let hasUserInteracted = false;

// Listen for user interaction
if (typeof window !== 'undefined') {
  const interactionEvents = ['click', 'touchstart', 'keydown'];
  const handleUserInteraction = () => {
    hasUserInteracted = true;
    // Remove event listeners once user has interacted
    interactionEvents.forEach(event =>
      window.removeEventListener(event, handleUserInteraction));
  };

  // Add event listeners for user interaction
  interactionEvents.forEach(event =>
    window.addEventListener(event, handleUserInteraction));
}

// Play notification sound
function playNotificationSound() {
  // Only attempt to play sound if user has interacted with the page
  if (!hasUserInteracted && typeof window !== 'undefined') {
    console.log("Notification sound suppressed until user interacts with the page");
    return;
  }

  // Get store state to check settings
  const { soundEnabled, pcBeepEnabled } = useNotificationStore.getState();

  try {
    // First attempt to play the PC beep (motherboard speaker) if enabled
    if (pcBeepEnabled) {
      playPcBeep();
    }

    // Also try to play the audio file through regular speakers if enabled
    if (soundEnabled) {
      const audio = new Audio("/sounds/notification.mp3");
      audio.volume = 0.5; // Set to 50% volume

      audio.play().catch((e) => {
        // If playing fails, don't show error in console
        console.log("Sound playback suppressed: requires user interaction");
      });
    }
  } catch (error) {
    // Don't show error in console
    console.log("Error initializing notification sound");
  }
}

// Function to play PC beep using the motherboard speaker
function playPcBeep() {
  if (typeof window === 'undefined') return;

  // Try with a data URI approach (works in most browsers)
  try {
    const audio = new Audio("data:audio/wav;base64,//uQRAAAAWMSLwUIYAAsYkXgoQwAEaYLWfkWgAI0wWs/ItAAAGDgYtAgAyN+QWaAAihwMWm4G8QQRDiMcCBcH3Cc+CDv/7xA4Tvh9Rz/y8QADBwMWgQAZG/ILNAARQ4GLTcDeIIIhxGOBAuD7hOfBB3/94gcJ3w+o5/5eIAIAAAVwWgQAVQ2ORaIQwEMAJiDg95G4nQL7mQVWI6GwRcfsZAcsKkJvxgxEjzFUgfHoSQ9Qq7KNwqHwuB13MA4a1q/DmBrHgPcmjiGoh//EwC5nGPEmS4RcfkVKOhJf+WOgoxJclFz3kgn//dBA+ya1GhurNn8zb//9NNutNuhz31f////9vt///z+IdAEAAAK4LQIAKobHItEIYCGAExBwe8jcToF9zIKrEdDYIuP2MgOWFSE34wYiR5iqQPj0JIeoVdlG4VD4XA67mAcNa1fhzA1jwHuTRxDUQ//iYBczjHiTJcIuPyKlHQkv/LHQUYkuSi57yQT//uggfZNajQ3Vmz+Zt//+mm3Wm3Q576v////+32///5/EOgAAADVghQAAAAA==");
    audio.play().catch(() => {});
  } catch (e) {
    // Silent fallback
  }

  // Try BEL character method (works in terminal emulators)
  try {
    // Try directly first - this is the most reliable for system beep
    console.log('\u0007'); // BEL character (ASCII 7)
  } catch (e) {
    // Silent fallback
  }

  // Create multiple short beeps for better alerting
  for (let i = 0; i < 3; i++) {
    setTimeout(() => {
      try {
        // Try to use console.log approach with special character
        console.log('\u0007'); // BEL character (ASCII 7)
      } catch (e) {
        // Silent fallback
      }

      // Try alternative approach with audio context
      try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

        // Create oscillator for beep sound
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        // Configure oscillator for a typical PC beep frequency (around 800Hz)
        oscillator.type = 'square'; // Square wave sounds more like PC beep
        oscillator.frequency.value = 800 + (i * 200); // Vary frequency for each beep

        // Connect and configure gain
        gainNode.gain.value = 0.1; // Low volume to avoid being too loud
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        // Play a short beep (100ms)
        oscillator.start();
        setTimeout(() => {
          try {
            oscillator.stop();
          } catch (e) {
            // Ignore stop errors
          }
        }, 100);
      } catch (e) {
        // Ignore WebAudio errors silently
      }
    }, i * 300); // Space out the beeps
  }
}