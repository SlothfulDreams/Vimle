/**
 * Challenge-related TypeScript types and interfaces
 * Shared types for both static and AI-generated challenges
 */

/**
 * Daily challenge interface
 * Represents a complete editing challenge that users can attempt
 */
export interface DailyChallenge {
  /** Unique identifier for the challenge */
  id: string;
  /** Date in YYYY-MM-DD format */
  date: string;
  /** Starting code content that users begin editing (incomplete/incorrect version) */
  startingContent?: string;
  /** Target code content that users need to achieve (correct/complete version) */
  content: string;
  /** Human-readable title */
  title: string;
  /** Difficulty level */
  difficulty: "easy" | "medium" | "hard";
}

/**
 * Challenge generation source
 */
export type ChallengeSource = "static" | "gemini" | "openai" | "claude";

/**
 * Challenge metadata for tracking and analytics
 */
export interface ChallengeMetadata {
  /** How the challenge was generated */
  source: ChallengeSource;
  /** When the challenge was created */
  createdAt: Date;
  /** Time taken to generate (for AI challenges) */
  generationTimeMs?: number;
  /** Original prompt used (for AI challenges) */
  originalPrompt?: string;
  /** Validation status */
  validationStatus: "pending" | "validated" | "failed";
  /** Any validation warnings */
  validationWarnings?: string[];
}

/**
 * Challenge statistics and analytics
 */
export interface ChallengeStats {
  /** Total number of attempts across all users */
  totalAttempts: number;
  /** Number of successful completions */
  completions: number;
  /** Average completion time in milliseconds */
  averageCompletionTime: number;
  /** Fastest completion time */
  fastestCompletionTime?: number;
  /** Completion rate (0-1) */
  completionRate: number;
  /** Difficulty rating from user feedback */
  userDifficultyRating?: number;
  /** User feedback scores */
  feedbackScores?: {
    quality: number;
    difficulty: number;
    enjoyment: number;
  };
}

/**
 * Challenge attempt by a user
 */
export interface ChallengeAttempt {
  /** Unique attempt ID */
  id: string;
  /** User ID who made the attempt */
  userId: string;
  /** Challenge ID being attempted */
  challengeId: string;
  /** When the attempt was started */
  startedAt: Date;
  /** When the attempt was completed (null if not completed) */
  completedAt?: Date;
  /** Time taken in milliseconds (null if not completed) */
  timeMs?: number;
  /** Whether the attempt was successful */
  successful: boolean;
  /** User's final code (for analysis) */
  finalContent?: string;
  /** Number of keystrokes/edits made */
  editCount?: number;
  /** Vim commands used (for advanced analytics) */
  commandsUsed?: string[];
}

/**
 * Challenge validation result
 */
export interface ChallengeValidationResult {
  /** Whether the challenge is valid */
  isValid: boolean;
  /** Validation errors that prevent usage */
  errors: string[];
  /** Warnings that don't prevent usage */
  warnings: string[];
  /** Quality score (0-1) */
  qualityScore?: number;
  /** Vim practice opportunities score (0-1) */
  vimPracticeScore?: number;
  /** Estimated difficulty based on content analysis */
  estimatedDifficulty?: "easy" | "medium" | "hard";
}

/**
 * Options for challenge generation
 */
export interface ChallengeGenerationOptions {
  /** Target date for the challenge */
  date: string;
  /** Desired difficulty level */
  difficulty: "easy" | "medium" | "hard";
  /** Preferred programming language */
  language?: "javascript" | "typescript";
  /** Additional requirements or constraints */
  requirements?: string[];
  /** Whether to force AI generation even if static is preferred */
  forceAI?: boolean;
  /** Whether to allow fallback to static if AI fails */
  allowFallback?: boolean;
}

/**
 * Result of challenge generation process
 */
export interface ChallengeGenerationResult {
  /** The generated challenge */
  challenge: DailyChallenge;
  /** Metadata about the generation process */
  metadata: ChallengeMetadata;
  /** Any warnings generated during creation */
  warnings?: string[];
}

/**
 * Challenge service configuration
 */
export interface ChallengeServiceConfig {
  /** Whether to prefer AI generation over static */
  preferAI: boolean;
  /** Whether to enable fallback to static challenges */
  enableFallback: boolean;
  /** Default difficulty distribution weights */
  difficultyWeights: {
    easy: number;
    medium: number;
    hard: number;
  };
  /** Validation settings */
  validation: {
    /** Whether to validate all generated challenges */
    enabled: boolean;
    /** Minimum quality score required */
    minQualityScore: number;
    /** Whether to reject challenges with warnings */
    rejectWithWarnings: boolean;
  };
}