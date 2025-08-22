/**
 * AI Generation Configuration
 * Environment variables and configuration for AI services
 */

import { logger } from "@/lib/logger";

/**
 * Gemini AI specific configuration
 */
export const geminiConfig = {
  /** Google AI API Key */
  apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY,
  /** Gemini model to use */
  model: process.env.GEMINI_MODEL || "gemini-1.5-flash",
  /** Enable/disable Gemini service */
  enabled: process.env.GEMINI_ENABLED !== "false",
} as const;

/**
 * General AI generation configuration
 */
export const aiConfig = {
  /** Default retry attempts for failed generations */
  maxRetries: parseInt(process.env.AI_MAX_RETRIES || "3", 10),
  /** Delay between retry attempts (milliseconds) */
  retryDelay: parseInt(process.env.AI_RETRY_DELAY || "1000", 10),
  /** Timeout for AI requests (milliseconds) */
  requestTimeout: parseInt(process.env.AI_REQUEST_TIMEOUT || "30000", 10),
  /** Enable AI generation fallback to static challenges */
  enableFallback: process.env.AI_ENABLE_FALLBACK !== "false",
} as const;

/**
 * Validate configuration on startup (server-side only)
 */
if (typeof window === "undefined") {
  // Validate Gemini configuration
  if (geminiConfig.enabled && !geminiConfig.apiKey) {
    logger.warn(
      "Gemini API key is not configured. AI challenge generation will be disabled.",
      { 
        envVarsChecked: ["GEMINI_API_KEY", "GOOGLE_AI_API_KEY"],
        fallbackEnabled: aiConfig.enableFallback,
      }
    );
  }

  // Validate retry configuration
  if (aiConfig.maxRetries < 0 || aiConfig.maxRetries > 10) {
    logger.warn("AI_MAX_RETRIES should be between 0 and 10", { 
      configured: aiConfig.maxRetries,
      using: Math.max(0, Math.min(10, aiConfig.maxRetries))
    });
  }

  if (aiConfig.retryDelay < 100 || aiConfig.retryDelay > 10000) {
    logger.warn("AI_RETRY_DELAY should be between 100ms and 10s", {
      configured: aiConfig.retryDelay,
      using: Math.max(100, Math.min(10000, aiConfig.retryDelay))
    });
  }

  logger.info("AI generation configuration loaded", {
    geminiEnabled: geminiConfig.enabled && Boolean(geminiConfig.apiKey),
    model: geminiConfig.model,
    maxRetries: aiConfig.maxRetries,
    fallbackEnabled: aiConfig.enableFallback,
  });
}

/**
 * Check if Gemini service is properly configured and enabled
 */
export function isGeminiEnabled(): boolean {
  return geminiConfig.enabled && Boolean(geminiConfig.apiKey);
}

/**
 * Check if any AI service is available
 */
export function isAIEnabled(): boolean {
  return isGeminiEnabled(); // Add other AI services here when implemented
}

/**
 * Get the appropriate AI service configuration
 */
export function getAIServiceConfig() {
  if (isGeminiEnabled()) {
    return {
      type: "gemini" as const,
      config: geminiConfig,
    };
  }
  
  return null;
}