/**
 * Vercel Serverless Function Entry Point
 * 
 * This file serves as the main entry point for Vercel's serverless functions.
 * It handles both SSR (Server-Side Rendering) via Vike and tRPC API routes
 * by importing and re-exporting the Hono app handlers from hono-entry.ts.
 */

// Import the Hono app handlers from the main entry point
import { GET, POST } from '../hono-entry.js';

// Re-export the handlers for Vercel's serverless function runtime
export { GET, POST };

// For any other HTTP methods, use GET handler as fallback
export const PUT = GET;
export const DELETE = GET;
export const PATCH = GET;
export const OPTIONS = GET;
export const HEAD = GET;