/**
 * Gemini AI Integration Module
 * Clean exports for all Gemini-related functionality
 */

export type { GeminiErrorCode } from "./errors.js";
// Error handling
export {
  createGeminiError,
  GeminiGenerationError,
  GeminiRateLimitError,
  GeminiResponseError,
  GeminiValidationError,
  getRetryDelay,
  isRetryableError,
} from "./errors.js";
export type { DifficultyLevel, PromptOptions } from "./prompts.js";
// Prompt utilities (for advanced usage)
export {
  generateCustomPrompt,
  getPromptConfig,
  PROMPT_TEMPLATES,
} from "./prompts.js";
// Main service class
export { GeminiChallengeService } from "./service.js";
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
} from "./types.js";
export {
  DEFAULT_GEMINI_CONFIG,
  geminiChallengeResponseSchema,
} from "./types.js";
// Validation functions
export {
  comprehensiveValidation,
  validateGeneratedCode,
  validateOrThrow,
  validateVimPracticeContent,
} from "./validator.js";
