import type { NextApiRequest, NextApiResponse } from 'next';

// Simple in-memory request cache to prevent duplicate requests
const requestCache = new Map<string, { timestamp: number, response: any }>();
const CACHE_EXPIRATION = 5000; // 5 seconds

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Generate a unique key for this request (method + path + body)
    const requestKey = `${req.method}-${JSON.stringify(req.query)}-${JSON.stringify(req.body)}`;

    // Check if we have a cached response for this exact request
    const cachedItem = requestCache.get(requestKey);
    const now = Date.now();

    if (cachedItem && (now - cachedItem.timestamp < CACHE_EXPIRATION)) {
      console.log('Using cached response for duplicate request');

      // Set CORS headers
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-API-Key');

      // Return the cached response
      return res.status(200).json(cachedItem.response);
    }

    // Get API key from request headers
    const apiKey = req.headers['x-api-key'] as string;
    if (!apiKey) {
      return res.status(401).json({ error: 'API key is required' });
    }

    // Extract path from query
    const { path } = req.query;
    if (!path || !Array.isArray(path)) {
      return res.status(400).json({ error: 'Invalid path' });
    }

    // Use direct API IP address with HTTP protocol
    const apiBaseUrl = "http://95.163.152.102:8000";

    // Construct the target URL
    const targetUrl = `${apiBaseUrl}/${path.join('/')}`;
    
    // Add any query parameters except the path parameter
    const queryParams = new URLSearchParams();
    Object.entries(req.query).forEach(([key, value]) => {
      if (key !== 'path' && value) {
        queryParams.append(key, value as string);
      }
    });
    
    // Append query string if there are any params
    const queryString = queryParams.toString();
    const finalUrl = queryString ? `${targetUrl}?${queryString}` : targetUrl;

    // Forward the request to the target with increased timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 40000); // 40 second timeout

    const response = await fetch(finalUrl, {
      method: req.method,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
      },
      body: req.method !== 'GET' && req.method !== 'HEAD' ? JSON.stringify(req.body) : undefined,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // Get response data
    const contentType = response.headers.get('content-type') || 'application/json';
    let data;
    
    if (contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-API-Key');

    // Store response in cache before returning it
    if (response.ok && contentType.includes('application/json')) {
      requestCache.set(requestKey, {
        timestamp: Date.now(),
        response: data
      });

      // Clean up old cache entries
      setTimeout(() => {
        const now = Date.now();
        requestCache.forEach((value, key) => {
          if (now - value.timestamp > CACHE_EXPIRATION) {
            requestCache.delete(key);
          }
        });
      }, 0);
    }

    // Return response
    return res.status(response.status).json(data);
  } catch (error) {
    console.error('Proxy error:', error);
    return res.status(500).json({ error: 'Proxy server error', details: (error as Error).message });
  }
}