/**
 * Gemini AI Integration Module
 * Clean exports for all Gemini-related functionality
 */

export type { GeminiErrorCode } from "./errors";
// Error handling
export {
  createGeminiError,
  GeminiGenerationError,
  GeminiRateLimitError,
  GeminiResponseError,
  GeminiValidationError,
  getRetryDelay,
  isRetryableError,
} from "./errors";
export type { DifficultyLevel, PromptOptions } from "./prompts";
// Prompt utilities (for advanced usage)
export {
  generateCustomPrompt,
  getPromptConfig,
  PROMPT_TEMPLATES,
} from "./prompts";
// Main service class
export { GeminiChallengeService } from "./service";
// Types and interfaces
export type {
  ChallengeGenerationOptions,
  ChallengeGenerationResult,
  GeminiChallengeResponse,
  GeminiDifficulty,
  GeminiGenerationConfig,
  GeminiServiceStats,
  HealthCheck,
  ServiceHealth,
  ValidationResult,
} from "./types";
export {
  DEFAULT_GEMINI_CONFIG,
  geminiChallengeResponseSchema,
} from "./types";
// Validation functions
export {
  comprehensiveValidation,
  validateGeneratedCode,
  validateOrThrow,
  validateVimPracticeContent,
} from "./validator";
