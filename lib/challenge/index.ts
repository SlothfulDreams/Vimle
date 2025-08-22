/**
 * Challenge Module
 * Exports for all challenge-related functionality
 */

// Main service
export { ChallengeService, challengeService } from "./service";

// Legacy compatibility functions
export { getTodaysChallenge, generateChallengeForDate, getTodaysDate, getDifficultyForDate } from "./service";

// Static pool utilities
export { 
  STATIC_CHALLENGE_POOL,
  getChallengeFromPool,
  getRandomChallengeFromPool,
  getPoolSize,
  validateChallengePool,
} from "./static-pool";

export type { StaticChallenge } from "./static-pool";

// Types
export type {
  DailyChallenge,
  ChallengeSource,
  ChallengeMetadata,
  ChallengeStats,
  ChallengeAttempt,
  ChallengeValidationResult,
  ChallengeGenerationOptions,
  ChallengeGenerationResult,
  ChallengeServiceConfig,
} from "./types";