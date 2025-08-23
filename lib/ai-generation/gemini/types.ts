/**
 * TypeScript types for Gemini AI challenge generation
 * Provides type safety for API responses and service operations
 */

import { z } from "zod";

/**
 * Zod schema for validating Gemini API responses
 * Ensures the AI returns properly structured challenge data with starting and target code
 */
export const geminiChallengeResponseSchema = z.object({
  /** The starting code that users will edit (incomplete/incorrect version) */
  startingContent: z
    .string()
    .min(10, "Starting content must be at least 10 characters")
    .max(1000, "Starting content must be less than 1000 characters")
    .refine(
      (val) => val.trim().length > 0,
      "Starting content cannot be empty or only whitespace",
    ),

  /** The target code that users need to achieve (correct version) */
  content: z
    .string()
    .min(10, "Content must be at least 10 characters")
    .max(1000, "Content must be less than 1000 characters")
    .refine(
      (val) => val.trim().length > 0,
      "Content cannot be empty or only whitespace",
    ),

  /** Human-readable title for the challenge */
  title: z
    .string()
    .min(5, "Title must be at least 5 characters")
    .max(100, "Title must be less than 100 characters")
    .refine(
      (val) => val.trim().length > 0,
      "Title cannot be empty or only whitespace",
    ),

  /** Optional explanation of what the editing challenge involves */
  explanation: z
    .string()
    .max(500, "Explanation must be less than 500 characters")
    .optional(),
});

/**
 * Inferred TypeScript type from the Zod schema
 */
export type GeminiChallengeResponse = z.infer<
  typeof geminiChallengeResponseSchema
>;

/**
 * Difficulty levels supported by the Gemini service
 */
export type GeminiDifficulty = "easy" | "medium" | "hard";

/**
 * Configuration options for Gemini API requests
 */
export interface GeminiGenerationConfig {
  /** Model temperature (0.0-1.0) - controls randomness */
  temperature: number;
  /** Top-k sampling parameter */
  topK: number;
  /** Top-p sampling parameter */
  topP: number;
  /** Maximum tokens in response */
  maxOutputTokens: number;
  /** Request timeout in milliseconds */
  timeout?: number;
}

/**
 * Default configuration values for Gemini requests
 */
export const DEFAULT_GEMINI_CONFIG: GeminiGenerationConfig = {
  temperature: 0.7,
  topK: 40,
  topP: 0.95,
  maxOutputTokens: 1024,
  timeout: 30000, // 30 seconds
};

/**
 * Options for generating a challenge
 */
export interface ChallengeGenerationOptions {
  /** Difficulty level for the challenge */
  difficulty: GeminiDifficulty;
  /** Optional custom prompt context */
  customContext?: string;
  /** Preferred programming language */
  language?: "javascript" | "typescript";
  /** Additional requirements for the challenge */
  additionalRequirements?: string[];
  /** Override default API configuration */
  config?: Partial<GeminiGenerationConfig>;
}

/**
 * Result of a successful challenge generation
 */
export interface ChallengeGenerationResult {
  /** The generated challenge response */
  response: GeminiChallengeResponse;
  /** The prompt that was sent to the AI */
  promptUsed: string;
  /** Metadata about the generation process */
  metadata: {
    /** Time taken to generate (milliseconds) */
    generationTimeMs: number;
    /** Model used for generation */
    model: string;
    /** Difficulty level requested */
    difficulty: GeminiDifficulty;
    /** Token count (if available) */
    tokenCount?: number;
  };
}

/**
 * Validation result for generated content
 */
export interface ValidationResult {
  /** Whether the content passed validation */
  isValid: boolean;
  /** List of validation errors, if any */
  errors: string[];
  /** Warnings that don't prevent usage */
  warnings: string[];
}

/**
 * Statistics about Gemini service usage
 */
export interface GeminiServiceStats {
  /** Total number of requests made */
  totalRequests: number;
  /** Number of successful generations */
  successfulGenerations: number;
  /** Number of failures */
  failures: number;
  /** Average response time in milliseconds */
  averageResponseTime: number;
  /** Most recent error, if any */
  lastError?: string;
}

/**
 * Service health status
 */
export type ServiceHealth = "healthy" | "degraded" | "unhealthy" | "disabled";

/**
 * Health check result
 */
export interface HealthCheck {
  /** Overall service health status */
  status: ServiceHealth;
  /** Timestamp of the health check */
  timestamp: Date;
  /** Details about the health status */
  details: {
    /** Whether API key is configured */
    apiKeyConfigured: boolean;
    /** Whether the service can make requests */
    canMakeRequests: boolean;
    /** Any error messages */
    errors: string[];
  };
}
