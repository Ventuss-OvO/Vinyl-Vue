// This Cloudflare Worker serves two main purposes:
// 1. Acts as a proxy to an R2 bucket for serving media assets.
// 2. Provides an API endpoint to fetch and display website statistics from Umami.

// Define the structure for environment variables for type safety.
interface Env {
  R2_PUBLIC_URL: string;
  UMAMI_API_URL?: string; // Optional, with a default value.
  UMAMI_WEBSITE_ID: string;
  UMAMI_API_KEY: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // --- CORS Preflight Handling ---
    // Handle OPTIONS requests for CORS preflight. This is crucial for allowing
    // cross-origin requests from the frontend application.
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Max-Age': '86400', // 24 hours
        },
      });
    }

    // --- R2 Asset Proxy ---
    // If the path starts with /records/, proxy the request to the R2 bucket.
    if (url.pathname.startsWith('/records/')) {
      if (!env.R2_PUBLIC_URL) {
        return new Response(
          JSON.stringify({ error: 'Configuration error: R2_PUBLIC_URL is not set.' }), 
          { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
        );
      }
      
      const r2Path = url.pathname.substring('/records/'.length);
      const r2Url = `${env.R2_PUBLIC_URL}/${r2Path}`;
      
      try {
        // Fetch the asset from R2 and return it directly.
        return fetch(r2Url, { headers: request.headers });
      } catch (error: any) {
        return new Response(
          JSON.stringify({ error: 'Error proxying to R2', message: error.message }), 
          { status: 502, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
        );
      }
    }
    
    // --- Umami Stats API Endpoint ---
    // Provides website statistics.
    if (url.pathname === '/api/stats') {
      // Get Umami configuration from environment variables.
      const UMAMI_API_URL = env.UMAMI_API_URL || 'https://api.umami.is/v1'; // Default to official cloud API.
      const { UMAMI_WEBSITE_ID, UMAMI_API_KEY } = env;

      // Check if required environment variables are configured.
      if (!UMAMI_WEBSITE_ID || !UMAMI_API_KEY) {
        const errorMessage = 'Configuration error: UMAMI_WEBSITE_ID and UMAMI_API_KEY must be set.';
        return new Response(
          JSON.stringify({ error: errorMessage, totalVisitors: '--', todayVisitors: '--', activeUsers: '--' }),
          { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
        );
      }

      try {
        // Calculate time ranges for fetching stats.
        const today = new Date();
        const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
        const startOfWebsite = new Date('2023-01-01').getTime(); // A reasonable default start date.
        const now = Date.now();

        // Prepare fetch requests for total, today, and active visitors.
        const statsHeaders = {
          'x-umami-api-key': UMAMI_API_KEY,
          'Content-Type': 'application/json',
        };
        
        const totalStatsPromise = fetch(`${UMAMI_API_URL}/websites/${UMAMI_WEBSITE_ID}/stats?startAt=${startOfWebsite}&endAt=${now}`, { headers: statsHeaders });
        const todayStatsPromise = fetch(`${UMAMI_API_URL}/websites/${UMAMI_WEBSITE_ID}/stats?startAt=${startOfToday}&endAt=${now}`, { headers: statsHeaders });
        const activeUsersPromise = fetch(`${UMAMI_API_URL}/websites/${UMAMI_WEBSITE_ID}/active`, { headers: statsHeaders });
        
        const [totalStatsRes, todayStatsRes, activeUsersRes] = await Promise.all([totalStatsPromise, todayStatsPromise, activeUsersPromise]);

        if (!totalStatsRes.ok || !todayStatsRes.ok || !activeUsersRes.ok) {
           throw new Error('Failed to fetch one or more stats from Umami API.');
        }
        
        const totalStatsData = await totalStatsRes.json();
        const todayStatsData = await todayStatsRes.json();
        const activeUsersData = await activeUsersRes.json();

        // Extract the required information.
        const responsePayload = {
          totalVisitors: totalStatsData.visitors?.value || 0,
          todayVisitors: todayStatsData.visitors?.value || 0,
          activeUsers: activeUsersData.length || 0, // Umami active API returns an array of visitors.
        };

        // Return the combined statistics.
        return new Response(JSON.stringify(responsePayload), {
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'max-age=60', // Cache for 1 minute
          },
        });

      } catch (error: any) {
        console.error('Failed to fetch Umami stats:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to fetch stats from Umami', message: error.message, totalVisitors: '--', todayVisitors: '--', activeUsers: '--' }),
          { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
        );
      }
    }
    
    // --- API Info Endpoint ---
    // A simple health-check or info endpoint.
    if (url.pathname === '/api') {
      return new Response(JSON.stringify({ message: 'Hello from the Vinyl Vue Worker!' }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }
    
    // --- Not Found ---
    // For any other path, return a 404 response.
    return new Response('Not Found', { status: 404 });
  }
};