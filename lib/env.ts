/**
 * Environment Variables Configuration
 * Provides type-safe access to general environment variables
 * AI-specific config has been moved to /ai-generation/config/
 */

import { logger } from "./logger";

/**
 * General application environment configuration
 */
export const env = {
  // Database
  DATABASE_URL: process.env.DATABASE_URL,
  
  // Supabase
  SUPABASE_URL: process.env.VITE_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
  SUPABASE_ANON_KEY: process.env.VITE_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY,
  
  // Application
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: parseInt(process.env.PORT || "3000", 10),
  
  // Feature flags
  ENABLE_ANALYTICS: process.env.ENABLE_ANALYTICS === "true",
  ENABLE_DEBUG_LOGGING: process.env.ENABLE_DEBUG_LOGGING === "true",
} as const;

/**
 * Runtime validation for critical environment variables
 */
if (typeof window === "undefined") {
  const missingVars: string[] = [];
  
  if (!env.SUPABASE_URL) {
    missingVars.push("SUPABASE_URL or VITE_PUBLIC_SUPABASE_URL");
  }
  
  if (!env.SUPABASE_ANON_KEY) {
    missingVars.push("SUPABASE_ANON_KEY or VITE_PUBLIC_SUPABASE_ANON_KEY");
  }

  if (missingVars.length > 0) {
    logger.warn("Missing critical environment variables", { missingVars });
  }

  logger.info("Environment configuration loaded", {
    nodeEnv: env.NODE_ENV,
    port: env.PORT,
    supabaseConfigured: Boolean(env.SUPABASE_URL && env.SUPABASE_ANON_KEY),
    analyticsEnabled: env.ENABLE_ANALYTICS,
    debugLogging: env.ENABLE_DEBUG_LOGGING,
  });
}

/**
 * Check if we're in development mode
 */
export function isDevelopment(): boolean {
  return env.NODE_ENV === "development";
}

/**
 * Check if we're in production mode
 */
export function isProduction(): boolean {
  return env.NODE_ENV === "production";
}

/**
 * @deprecated Use isGeminiEnabled from @/lib/ai-generation/config instead
 */
export const isGeminiEnabled = (): boolean => {
  logger.warn("isGeminiEnabled from lib/env is deprecated. Use @/lib/ai-generation/config instead");
  return Boolean(process.env.GEMINI_API_KEY);
};

