/**
 * AI Challenge Generator Orchestrator
 * Main entry point for AI-powered challenge generation
 * Handles service selection, retry logic, and fallback mechanisms
 */

import { GeminiChallengeService, type ChallengeGenerationOptions, isRetryableError, getRetryDelay } from "./gemini";
import { isGeminiEnabled, aiConfig, geminiConfig } from "./config";
import { getTodaysChallenge } from "@/lib/challenge";
import { logger } from "@/lib/logger";
import type { DailyChallenge } from "@/types";

/**
 * Options for challenge generation
 */
export interface GenerationOptions {
  /** Date for the challenge (YYYY-MM-DD format) */
  date: string;
  /** Difficulty level */
  difficulty: "easy" | "medium" | "hard";
  /** Maximum retry attempts (overrides default) */
  retries?: number;
}

/**
 * Result of challenge generation attempt
 */
export interface GenerationResult {
  /** Generated challenge data */
  challenge: DailyChallenge;
  /** Prompt used for generation */
  promptUsed: string;
  /** Source of generation (ai service or fallback) */
  generatedBy: "gemini" | "static";
  /** Additional metadata */
  metadata?: {
    /** Time taken for generation */
    generationTimeMs?: number;
    /** Number of retry attempts made */
    retryAttempts?: number;
    /** Whether fallback was used */
    usedFallback?: boolean;
  };
}

/**
 * Singleton service instances
 */
let geminiService: GeminiChallengeService | null = null;

/**
 * Get or create Gemini service instance
 */
function getGeminiService(): GeminiChallengeService {
  if (!geminiService && isGeminiEnabled()) {
    geminiService = new GeminiChallengeService(
      geminiConfig.apiKey!,
      geminiConfig.model
    );
    logger.debug("Created Gemini service instance", { model: geminiConfig.model });
  }
  
  if (!geminiService) {
    throw new Error("Gemini service is not available");
  }
  
  return geminiService;
}

/**
 * Generate today's challenge using available AI services
 * Falls back to static challenges if AI generation fails
 */
export async function generateTodaysChallenge(
  options?: Partial<GenerationOptions>
): Promise<GenerationResult> {
  const { date = getTodaysDate(), difficulty = getDifficultyForDate(date), retries = aiConfig.maxRetries } = options || {};

  logger.info("Starting challenge generation", { date, difficulty, retries });

  // If no AI services are enabled, use static fallback immediately
  if (!isGeminiEnabled()) {
    logger.info("No AI services enabled, using static fallback");
    return generateStaticFallback(date, difficulty);
  }

  // Try AI generation with retries
  try {
    const result = await generateWithRetries({
      date,
      difficulty,
      retries,
    });
    
    logger.info("Successfully generated AI challenge", {
      date,
      difficulty,
      generatedBy: result.generatedBy,
      title: result.challenge.title,
    });
    
    return result;

  } catch (error) {
    logger.error("All AI generation attempts failed", { 
      date, 
      difficulty, 
      error: error instanceof Error ? error.message : String(error)
    });

    // Fall back to static challenges if enabled
    if (aiConfig.enableFallback) {
      logger.info("Falling back to static challenge generation");
      return generateStaticFallback(date, difficulty);
    }

    // If fallback is disabled, re-throw the error
    throw error;
  }
}

/**
 * Generate challenge with retry logic
 */
async function generateWithRetries(options: GenerationOptions): Promise<GenerationResult> {
  const { date, difficulty, retries = aiConfig.maxRetries } = options;
  let attemptCount = 0;
  let lastError: Error | null = null;

  while (attemptCount <= retries) {
    try {
      // Try Gemini service first (add other services here later)
      if (isGeminiEnabled()) {
        const service = getGeminiService();
        
        const generationOptions: ChallengeGenerationOptions = {
          difficulty,
          config: {
            timeout: aiConfig.requestTimeout,
          },
        };

        const result = await service.generateChallenge(generationOptions);
        
        // Convert to our standard format
        const challenge: DailyChallenge = {
          id: `${date}-gemini-${difficulty}`,
          date,
          startingContent: result.response.startingContent?.trim(),
          content: result.response.content.trim(),
          title: result.response.title,
          difficulty,
        };

        return {
          challenge,
          promptUsed: result.promptUsed,
          generatedBy: "gemini",
          metadata: {
            generationTimeMs: result.metadata.generationTimeMs,
            retryAttempts: attemptCount,
          },
        };
      }

      throw new Error("No AI services available");

    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      attemptCount++;

      logger.warn(`AI generation attempt ${attemptCount} failed`, {
        date,
        difficulty,
        attempt: attemptCount,
        maxRetries: retries,
        error: lastError.message,
        retryable: isRetryableError(error),
      });

      // If we have retries left and the error is retryable
      if (attemptCount <= retries && isRetryableError(error)) {
        const delay = getRetryDelay(error) || aiConfig.retryDelay;
        logger.debug(`Retrying in ${delay}ms`, { attempt: attemptCount, delay });
        
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      // No more retries or error is not retryable
      break;
    }
  }

  // All attempts failed
  throw lastError || new Error("All generation attempts failed");
}

/**
 * Generate static fallback challenge
 */
function generateStaticFallback(date: string, difficulty: "easy" | "medium" | "hard"): GenerationResult {
  // Use the existing challenge service
  
  // Generate using the existing deterministic method
  const staticChallenge = getTodaysChallenge();
  
  // Override the difficulty if different
  const challenge: DailyChallenge = {
    ...staticChallenge,
    difficulty,
    id: `${date}-static-${difficulty}`,
  };

  return {
    challenge,
    promptUsed: `Static challenge for ${difficulty} difficulty on ${date}`,
    generatedBy: "static",
    metadata: {
      usedFallback: true,
    },
  };
}

/**
 * Get today's date in YYYY-MM-DD format
 */
function getTodaysDate(): string {
  const today = new Date();
  return today.toISOString().split('T')[0];
}

/**
 * Get difficulty level based on date (deterministic)
 * This ensures consistent difficulty progression
 */
function getDifficultyForDate(date: string): "easy" | "medium" | "hard" {
  // Simple hash to get consistent difficulty
  let hash = 0;
  for (let i = 0; i < date.length; i++) {
    const char = date.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  const absHash = Math.abs(hash);
  const mod = absHash % 10;
  
  // Distribute difficulties: 40% easy, 40% medium, 20% hard
  if (mod < 4) return "easy";
  if (mod < 8) return "medium";
  return "hard";
}

/**
 * Get health status of all AI services
 */
export async function getAIServicesHealth(): Promise<{
  overall: "healthy" | "degraded" | "unhealthy" | "disabled";
  services: Array<{
    name: string;
    status: "healthy" | "degraded" | "unhealthy" | "disabled";
    details?: string;
  }>;
}> {
  const services = [];
  
  // Check Gemini service
  if (isGeminiEnabled()) {
    try {
      const gemini = getGeminiService();
      const health = await gemini.healthCheck();
      services.push({
        name: "gemini",
        status: health.status,
        details: health.details.errors.join(", ") || undefined,
      });
    } catch (error) {
      services.push({
        name: "gemini",
        status: "unhealthy" as const,
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  } else {
    services.push({
      name: "gemini", 
      status: "disabled" as const,
      details: "API key not configured",
    });
  }

  // Determine overall health
  const healthyCount = services.filter(s => s.status === "healthy").length;
  const totalEnabled = services.filter(s => s.status !== "disabled").length;
  
  let overall: "healthy" | "degraded" | "unhealthy" | "disabled";
  if (totalEnabled === 0) {
    overall = "disabled";
  } else if (healthyCount === totalEnabled) {
    overall = "healthy";
  } else if (healthyCount > 0) {
    overall = "degraded";
  } else {
    overall = "unhealthy";
  }

  return { overall, services };
}