/**
 * AI Challenge Generation Module
 * Main exports for all AI-powered challenge generation functionality
 */

// Main orchestrator
export { generateTodaysChallenge, getAIServicesHealth } from "./generator";
export type { GenerationOptions, GenerationResult } from "./generator";

// Configuration
export { isGeminiEnabled, isAIEnabled, getAIServiceConfig } from "./config";

// Shared types
export type {
  ChallengeDifficulty,
  ProgrammingLanguage,
  AIServiceConfig,
  ChallengeGenerationRequest,
  ChallengeGenerationResponse,
  GenerationMetadata,
  GenerationResultWithMetadata,
  ServiceHealthStatus,
  ContentValidationResult,
  AIService,
} from "./types";

// Gemini-specific exports
export * from "./gemini";