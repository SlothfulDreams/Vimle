/**
 * Gemini AI Service
 * Clean, focused service for interacting with Google's Generative AI API
 */

import {
  type GenerativeModel,
  GoogleGenerativeAI,
} from "@google/generative-ai";
import { logger } from "../../logger.js";
import { createGeminiError, GeminiGenerationError } from "./errors.js";
import { generateCustomPrompt, PROMPT_TEMPLATES } from "./prompts.js";
import {
  type ChallengeGenerationOptions,
  type ChallengeGenerationResult,
  DEFAULT_GEMINI_CONFIG,
  DEFAULT_TIMEOUT_MS,
  type GeminiChallengeResponse,
  type GeminiServiceStats,
  geminiChallengeResponseSchema,
  type HealthCheck,
  type ServiceHealth,
} from "./types.js";
import { validateOrThrow } from "./validator.js";

/**
 * Main service class for Gemini AI challenge generation
 * Handles API communication, response parsing, and error handling
 */
export class GeminiChallengeService {
  private model: GenerativeModel;
  private stats: GeminiServiceStats = {
    totalRequests: 0,
    successfulGenerations: 0,
    failures: 0,
    averageResponseTime: 0,
    lastError: undefined,
  };

  /**
   * Initialize the Gemini service with API configuration
   *
   * @param apiKey - Google AI API key
   * @param modelName - Gemini model to use (default: gemini-1.5-flash)
   */
  constructor(
    private readonly apiKey: string,
    private readonly modelName: string = "gemini-1.5-flash",
  ) {
    const genAI = new GoogleGenerativeAI(apiKey);
    this.model = genAI.getGenerativeModel({
      model: modelName,
      generationConfig: DEFAULT_GEMINI_CONFIG,
    });

    logger.info("Gemini service initialized", { model: modelName });
  }

  /**
   * Generate a code challenge using Gemini AI
   *
   * @param options - Generation options including difficulty and customizations
   * @returns Promise resolving to generated challenge data
   * @throws GeminiGenerationError on failure
   */
  async generateChallenge(
    options: ChallengeGenerationOptions,
  ): Promise<ChallengeGenerationResult> {
    const startTime = Date.now();
    this.stats.totalRequests++;

    try {
      logger.debug("Generating challenge", { difficulty: options.difficulty });

      // Generate the prompt
      const prompt =
        options.customContext || options.additionalRequirements?.length
          ? generateCustomPrompt(options.difficulty, {
              context: options.customContext,
              language: options.language,
              customRequirements: options.additionalRequirements,
            })
          : PROMPT_TEMPLATES[options.difficulty];

      // Make the API request
      const result = await this.makeRequest(prompt, options.config?.timeout);
      const response = await result.response;
      const text = response.text();

      // Parse and validate the response
      const parsedResponse = this.parseResponse(text);
      validateOrThrow(parsedResponse.content, options.difficulty);

      const generationTime = Date.now() - startTime;
      this.updateStats(generationTime, true);

      logger.info("Successfully generated challenge", {
        difficulty: options.difficulty,
        title: parsedResponse.title,
        generationTimeMs: generationTime,
      });

      return {
        response: parsedResponse,
        promptUsed: prompt,
        metadata: {
          generationTimeMs: generationTime,
          model: this.modelName,
          difficulty: options.difficulty,
          // Token count would be available if Gemini provides it
        },
      };
    } catch (error) {
      const generationTime = Date.now() - startTime;
      this.updateStats(generationTime, false);

      // Re-throw if already a GeminiGenerationError
      if (error instanceof GeminiGenerationError) {
        this.stats.lastError = error.message;
        logger.error("Gemini generation failed", error.toObject());
        throw error;
      }

      // Convert other errors to GeminiGenerationError
      const geminiError = this.handleUnknownError(error);
      this.stats.lastError = geminiError.message;
      logger.error(
        "Unexpected error in Gemini generation",
        geminiError.toObject(),
      );
      throw geminiError;
    }
  }

  /**
   * Check the health status of the Gemini service
   *
   * @returns Health check result with service status
   */
  async healthCheck(): Promise<HealthCheck> {
    const errors: string[] = [];

    // Check API key configuration
    const apiKeyConfigured = Boolean(this.apiKey && this.apiKey.length > 0);
    if (!apiKeyConfigured) {
      errors.push("API key is not configured");
    }

    // Try a simple test request if API key is configured
    let canMakeRequests = false;
    if (apiKeyConfigured) {
      try {
        await this.makeRequest("Test", 5000); // 5 second timeout
        canMakeRequests = true;
      } catch (error) {
        errors.push(
          `Cannot make API requests: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
        );
      }
    }

    // Determine overall health status
    let status: ServiceHealth;
    if (!apiKeyConfigured) {
      status = "disabled";
    } else if (errors.length === 0 && canMakeRequests) {
      status = "healthy";
    } else if (canMakeRequests) {
      status = "degraded";
    } else {
      status = "unhealthy";
    }

    return {
      status,
      timestamp: new Date(),
      details: {
        apiKeyConfigured,
        canMakeRequests,
        errors,
      },
    };
  }

  /**
   * Get service usage statistics
   *
   * @returns Current service statistics
   */
  getStats(): GeminiServiceStats {
    return { ...this.stats };
  }

  /**
   * Reset service statistics
   */
  resetStats(): void {
    this.stats = {
      totalRequests: 0,
      successfulGenerations: 0,
      failures: 0,
      averageResponseTime: 0,
      lastError: undefined,
    };
    logger.debug("Gemini service stats reset");
  }

  /**
   * Make a request to the Gemini API with timeout handling
   */
  private async makeRequest(
    prompt: string,
    timeoutMs: number = DEFAULT_TIMEOUT_MS,
  ) {
    const requestId = Date.now().toString(36);
    
    logger.debug("Making Gemini API request", {
      requestId,
      promptLength: prompt.length,
      promptPreview: prompt.substring(0, 100) + (prompt.length > 100 ? "..." : ""),
      timeoutMs,
      model: this.modelName,
      apiKeyConfigured: Boolean(this.apiKey),
      apiKeyPrefix: this.apiKey ? this.apiKey.substring(0, 10) + "..." : "NOT_CONFIGURED"
    });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const startTime = Date.now();
      
      // Note: Google AI SDK doesn't currently support AbortController
      // This is a placeholder for when it does, or for custom timeout handling
      const result = await this.model.generateContent(prompt);
      const requestTime = Date.now() - startTime;
      
      clearTimeout(timeout);
      
      logger.debug("Gemini API request completed", {
        requestId,
        requestTimeMs: requestTime,
        hasResponse: Boolean(result.response),
      });

      // Log the raw response for debugging
      try {
        const responseText = result.response.text();
        logger.debug("Raw Gemini API response", {
          requestId,
          responseLength: responseText.length,
          responsePreview: responseText.substring(0, 200) + (responseText.length > 200 ? "..." : ""),
          fullResponse: process.env.GEMINI_DEBUG === "true" ? responseText : undefined
        });
      } catch (responseError) {
        logger.error("Failed to extract response text", {
          requestId,
          error: responseError instanceof Error ? responseError.message : String(responseError)
        });
      }

      return result;
    } catch (error) {
      clearTimeout(timeout);
      
      // Enhanced error logging
      logger.error("Gemini API request failed", {
        requestId,
        error: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack,
        } : String(error),
        promptLength: prompt.length,
        timeoutMs,
        model: this.modelName,
        isAborted: controller.signal.aborted,
      });

      if (controller.signal.aborted) {
        throw createGeminiError.timeout(timeoutMs);
      }
      
      throw error;
    }
  }

  /**
   * Parse and validate the response from Gemini
   */
  private parseResponse(text: string): GeminiChallengeResponse {
    const debugId = Date.now().toString(36);
    
    logger.debug("Parsing Gemini response", {
      debugId,
      responseLength: text.length,
      responsePreview: text.substring(0, 300) + (text.length > 300 ? "..." : ""),
    });

    try {
      let jsonStr = "";

      // Try multiple JSON extraction strategies
      const strategies = [
        // Strategy 1: Standard markdown JSON block
        () => text.match(/```json\n([\s\S]*?)\n```/)?.[1],
        // Strategy 2: Generic markdown block
        () => text.match(/```\n([\s\S]*?)\n```/)?.[1],
        // Strategy 3: JSON block without newlines
        () => text.match(/```json([\s\S]*?)```/)?.[1],
        // Strategy 4: JSON wrapped in curly braces
        () => text.match(/\{[\s\S]*\}/)?.[0],
        // Strategy 5: No markdown, assume entire response is JSON
        () => text,
      ];

      for (let i = 0; i < strategies.length; i++) {
        const extracted = strategies[i]();
        if (extracted) {
          jsonStr = extracted.trim();
          logger.debug(`JSON extraction successful with strategy ${i + 1}`, {
            debugId,
            extractedLength: jsonStr.length,
            extractedPreview: jsonStr.substring(0, 200) + (jsonStr.length > 200 ? "..." : "")
          });
          break;
        }
      }

      if (!jsonStr) {
        logger.error("No JSON found in response", { debugId, fullResponse: text });
        throw new Error("No JSON content found in response");
      }

      // Clean up common formatting issues
      jsonStr = jsonStr
        .replace(/^\s+|\s+$/g, "") // trim whitespace
        .replace(/,\s*}/g, "}") // remove trailing commas
        .replace(/,\s*]/g, "]"); // remove trailing commas in arrays

      logger.debug("Attempting to parse JSON", {
        debugId,
        cleanedJsonLength: jsonStr.length,
        cleanedJsonPreview: jsonStr.substring(0, 200) + (jsonStr.length > 200 ? "..." : "")
      });

      let parsed;
      try {
        parsed = JSON.parse(jsonStr);
        logger.debug("JSON parsing successful", {
          debugId,
          parsedKeys: Object.keys(parsed),
          hasStartingContent: Boolean(parsed.startingContent),
          hasContent: Boolean(parsed.content),
          hasTitle: Boolean(parsed.title),
        });
      } catch (parseError) {
        logger.error("JSON parsing failed", {
          debugId,
          parseError: parseError instanceof Error ? parseError.message : String(parseError),
          jsonString: jsonStr
        });
        throw parseError;
      }

      // Validate with Zod schema
      try {
        const validated = geminiChallengeResponseSchema.parse(parsed);
        logger.debug("Zod validation successful", {
          debugId,
          titleLength: validated.title.length,
          contentLength: validated.content.length,
          startingContentLength: validated.startingContent?.length || 0,
        });
        return validated;
      } catch (zodError) {
        logger.error("Zod validation failed", {
          debugId,
          zodError: zodError instanceof Error ? zodError.message : String(zodError),
          parsedObject: parsed
        });
        throw zodError;
      }
    } catch (error) {
      logger.error("Complete response parsing failed", {
        debugId,
        error: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack
        } : String(error),
        originalResponse: text,
      });

      if (error instanceof Error) {
        throw createGeminiError.invalidResponse(text, error);
      }
      throw createGeminiError.invalidResponse(text);
    }
  }

  /**
   * Handle unknown errors and convert them to GeminiGenerationError
   */
  private handleUnknownError(error: unknown): GeminiGenerationError {
    if (error instanceof Error) {
      const errorMessage = error.message.toLowerCase();
      const errorName = error.name.toLowerCase();

      logger.debug("Analyzing error for classification", {
        name: error.name,
        message: error.message,
        stack: error.stack,
        constructor: error.constructor.name,
      });

      // Google AI SDK specific error patterns
      if (errorMessage.includes("api_key") || errorMessage.includes("authentication") || errorMessage.includes("unauthorized")) {
        logger.error("API key authentication error detected", {
          message: error.message,
          recommendation: "Check that GEMINI_API_KEY or GOOGLE_AI_API_KEY is correctly set"
        });
        return createGeminiError.apiError("Invalid or missing API key. Please check your GEMINI_API_KEY environment variable.", false);
      }

      if (errorMessage.includes("quota") || errorMessage.includes("rate") || errorMessage.includes("429")) {
        const retryAfter = this.extractRetryAfter(error.message);
        logger.warn("Rate limit error detected", {
          message: error.message,
          retryAfter,
          recommendation: "Wait before retrying or check your API quota"
        });
        return createGeminiError.rateLimit(retryAfter);
      }

      if (errorMessage.includes("model not found") || errorMessage.includes("invalid model")) {
        logger.error("Invalid model error detected", {
          message: error.message,
          currentModel: this.modelName,
          recommendation: "Check if the model name is correct"
        });
        return createGeminiError.apiError(`Invalid model: ${this.modelName}. Please check the model name in your configuration.`, false);
      }

      if (errorMessage.includes("safety") || errorMessage.includes("blocked") || errorMessage.includes("harmful")) {
        logger.warn("Content safety filter triggered", {
          message: error.message,
          recommendation: "The generated content was blocked by safety filters. Try a different prompt."
        });
        return createGeminiError.apiError("Content was blocked by safety filters. Try modifying the prompt.", true);
      }

      if (
        errorMessage.includes("network") ||
        errorMessage.includes("fetch") ||
        errorMessage.includes("timeout") ||
        errorMessage.includes("enotfound") ||
        errorMessage.includes("econnreset")
      ) {
        logger.warn("Network error detected", {
          message: error.message,
          recommendation: "Check internet connection and try again"
        });
        return createGeminiError.network(error);
      }

      if (errorMessage.includes("json") || errorMessage.includes("parse")) {
        logger.error("JSON parsing error detected", {
          message: error.message,
          recommendation: "The API response format may have changed"
        });
        return createGeminiError.invalidResponse("Failed to parse API response", error);
      }

      // Check for Google AI specific error structure
      if (error.constructor.name.includes("Google") || errorMessage.includes("generativeai")) {
        logger.error("Google AI SDK error detected", {
          name: error.name,
          message: error.message,
          recommendation: "This appears to be a Google AI SDK specific error"
        });
        return createGeminiError.apiError(`Google AI SDK Error: ${error.message}`, true);
      }

      // Generic error handling
      logger.warn("Unclassified error, treating as generic API error", {
        name: error.name,
        message: error.message,
      });
      return createGeminiError.apiError(error.message, true);
    }

    logger.error("Non-Error object thrown", { error });
    return createGeminiError.apiError("Unknown error occurred", true);
  }

  /**
   * Extract retry-after value from error messages
   */
  private extractRetryAfter(message: string): number | undefined {
    // Look for retry-after patterns in the error message
    const retryMatch = message.match(/retry.*?(\d+)/i) || message.match(/wait.*?(\d+)/i);
    if (retryMatch) {
      const seconds = parseInt(retryMatch[1], 10);
      return Number.isNaN(seconds) ? undefined : seconds;
    }
    return undefined;
  }

  /**
   * Update service statistics
   */
  private updateStats(responseTime: number, success: boolean): void {
    if (success) {
      this.stats.successfulGenerations++;
    } else {
      this.stats.failures++;
    }

    // Update average response time
    const totalTime =
      this.stats.averageResponseTime * (this.stats.totalRequests - 1) +
      responseTime;
    this.stats.averageResponseTime = Math.round(
      totalTime / this.stats.totalRequests,
    );
  }
}
