import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Allows direct HTTP requests to the API server by bypassing CORS restrictions.
 * 
 * This works by adding a script element to the page that loads the API endpoint
 * via JSONP (JSON with Padding). This is a workaround that allows cross-origin 
 * requests without CORS support by using dynamic script injection.
 * 
 * @param url The URL to fetch
 * @param apiKey The API key to include in the query params
 * @param callback The callback function to receive the data
 */
export function corslessFetch(url: string, apiKey: string, callback: (data: any) => void) {
  // Create a globally accessible callback function
  const callbackName = `jsonpCallback_${Math.floor(Math.random() * 1000000)}`;
  (window as any)[callbackName] = (data: any) => {
    // Clean up
    document.body.removeChild(script);
    delete (window as any)[callbackName];
    
    // Call the actual callback
    callback(data);
  };
  
  // Add the API key and callback to the URL
  const fullUrl = `${url}${url.includes('?') ? '&' : '?'}api_key=${apiKey}&callback=${callbackName}`;
  
  // Create a script tag
  const script = document.createElement('script');
  script.src = fullUrl;
  script.async = true;
  script.onerror = () => {
    // Clean up on error
    document.body.removeChild(script);
    delete (window as any)[callbackName];
    
    // Call the callback with an error
    callback({ error: 'Failed to fetch data from API' });
  };
  
  // Add the script to the DOM
  document.body.appendChild(script);
}