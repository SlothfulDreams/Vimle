/**
 * AI Generation Configuration
 * Environment variables and configuration for AI services
 */

// Ensure environment variables are loaded before any config access
import { config } from "dotenv";

// Load environment variables early
if (typeof window === "undefined") {
  config();
}

import { logger } from "../../logger.js";

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

  logger.info("🔧 Validating AI generation configuration...");

  // Detailed API key validation
  const geminiApiKey = geminiCfg.apiKey;
  if (geminiCfg.enabled) {
    if (geminiApiKey) {
      logger.info("✅ Gemini API key found", {
        keyLength: geminiApiKey.length,
        keyPrefix: `${geminiApiKey.substring(0, 10)}...`,
        model: geminiCfg.model,
      });
    } else {
      logger.warn("❌ Gemini API key is not configured", {
        envVarsChecked: ["GEMINI_API_KEY", "GOOGLE_AI_API_KEY"],
        geminiEnabled: geminiCfg.enabled,
        fallbackEnabled: aiCfg.enableFallback,
        message:
          "AI challenge generation will be disabled - falling back to static challenges",
      });
    }
  } else {
    logger.info("⚠️ Gemini service is explicitly disabled", {
      geminiEnabled: geminiCfg.enabled,
    });
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

  const finalStatus = {
    geminiEnabled: geminiCfg.enabled && Boolean(geminiCfg.apiKey),
    model: geminiCfg.model,
    maxRetries: aiCfg.maxRetries,
    fallbackEnabled: aiCfg.enableFallback,
  };

  logger.info("🏁 AI generation configuration summary", finalStatus);

  // Additional warning if no AI services will be available
  if (!finalStatus.geminiEnabled) {
    logger.warn("⚠️ No AI services will be available for challenge generation", {
      reason: !geminiCfg.enabled ? "Service disabled" : "API key missing",
      willUseFallback: finalStatus.fallbackEnabled,
    });
  }
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
