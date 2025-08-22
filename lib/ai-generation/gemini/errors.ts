/**
 * Gemini API Error Classes
 * Specialized error handling for AI challenge generation failures
 */

/**
 * Error codes for different types of Gemini API failures
 */
export type GeminiErrorCode = 
  | "RATE_LIMIT"          // API quota/rate limit exceeded
  | "INVALID_RESPONSE"    // Response format is invalid or unparseable
  | "API_ERROR"           // General API communication error
  | "DISABLED"            // Gemini service is disabled
  | "VALIDATION_ERROR"    // Generated content failed validation
  | "QUOTA_EXCEEDED"      // Monthly/daily quota exceeded
  | "NETWORK_ERROR"       // Network connectivity issues
  | "TIMEOUT_ERROR";      // Request timed out

/**
 * Base error class for all Gemini-related failures
 * Provides structured error information for proper handling and retry logic
 */
export class GeminiGenerationError extends Error {
  /**
   * Create a new Gemini generation error
   * 
   * @param message - Human-readable error message
   * @param code - Specific error code for programmatic handling
   * @param retryable - Whether this error condition might succeed on retry
   * @param metadata - Additional error context for debugging
   */
  constructor(
    message: string,
    public readonly code: GeminiErrorCode,
    public readonly retryable: boolean,
    public readonly metadata?: Record<string, unknown>
  ) {
    super(message);
    this.name = "GeminiGenerationError";
    
    // Capture stack trace for better debugging
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, GeminiGenerationError);
    }
  }

  /**
   * Convert error to a structured object for logging or API responses
   */
  toObject(): {
    name: string;
    message: string;
    code: GeminiErrorCode;
    retryable: boolean;
    metadata?: Record<string, unknown>;
  } {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      retryable: this.retryable,
      metadata: this.metadata,
    };
  }
}

/**
 * Specific error for API rate limiting
 * Includes information about retry timing
 */
export class GeminiRateLimitError extends GeminiGenerationError {
  constructor(
    message: string = "API rate limit exceeded",
    public readonly retryAfter?: number // Seconds to wait before retry
  ) {
    super(message, "RATE_LIMIT", true, { retryAfter });
  }
}

/**
 * Error for invalid JSON or response format from Gemini
 */
export class GeminiResponseError extends GeminiGenerationError {
  constructor(
    message: string,
    public readonly rawResponse?: string
  ) {
    super(message, "INVALID_RESPONSE", true, { rawResponse });
  }
}

/**
 * Error for content that fails validation
 */
export class GeminiValidationError extends GeminiGenerationError {
  constructor(
    message: string,
    public readonly validationDetails?: string[]
  ) {
    super(message, "VALIDATION_ERROR", true, { validationDetails });
  }
}

/**
 * Error factory functions for common error scenarios
 */
export const createGeminiError = {
  /**
   * Create a rate limit error from API response
   */
  rateLimit: (retryAfter?: number): GeminiRateLimitError => {
    return new GeminiRateLimitError(
      `API rate limit exceeded${retryAfter ? `. Retry after ${retryAfter} seconds` : ""}`,
      retryAfter
    );
  },

  /**
   * Create an invalid response error
   */
  invalidResponse: (rawResponse: string, parseError?: Error): GeminiResponseError => {
    return new GeminiResponseError(
      `Invalid JSON response from Gemini${parseError ? `: ${parseError.message}` : ""}`,
      rawResponse
    );
  },

  /**
   * Create a validation error
   */
  validation: (details: string[]): GeminiValidationError => {
    return new GeminiValidationError(
      `Generated content failed validation: ${details.join(", ")}`,
      details
    );
  },

  /**
   * Create a general API error
   */
  apiError: (message: string, retryable: boolean = true): GeminiGenerationError => {
    return new GeminiGenerationError(message, "API_ERROR", retryable);
  },

  /**
   * Create a service disabled error
   */
  disabled: (): GeminiGenerationError => {
    return new GeminiGenerationError(
      "Gemini service is disabled. Check GEMINI_API_KEY configuration.",
      "DISABLED",
      false
    );
  },

  /**
   * Create a network error
   */
  network: (originalError: Error): GeminiGenerationError => {
    return new GeminiGenerationError(
      `Network error: ${originalError.message}`,
      "NETWORK_ERROR",
      true,
      { originalError: originalError.message }
    );
  },

  /**
   * Create a timeout error
   */
  timeout: (timeoutMs: number): GeminiGenerationError => {
    return new GeminiGenerationError(
      `Request timed out after ${timeoutMs}ms`,
      "TIMEOUT_ERROR", 
      true,
      { timeoutMs }
    );
  },
};

/**
 * Utility function to determine if an error is retryable
 */
export function isRetryableError(error: unknown): boolean {
  if (error instanceof GeminiGenerationError) {
    return error.retryable;
  }
  return false;
}

/**
 * Utility function to extract retry delay from error
 */
export function getRetryDelay(error: unknown): number | null {
  if (error instanceof GeminiRateLimitError && error.retryAfter) {
    return error.retryAfter * 1000; // Convert to milliseconds
  }
  return null;
}