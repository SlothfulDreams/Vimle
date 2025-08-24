/**
 * AI Challenge Generation Module
 * Main exports for all AI-powered challenge generation functionality
 */

// Configuration
export {
  getAIServiceConfig,
  isAIEnabled,
  isGeminiEnabled,
} from "./config/index.js";
// Gemini-specific exports
export * from "./gemini/index.js";
export type { GenerationOptions, GenerationResult } from "./generator.js";
// Main orchestrator
export { generateTodaysChallenge, getAIServicesHealth } from "./generator.js";
// Shared types
export type {
  AIService,
  AIServiceConfig,
  ChallengeDifficulty,
  ChallengeGenerationRequest,
  ChallengeGenerationResponse,
  ContentValidationResult,
  GenerationMetadata,
  GenerationResultWithMetadata,
  ProgrammingLanguage,
  ServiceHealthStatus,
} from "./types.js";
