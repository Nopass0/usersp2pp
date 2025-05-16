import { create } from "zustand";
import { persist } from "zustand/middleware";
import { corslessFetch } from "~/lib/utils";

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

// Define types for Cancellation Message from API
export interface CancellationMessage {
  chat_id: number;
  chat_name: string;
  message: string;
  timestamp: number;
  message_id: string | number; // Can be string or number
  isRead?: boolean;
}

// Check if browser notifications are supported
export function areNotificationsSupported(): boolean {
  return typeof window !== 'undefined' &&
         'Notification' in window &&
         'serviceWorker' in navigator;
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

// Function to request notification permissions
export async function requestNotificationPermission(): Promise<boolean> {
  if (!areNotificationsSupported()) {
    console.log("Browser notifications are not supported");
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    return permission === "granted";
  } catch (error) {
    console.error("Error requesting notification permission:", error);
    return false;
  }
}

// Function to check if notification permission is granted
export function hasNotificationPermission(): boolean {
  if (!areNotificationsSupported()) return false;
  return Notification.permission === "granted";
}

// Function to show a desktop notification
export function showDesktopNotification(title: string, body: string, icon?: string) {
  const { desktopNotificationsEnabled } = useNotificationStore.getState();

  // Check if desktop notifications are enabled in settings
  if (!desktopNotificationsEnabled) return;

  // Check if notifications are supported and permission is granted
  if (!areNotificationsSupported() || !hasNotificationPermission()) return;

  try {
    // Create notification options
    const notificationOptions = {
      body: body,
      icon: icon || "/favicon.ico",
      tag: "notification-" + Date.now(), // Unique tag to prevent duplicates
      requireInteraction: true, // Require user interaction to close
      renotify: true, // Always show a new notification, even if tag is the same
      silent: false, // Play the system sound
      vibrate: [200, 100, 200], // Vibration pattern for mobile devices
      badge: "/favicon.ico", // Icon for Android notification tray
      timestamp: Date.now(), // When the notification was created
      actions: [
        {
          action: 'open',
          title: 'Открыть'
        }
      ]
    };

    // Create and show the notification
    const notification = new Notification(title, notificationOptions);

    // Handle click on notification
    notification.onclick = function() {
      // If window is already open, focus it
      if (window && window.focus) {
        window.focus();
      } else {
        // Otherwise try to open the app
        if (window.location && window.location.origin) {
          window.open(window.location.origin, '_blank');
        }
      }
      notification.close();
    };

    // Don't auto-close important notifications
    if (title.includes("Отмена") || body.includes("невозможно")) {
      // Keep notification visible until user interacts with it
    } else {
      // Auto close regular notifications after 10 seconds
      setTimeout(() => notification.close(), 10000);
    }

    return notification;
  } catch (error) {
    console.error("Error showing desktop notification:", error);
    return null;
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
  lastCancellationChecked: number | null;
  notifications: CabinetMessage[];
  cancellations: CancellationMessage[];
  soundEnabled: boolean;
  pcBeepEnabled: boolean; // Added PC beep option
  desktopNotificationsEnabled: boolean; // Added desktop notifications option
  error: string | null;

  // Actions
  setApiConfig: (apiKey: string, apiUrl: string) => void;
  startPolling: () => void;
  stopPolling: () => void;
  setPollInterval: (interval: number) => void;
  setSoundEnabled: (enabled: boolean) => void;
  setPcBeepEnabled: (enabled: boolean) => void; // Toggle PC beep
  setDesktopNotificationsEnabled: (enabled: boolean) => void; // Toggle desktop notifications
  clearNotifications: () => void;
  clearCancellations: () => void;
  addNotifications: (notifications: CabinetMessage[]) => void;
  addCancellations: (cancellations: CancellationMessage[]) => void;
  setError: (error: string | null) => void;
}

// Create notification store with persistence
export const useNotificationStore = create<NotificationState>()(
  persist(
    (set, get) => ({
      apiKey: process.env.NEXT_PUBLIC_TELEGRAM_API_KEY || "",
      apiUrl: process.env.NEXT_PUBLIC_TELEGRAM_API_URL || "",
      polling: false,
      pollInterval: 5000, // 5 seconds default
      lastChecked: null,
      lastCancellationChecked: null,
      notifications: [],
      cancellations: [],
      soundEnabled: true,
      pcBeepEnabled: true, // PC beep enabled by default
      desktopNotificationsEnabled: true, // Desktop notifications enabled by default
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
            // Fetch messages and cancellations separately, so errors in one don't stop the other
            try {
              await fetchAndProcessMessages();
            } catch (msgError) {
              console.error("Error polling for messages:", msgError);
              set({ error: msgError instanceof Error ? msgError.message : "Unknown error polling messages" });
            }

            // Poll for cancellations separately
            try {
              await fetchAndProcessCancellations();
            } catch (cancelError) {
              console.error("Error polling for cancellations:", cancelError);
              // Don't set error state for cancellations to avoid disrupting normal notifications
            }
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
      
      setDesktopNotificationsEnabled: (enabled) => set({ desktopNotificationsEnabled: enabled }),

      clearNotifications: () => set({ notifications: [] }),
      
      clearCancellations: () => set({ cancellations: [] }),

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

            // Show desktop notification if enabled
            if (state.desktopNotificationsEnabled && filteredNew.length > 0) {
              // Create a notification for each new message (limit to max 3 to avoid spam)
              const toShow = filteredNew.slice(0, 3);

              toShow.forEach(msg => {
                const title = `${msg.cabinet_name} (${msg.chat_name})`;
                const body = msg.message.replace(/\[.*?\] Автоматическое оповещение: /g, '');
                showDesktopNotification(title, body);
              });

              // If there are more than we showed, add a summary notification
              if (filteredNew.length > 3) {
                showDesktopNotification(
                  "Новые уведомления",
                  `Получено ${filteredNew.length} новых уведомлений`
                );
              }
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
      
      addCancellations: (newCancellations) => {
        set((state) => {
          // Filter out duplicates based on message_id and chat_id together
          const existingIds = new Set(
            state.cancellations.map((n) => `${n.chat_id}-${n.message_id}`)
          );

          const filteredNew = newCancellations.filter(
            (n) => !existingIds.has(`${n.chat_id}-${n.message_id}`)
          );
          
          // If we have new cancellation notifications
          if (filteredNew.length > 0) {
            // Play sound if enabled
            if (state.soundEnabled) {
              playNotificationSound();
            }
            
            // Show desktop notification if enabled
            if (state.desktopNotificationsEnabled && filteredNew.length > 0) {
              // Create a notification for each new cancellation (limit to max 3 to avoid spam)
              const toShow = filteredNew.slice(0, 3);
              
              toShow.forEach(msg => {
                const title = `Отмена: ${msg.chat_name}`;
                const body = msg.message;
                showDesktopNotification(title, body);
              });
              
              // If there are more than we showed, add a summary notification
              if (filteredNew.length > 3) {
                showDesktopNotification(
                  "Новые отмены",
                  `Получено ${filteredNew.length} новых уведомлений об отмене`
                );
              }
            }
            
            // Trigger notification display
            triggerNotificationDisplay();
          }
          
          return {
            cancellations: [...filteredNew, ...state.cancellations],
            lastCancellationChecked: Date.now(),
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
        desktopNotificationsEnabled: state.desktopNotificationsEnabled,
        lastChecked: state.lastChecked,
        lastCancellationChecked: state.lastCancellationChecked,
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

    // Use a direct HTTP call to the specified IP address
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    // Ensure URL has a protocol
    let directUrl = apiUrl;

    // Add protocol if missing - use HTTP as required, not HTTPS
    if (!directUrl.startsWith('http://') && !directUrl.startsWith('https://')) {
      directUrl = `http://${directUrl}`;
    }

    // Hard-code the correct IP address (not used - we use proxy instead)
    // directUrl = 'http://95.163.152.102:8000';

    // console.log("Fetching from:", directUrl);

    // Try using our server-side proxy instead of direct HTTP
    // This avoids mixed content issues completely
    const proxyUrl = `/api/proxy/messages/recent?hours=${hours}`;

    console.log("Using proxy URL:", proxyUrl);

    const response = await fetch(proxyUrl, {
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

// Function to fetch cancellation notifications from API
export async function fetchAndProcessCancellations() {
  const { apiKey, lastCancellationChecked, addCancellations, setError } = useNotificationStore.getState();

  if (!apiKey) {
    const errorMsg = "API configuration missing";
    console.error(errorMsg);
    setError(errorMsg);
    return;
  }

  try {
    // Determine time period for recent messages (use last 24 hours if no lastCancellationChecked)
    const hours = lastCancellationChecked ?
      Math.max(1, Math.ceil((Date.now() - lastCancellationChecked) / (60 * 60 * 1000))) :
      24; // Default to 24 hours for cancellations

    // Set up request with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    // Use the proxy for cancellation notifications (always using HTTP)
    const proxyUrl = `/api/proxy/cancellations/recent?hours=${hours}`;

    console.log("Fetching cancellations using proxy URL:", proxyUrl);

    const response = await fetch(proxyUrl, {
      method: "GET",
      headers: {
        "accept": "application/json",
        "X-API-Key": apiKey
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Failed to fetch cancellations: ${response.status}`);
    }

    const data = await response.json();

    // Process cancellation messages - these have a different format than regular notifications
    if (data.messages && Array.isArray(data.messages) && data.messages.length > 0) {
      // Check that messages contain the text "невозможно обработать" which indicates cancellation
      const cancellationMessages = data.messages.filter(
        msg => typeof msg.message === 'string' && msg.message.includes('невозможно обработать')
      );

      if (cancellationMessages.length > 0) {
        // Add to store and show notification
        addCancellations(cancellationMessages);

        // Save to database via API endpoint
        await saveCancellationsToDatabase(cancellationMessages);
      }
    }

    // Clear any previous errors on successful fetch
    setError(null);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error fetching cancellations";
    console.error("Error fetching cancellations:", errorMsg);
    setError(errorMsg);
    // Don't throw the error, just log it to avoid breaking the polling loop
  }
}

// Function to save cancellations to database
async function saveCancellationsToDatabase(cancellations: CancellationMessage[]) {
  try {
    // Call the API endpoint to save cancellations
    const response = await fetch('/api/notifications/save-cancellations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ cancellations }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error saving cancellations (${response.status}):`, errorText);
    }
  } catch (error) {
    console.error("Error saving cancellations to database:", error);
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
      audio.volume = 1.0; // Set to 100% maximum volume

      // Play the sound multiple times for extra loudness
      audio.play().catch((e) => {
        // If playing fails, don't show error in console
        console.log("Sound playback suppressed: requires user interaction");
      });

      // Create duplicate sounds for increased volume effect
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

  // Create multiple loud siren beeps for emergency alerting
  for (let i = 0; i < 6; i++) {
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

        // Configure oscillator for a siren-like sound (higher frequency)
        oscillator.type = 'sawtooth'; // Sawtooth for harsh siren-like sound
        oscillator.frequency.value = 1500 + (i * 300); // Higher frequency for emergency sound

        // Connect and configure gain
        gainNode.gain.value = 0.5; // Much louder volume for emergency alert
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        // Play a longer beep (300ms) for siren effect
        oscillator.start();
        setTimeout(() => {
          try {
            oscillator.stop();
          } catch (e) {
            // Ignore stop errors
          }
        }, 300);
      } catch (e) {
        // Ignore WebAudio errors silently
      }
    }, i * 300); // Space out the beeps
  }
}