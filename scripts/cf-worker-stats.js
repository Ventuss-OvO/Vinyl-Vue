/**
 * @name Umami Stats Cloudflare Worker
 * @description
 * This is a Cloudflare Worker that acts as a proxy for the Umami API.
 * It securely fetches website statistics (total visitors, today's visitors, and current online users)
 * from your Umami instance and serves them through a simple API endpoint.
 * This allows you to display these stats in your frontend projects (e.g., in the website footer)
 * without exposing your Umami API key in the client-side code, thus ensuring its security.
 *
 * ---
 *
 * ### User Guide
 *
 * #### 1. Deploy to Cloudflare
 * 1. Log in to your Cloudflare account.
 * 2. Navigate to "Workers & Pages" in the sidebar.
 * 3. Click "Create application", then select "Create Worker".
 * 4. Name your Worker (e.g., `my-stats-worker`) and click "Deploy".
 * 5. After deployment, click "Edit code", copy the entire content of this file, paste it into the editor, and click "Save and deploy".
 *
 * #### 2. Configure Environment Variables
 * After successful deployment, you need to configure the necessary environment variables for the Worker to connect to your Umami API.
 * 1. On your Worker's management page, click the "Settings" tab, then select "Variables".
 * 2. Add the following environment variables (as "Secret" type):
 *    - `UMAMI_WEBSITE_ID`: Your Umami website ID.
 *      (You can find this in your Umami website's settings page; it's typically a UUID).
 *    - `UMAMI_API_KEY`: Your Umami API key.
 *      (You can create an API key in your Umami profile settings. Please keep this key secure.)
 *    - `UMAMI_API_URL` (Optional): Your Umami API endpoint address. If you are self-hosting Umami, set this to your instance's address.
 *      If left blank, it will default to the official Umami Cloud API address `https://api.umami.is/v1`.
 *
 * #### 3. How to Use
 * Once configured, your Worker will provide a public API endpoint.
 * - **Endpoint URL**: `https://<your-worker-name>.<your-cloudflare-subdomain>.workers.dev/api/stats`
 * - **Example**: `https://my-stats-worker.jason.workers.dev/api/stats`
 *
 * You can access this URL via a GET request, and it will return a JSON object containing your website statistics.
 *
 * #### 4. Returned Data Format
 * A successful request will return a JSON object in the following format:
 * ```json
 * {
 *   "totalVisitors": 12345,
 *   "todayVisitors": 123,
 *   "activeUsers": 12
 * }
 * ```
 * - `totalVisitors`: The total number of unique visitors since the website's creation.
 * - `todayVisitors`: The number of unique visitors for the current day.
 * - `activeUsers`: The number of currently active users online.
 *
 * If an error occurs while fetching data, the returned JSON object will contain an `error` field, and the values for the stats will be `'--'`.
 *
 */
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    
    // Handle CORS preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, x-umami-api-key',
          'Access-Control-Max-Age': '86400',
        }
      });
    }
    
    // Handle requests to fetch umami stats
    if (url.pathname === '/api/stats') {
      // Get Umami configuration from environment variables
      const UMAMI_API_URL = env.UMAMI_API_URL || 'https://api.umami.is/v1';
      const UMAMI_WEBSITE_ID = env.UMAMI_WEBSITE_ID;
      const UMAMI_API_KEY = env.UMAMI_API_KEY;
      
      // Check if environment variables are configured
      if (!UMAMI_WEBSITE_ID || !UMAMI_API_KEY) {
        const errorMessage = 'Required environment variables are not set. Please add UMAMI_WEBSITE_ID and UMAMI_API_KEY in the Cloudflare Worker settings.';
        console.error(errorMessage);
        return new Response(JSON.stringify({
          error: 'Configuration Error',
          message: errorMessage,
          totalVisitors: '--',
          todayVisitors: '--',
          activeUsers: '--'
        }), {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
      }
      
      try {
        // Calculate the time range: from website creation to now (for total historical visits)
        const startAt = new Date('2023-01-01').getTime();
        const endAt = new Date().getTime();
        
        // Calculate today's time range
        const today = new Date();
        const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
        const todayEnd = new Date().getTime();
        
        // 1. Get total website stats (historical total visits)
        const statsResponse = await fetch(`${UMAMI_API_URL}/websites/${UMAMI_WEBSITE_ID}/stats?startAt=${startAt}&endAt=${endAt}`, {
          method: 'GET',
          headers: {
            'x-umami-api-key': UMAMI_API_KEY,
            'Content-Type': 'application/json'
          }
        });
        
        if (!statsResponse.ok) {
          const errorText = await statsResponse.text();
          throw new Error(`Failed to fetch website stats: ${statsResponse.status} ${statsResponse.statusText} - ${errorText}`);
        }
        
        const statsData = await statsResponse.json();
        
        // 2. Get today's stats
        const todayStatsResponse = await fetch(`${UMAMI_API_URL}/websites/${UMAMI_WEBSITE_ID}/stats?startAt=${todayStart}&endAt=${todayEnd}`, {
          method: 'GET',
          headers: {
            'x-umami-api-key': UMAMI_API_KEY,
            'Content-Type': 'application/json'
          }
        });
        
        if (!todayStatsResponse.ok) {
          const errorText = await todayStatsResponse.text();
          throw new Error(`Failed to fetch today's stats: ${todayStatsResponse.status} ${todayStatsResponse.statusText} - ${errorText}`);
        }
        
        const todayStatsData = await todayStatsResponse.json();
        
        // 3. Get real-time online users
        const activeResponse = await fetch(`${UMAMI_API_URL}/websites/${UMAMI_WEBSITE_ID}/active`, {
          method: 'GET',
          headers: {
            'x-umami-api-key': UMAMI_API_KEY,
            'Content-Type': 'application/json'
          }
        });
        
        if (!activeResponse.ok) {
          const errorText = await activeResponse.text();
          throw new Error(`Failed to fetch real-time active users: ${activeResponse.status} ${activeResponse.statusText} - ${errorText}`);
        }
        
        const activeData = await activeResponse.json();
        
        // Extract required information from the returned data
        const totalVisitors = statsData.visitors?.value || 0;
        const todayVisitors = todayStatsData.visitors?.value || 0;
        const activeUsers = activeData.length || 0;
        
        // Return statistics
        return new Response(JSON.stringify({
          totalVisitors: totalVisitors,
          todayVisitors: todayVisitors,
          activeUsers: activeUsers
        }), {
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'max-age=60' // Cache for 1 minute
          }
        });
      } catch (error) {
        console.error('Failed to fetch stats:', error);
        return new Response(JSON.stringify({ 
          error: 'Failed to fetch stats', 
          message: error.message,
          totalVisitors: '--',
          todayVisitors: '--',
          activeUsers: '--'
        }), {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
      }
    }
    
    // Return 404 by default
    return new Response('Not Found', { status: 404 });
  }
};
