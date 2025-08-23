/**
 * Shared types for AI challenge generation
 * Common interfaces used across different AI service providers
 */

/**
 * Standard difficulty levels for challenges
 */
export type ChallengeDifficulty = "easy" | "medium" | "hard";

/**
 * Supported programming languages for challenge generation
 */
export type ProgrammingLanguage =
  | "javascript"
  | "typescript"
  | "python"
  | "java"
  | "go"
  | "rust"
  | "cpp";

/**
 * Generic AI service configuration
 */
export interface AIServiceConfig {
  /** Service name/identifier */
  name: string;
  /** Whether the service is enabled */
  enabled: boolean;
  /** API endpoint or configuration specific to the service */
  endpoint?: string;
  /** API key or authentication token */
  apiKey?: string;
  /** Request timeout in milliseconds */
  timeout?: number;
  /** Maximum retries for failed requests */
  maxRetries?: number;
}

/**
 * Standard challenge generation request
 */
export interface ChallengeGenerationRequest {
  /** Desired difficulty level */
  difficulty: ChallengeDifficulty;
  /** Programming language preference */
  language?: ProgrammingLanguage;
  /** Additional context or requirements */
  context?: string;
  /** Custom requirements for the challenge */
  requirements?: string[];
  /** Service-specific configuration overrides */
  serviceConfig?: Record<string, unknown>;
}

/**
 * Standard challenge generation response
 */
export interface ChallengeGenerationResponse {
  /** Generated code content */
  content: string;
  /** Human-readable title */
  title: string;
  /** Optional explanation of the code */
  explanation?: string;
  /** Programming language of the generated code */
  language?: ProgrammingLanguage;
  /** Estimated difficulty (may differ from requested) */
  estimatedDifficulty?: ChallengeDifficulty;
  /** Tags or categories for the challenge */
  tags?: string[];
}

/**
 * Metadata about the generation process
 */
export interface GenerationMetadata {
  /** AI service that generated the challenge */
  serviceName: string;
  /** Model or engine used */
  model?: string;
  /** Time taken for generation in milliseconds */
  generationTime: number;
  /** Number of retry attempts */
  attempts: number;
  /** Token usage (if available) */
  tokenUsage?: {
    input: number;
    output: number;
    total: number;
  };
  /** Cost estimation (if available) */
  estimatedCost?: number;
}

/**
 * Complete generation result with metadata
 */
export interface GenerationResultWithMetadata {
  /** The generated challenge */
  challenge: ChallengeGenerationResponse;
  /** Generation metadata */
  metadata: GenerationMetadata;
  /** Original prompt sent to the AI */
  prompt: string;
}

/**
 * AI service health status
 */
export interface ServiceHealthStatus {
  /** Service identifier */
  serviceId: string;
  /** Current health status */
  status: "operational" | "degraded" | "down" | "maintenance";
  /** Last successful request timestamp */
  lastSuccess?: Date;
  /** Last error message */
  lastError?: string;
  /** Response time in milliseconds */
  responseTime?: number;
  /** Success rate (0-1) */
  successRate?: number;
}

/**
 * Validation result for generated content
 */
export interface ContentValidationResult {
  /** Whether content is valid */
  valid: boolean;
  /** Validation errors */
  errors: string[];
  /** Non-critical warnings */
  warnings: string[];
  /** Quality score (0-1) */
  qualityScore?: number;
}

/**
 * AI service interface that all services must implement
 */
export interface AIService {
  /** Service identifier */
  readonly name: string;

  /** Generate a challenge */
  generateChallenge(
    request: ChallengeGenerationRequest,
  ): Promise<GenerationResultWithMetadata>;

  /** Check service health */
  healthCheck(): Promise<ServiceHealthStatus>;

  /** Validate service configuration */
  validateConfig(): boolean;

  /** Get service capabilities */
  getCapabilities(): {
    supportedLanguages: ProgrammingLanguage[];
    supportedDifficulties: ChallengeDifficulty[];
    maxContentLength: number;
    supportsCustomPrompts: boolean;
  };
}
