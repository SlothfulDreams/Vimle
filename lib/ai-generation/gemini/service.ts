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
          `Cannot make API requests: ${error instanceof Error ? error.message : "Unknown error"}`,
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
    timeoutMs: number = DEFAULT_GEMINI_CONFIG.timeout!,
  ) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      // Note: Google AI SDK doesn't currently support AbortController
      // This is a placeholder for when it does, or for custom timeout handling
      const result = await this.model.generateContent(prompt);
      clearTimeout(timeout);
      return result;
    } catch (error) {
      clearTimeout(timeout);
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
    try {
      // Handle markdown code blocks if present
      const jsonMatch =
        text.match(/```json\n([\s\S]*?)\n```/) ||
        text.match(/```\n([\s\S]*?)\n```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : text;

      // Clean up any extra whitespace or formatting
      const cleanedJsonStr = jsonStr.trim();

      const parsed = JSON.parse(cleanedJsonStr);
      return geminiChallengeResponseSchema.parse(parsed);
    } catch (error) {
      logger.debug("Failed to parse Gemini response", {
        response: text,
        error,
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
      // Check for known error patterns
      if (error.message.includes("quota") || error.message.includes("rate")) {
        return createGeminiError.rateLimit();
      }

      if (
        error.message.includes("network") ||
        error.message.includes("fetch")
      ) {
        return createGeminiError.network(error);
      }

      return createGeminiError.apiError(error.message);
    }

    return createGeminiError.apiError("Unknown error occurred");
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
