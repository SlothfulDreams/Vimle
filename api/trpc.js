import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "../trpc/server";

// We use JSDoc instead of TypeScript because Vercel seems buggy with /api/**/*.ts files

/**
 * @param {import('@vercel/node').VercelRequest} req
 * @param {import('@vercel/node').VercelResponse} res
 */
export default async function handler(req, res) {
  console.log("tRPC request:", req.method, req.url);

  try {
    // Convert Vercel request to standard Request object for tRPC
    const url = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
    
    const request = new Request(url, {
      method: req.method,
      headers: req.headers,
      body: req.method !== 'GET' && req.method !== 'HEAD' ? JSON.stringify(req.body) : undefined,
    });

    // Use tRPC's fetch adapter
    const response = await fetchRequestHandler({
      endpoint: '/api/trpc',
      req: request,
      router: appRouter,
      createContext: () => ({
        req,
        resHeaders: res,
      }),
    });

    // Convert Response back to Vercel format
    const body = await response.text();
    res.status(response.status);
    
    // Set response headers
    response.headers.forEach((value, key) => {
      res.setHeader(key, value);
    });
    
    res.send(body);
  } catch (error) {
    console.error('tRPC handler error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}