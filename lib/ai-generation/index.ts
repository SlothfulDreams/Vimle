/**
 * AI Challenge Generation Module
 * Main exports for all AI-powered challenge generation functionality
 */

// Configuration
export { getAIServiceConfig, isAIEnabled, isGeminiEnabled } from "./config";
// Gemini-specific exports
export * from "./gemini";
export type { GenerationOptions, GenerationResult } from "./generator";
// Main orchestrator
export { generateTodaysChallenge, getAIServicesHealth } from "./generator";
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
} from "./types";
