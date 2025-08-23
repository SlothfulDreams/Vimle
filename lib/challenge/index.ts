/**
 * Challenge Module
 * Exports for all challenge-related functionality
 */

// Main service
// Legacy compatibility functions
export {
  ChallengeService,
  challengeService,
  generateChallengeForDate,
  getDifficultyForDate,
  getTodaysChallenge,
  getTodaysDate,
} from "./service";
export type { StaticChallenge } from "./static-pool";
// Static pool utilities
export {
  getChallengeFromPool,
  getPoolSize,
  getRandomChallengeFromPool,
  STATIC_CHALLENGE_POOL,
  validateChallengePool,
} from "./static-pool";

// Types
export type {
  ChallengeAttempt,
  ChallengeGenerationOptions,
  ChallengeGenerationResult,
  ChallengeMetadata,
  ChallengeServiceConfig,
  ChallengeSource,
  ChallengeStats,
  ChallengeValidationResult,
  DailyChallenge,
} from "./types";
