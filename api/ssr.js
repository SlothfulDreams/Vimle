/**
 * Vercel Serverless Function Entry Point
 * 
 * This file serves as the main entry point for Vercel's serverless functions.
 * It handles both SSR (Server-Side Rendering) via Vike and tRPC API routes.
 */

// Use CommonJS import for better Vercel compatibility
const { GET, POST } = require('../dist/server/hono-entry.js');

// Export handlers for Vercel's serverless function runtime
module.exports.GET = GET;
module.exports.POST = POST;

// For any other HTTP methods, use GET handler as fallback
module.exports.PUT = GET;
module.exports.DELETE = GET;
module.exports.PATCH = GET;
module.exports.OPTIONS = GET;
module.exports.HEAD = GET;