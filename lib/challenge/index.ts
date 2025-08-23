/**
 * Challenge Module
 * Exports for all challenge-related functionality
 */

// Main service
export {
  ChallengeService,
  challengeService,
  getDifficultyForDate,
  getTodaysDate,
} from "./service.js";
export type { StaticChallenge } from "./static-pool.js";
// Static pool utilities
export {
  getChallengeFromPool,
  getPoolSize,
  getRandomChallengeFromPool,
  STATIC_CHALLENGE_POOL,
  validateChallengePool,
} from "./static-pool.js";

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
} from "./types.js";
