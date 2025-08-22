/**
 * Gemini AI Integration Module
 * Clean exports for all Gemini-related functionality
 */

// Main service class
export { GeminiChallengeService } from "./service";

// Types and interfaces
export type {
  GeminiChallengeResponse,
  GeminiDifficulty,
  GeminiGenerationConfig,
  ChallengeGenerationOptions,
  ChallengeGenerationResult,
  ValidationResult,
  GeminiServiceStats,
  ServiceHealth,
  HealthCheck,
} from "./types";

export { 
  geminiChallengeResponseSchema,
  DEFAULT_GEMINI_CONFIG,
} from "./types";

// Error handling
export {
  GeminiGenerationError,
  GeminiRateLimitError,
  GeminiResponseError,
  GeminiValidationError,
  createGeminiError,
  isRetryableError,
  getRetryDelay,
} from "./errors";

export type { GeminiErrorCode } from "./errors";

// Validation functions
export {
  validateGeneratedCode,
  validateVimPracticeContent,
  comprehensiveValidation,
  validateOrThrow,
} from "./validator";

// Prompt utilities (for advanced usage)
export {
  PROMPT_TEMPLATES,
  generateCustomPrompt,
  getPromptConfig,
} from "./prompts";

export type { DifficultyLevel, PromptOptions } from "./prompts";