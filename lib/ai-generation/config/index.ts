/**
 * AI Generation Configuration
 * Environment variables and configuration for AI services
 */

import { logger } from "@/lib/logger";

/**
 * Get Gemini AI specific configuration
 * Uses lazy initialization to ensure environment variables are loaded
 */
export function getGeminiConfig() {
  return {
    /** Google AI API Key */
    apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY,
    /** Gemini model to use */
    model: process.env.GEMINI_MODEL || "gemini-1.5-flash",
    /** Enable/disable Gemini service */
    enabled: process.env.GEMINI_ENABLED !== "false",
  } as const;
}

/**
 * Get general AI generation configuration
 * Uses lazy initialization to ensure environment variables are loaded
 */
export function getAIConfig() {
  return {
    /** Default retry attempts for failed generations */
    maxRetries: parseInt(process.env.AI_MAX_RETRIES || "3", 10),
    /** Delay between retry attempts (milliseconds) */
    retryDelay: parseInt(process.env.AI_RETRY_DELAY || "1000", 10),
    /** Timeout for AI requests (milliseconds) */
    requestTimeout: parseInt(process.env.AI_REQUEST_TIMEOUT || "30000", 10),
    /** Enable AI generation fallback to static challenges */
    enableFallback: process.env.AI_ENABLE_FALLBACK !== "false",
  } as const;
}

/**
 * Validate configuration (called lazily)
 */
let configValidated = false;
function validateConfig() {
  if (configValidated || typeof window !== "undefined") return;
  configValidated = true;

  const geminiCfg = getGeminiConfig();
  const aiCfg = getAIConfig();

  // Validate Gemini configuration
  if (geminiCfg.enabled && !geminiCfg.apiKey) {
    logger.warn(
      "Gemini API key is not configured. AI challenge generation will be disabled.",
      {
        envVarsChecked: ["GEMINI_API_KEY", "GOOGLE_AI_API_KEY"],
        fallbackEnabled: aiCfg.enableFallback,
      },
    );
  }

  // Validate retry configuration
  if (aiCfg.maxRetries < 0 || aiCfg.maxRetries > 10) {
    logger.warn("AI_MAX_RETRIES should be between 0 and 10", {
      configured: aiCfg.maxRetries,
      using: Math.max(0, Math.min(10, aiCfg.maxRetries)),
    });
  }

  if (aiCfg.retryDelay < 100 || aiCfg.retryDelay > 10000) {
    logger.warn("AI_RETRY_DELAY should be between 100ms and 10s", {
      configured: aiCfg.retryDelay,
      using: Math.max(100, Math.min(10000, aiCfg.retryDelay)),
    });
  }

  logger.info("AI generation configuration loaded", {
    geminiEnabled: geminiCfg.enabled && Boolean(geminiCfg.apiKey),
    model: geminiCfg.model,
    maxRetries: aiCfg.maxRetries,
    fallbackEnabled: aiCfg.enableFallback,
  });
}

/**
 * Check if Gemini service is properly configured and enabled
 */
export function isGeminiEnabled(): boolean {
  validateConfig();
  const cfg = getGeminiConfig();
  return cfg.enabled && Boolean(cfg.apiKey);
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
      config: getGeminiConfig(),
    };
  }

  return null;
}
