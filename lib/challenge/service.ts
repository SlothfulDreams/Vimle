/**
 * Challenge Service
 * Main service for generating and managing daily challenges
 * Handles both AI-generated and static challenges
 */

import {
  generateTodaysChallenge as generateAIChallenge,
  isAIEnabled,
} from "@/lib/ai-generation";
import { logger } from "@/lib/logger";
import type { DailyChallenge } from "@/types";
import {
  getChallengeFromPool,
  getPoolSize,
  validateChallengePool,
} from "./static-pool";
import type {
  ChallengeGenerationOptions,
  ChallengeGenerationResult,
  ChallengeMetadata,
  ChallengeServiceConfig,
  ChallengeValidationResult,
} from "./types";

/**
 * Default service configuration
 */
const DEFAULT_CONFIG: ChallengeServiceConfig = {
  preferAI: true,
  enableFallback: true,
  difficultyWeights: {
    easy: 0.4, // 40% easy
    medium: 0.4, // 40% medium
    hard: 0.2, // 20% hard
  },
  validation: {
    enabled: true,
    minQualityScore: 0.7,
    rejectWithWarnings: false,
  },
};

/**
 * Main Challenge Service class
 * Orchestrates challenge generation from various sources
 */
export class ChallengeService {
  private config: ChallengeServiceConfig;

  constructor(config: Partial<ChallengeServiceConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    logger.debug("ChallengeService initialized", { config: this.config });
  }

  /**
   * Generate today's challenge using the best available method
   *
   * @param options - Generation options
   * @returns Promise resolving to generated challenge
   */
  async generateTodaysChallenge(
    options: Partial<ChallengeGenerationOptions> = {},
  ): Promise<ChallengeGenerationResult> {
    const today = getTodaysDate();
    const difficulty =
      options.difficulty ||
      getDifficultyForDate(today, this.config.difficultyWeights);

    const fullOptions: ChallengeGenerationOptions = {
      date: today,
      difficulty,
      language: "javascript", // Default to JavaScript
      allowFallback: this.config.enableFallback,
      ...options,
    };

    logger.info("Generating today's challenge", fullOptions);

    // If AI is preferred and available, try AI generation first
    if (this.config.preferAI && isAIEnabled() && !options.forceAI === false) {
      try {
        const result = await this.generateAIChallenge(fullOptions);
        logger.info("Successfully generated AI challenge", {
          challengeId: result.challenge.id,
          source: result.metadata.source,
        });
        return result;
      } catch (error) {
        logger.warn("AI challenge generation failed", {
          error: error instanceof Error ? error.message : String(error),
        });

        // Fall back to static if enabled
        if (fullOptions.allowFallback) {
          logger.info("Falling back to static challenge");
          return this.generateStaticChallenge(fullOptions);
        }

        throw error;
      }
    }

    // Use static challenge generation
    return this.generateStaticChallenge(fullOptions);
  }

  /**
   * Generate a challenge using AI services
   */
  private async generateAIChallenge(
    options: ChallengeGenerationOptions,
  ): Promise<ChallengeGenerationResult> {
    const startTime = Date.now();

    try {
      const aiResult = await generateAIChallenge({
        date: options.date,
        difficulty: options.difficulty,
      });

      const metadata: ChallengeMetadata = {
        source: aiResult.generatedBy as "gemini", // Type assertion for now
        createdAt: new Date(),
        generationTimeMs: aiResult.metadata?.generationTimeMs,
        originalPrompt: aiResult.promptUsed,
        validationStatus: "validated", // Assume AI validation passed
      };

      return {
        challenge: aiResult.challenge,
        metadata,
      };
    } catch (error) {
      const generationTime = Date.now() - startTime;
      logger.error("AI challenge generation failed", {
        duration: generationTime,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Generate a challenge using static pool
   */
  private generateStaticChallenge(
    options: ChallengeGenerationOptions,
  ): ChallengeGenerationResult {
    const { date, difficulty } = options;

    // Generate deterministic index based on date
    const challengeIndex = hashString(date);
    const staticChallenge = getChallengeFromPool(difficulty, challengeIndex);

    const challenge: DailyChallenge = {
      id: `${date}-static-${difficulty}`,
      date,
      content: staticChallenge.content,
      title: staticChallenge.title,
      difficulty,
    };

    const metadata: ChallengeMetadata = {
      source: "static",
      createdAt: new Date(),
      validationStatus: "validated", // Static challenges are pre-validated
    };

    logger.info("Generated static challenge", {
      challengeId: challenge.id,
      title: challenge.title,
    });

    return {
      challenge,
      metadata,
    };
  }

  /**
   * Validate a challenge for quality and appropriateness
   */
  validateChallenge(challenge: DailyChallenge): ChallengeValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Basic validation
    if (!challenge.content || challenge.content.trim().length < 10) {
      errors.push("Challenge content is too short");
    }

    if (!challenge.title || challenge.title.trim().length < 3) {
      errors.push("Challenge title is too short");
    }

    if (challenge.content && challenge.content.length > 1000) {
      warnings.push("Challenge content is quite long");
    }

    // Vim practice validation
    const vimScore = this.calculateVimPracticeScore(challenge.content);
    if (vimScore < 0.3) {
      warnings.push(
        "Challenge may not provide good vim practice opportunities",
      );
    }

    // Quality score based on various factors
    const qualityScore = this.calculateQualityScore(challenge);

    return {
      isValid:
        errors.length === 0 &&
        qualityScore >= this.config.validation.minQualityScore,
      errors,
      warnings,
      qualityScore,
      vimPracticeScore: vimScore,
    };
  }

  /**
   * Get service statistics and health information
   */
  getServiceInfo(): {
    staticPool: { total: number; byDifficulty: Record<string, number> };
    aiEnabled: boolean;
    config: ChallengeServiceConfig;
    poolValidation: { valid: boolean; errors: string[]; warnings: string[] };
  } {
    return {
      staticPool: getPoolSize(),
      aiEnabled: isAIEnabled(),
      config: this.config,
      poolValidation: validateChallengePool(),
    };
  }

  /**
   * Calculate vim practice score based on content analysis
   */
  private calculateVimPracticeScore(content: string): number {
    let score = 0;
    const maxScore = 10;

    // Check for various vim practice opportunities
    const factors = [
      { pattern: /[{}]/g, points: 2, description: "brace matching" },
      { pattern: /[[\]]/g, points: 1, description: "bracket navigation" },
      { pattern: /['"]/g, points: 1, description: "quote handling" },
      { pattern: /\b\w{4,}\b/g, points: 1, description: "word navigation" },
      { pattern: /^\s+/gm, points: 2, description: "indentation practice" },
      { pattern: /\n/g, points: 1, description: "multi-line navigation" },
      { pattern: /[()]/g, points: 1, description: "parentheses navigation" },
      { pattern: /[;,]/g, points: 1, description: "punctuation navigation" },
    ];

    factors.forEach((factor) => {
      const matches = content.match(factor.pattern);
      if (matches && matches.length > 0) {
        score += Math.min(factor.points, matches.length * 0.1);
      }
    });

    return Math.min(score / maxScore, 1);
  }

  /**
   * Calculate overall quality score for a challenge
   */
  private calculateQualityScore(challenge: DailyChallenge): number {
    let score = 0.5; // Base score

    // Content length (optimal range)
    const contentLength = challenge.content.length;
    if (contentLength >= 50 && contentLength <= 500) {
      score += 0.2;
    } else if (contentLength >= 20 && contentLength <= 800) {
      score += 0.1;
    }

    // Line count
    const lineCount = challenge.content.split("\n").length;
    if (lineCount >= 3 && lineCount <= 15) {
      score += 0.1;
    }

    // Character variety
    const uniqueChars = new Set(challenge.content.replace(/\s/g, "")).size;
    if (uniqueChars >= 10) {
      score += 0.1;
    }

    // Has code structure
    const codePatterns = [
      /function\s+\w+/,
      /const\s+\w+\s*=/,
      /class\s+\w+/,
      /for\s*\(/,
      /while\s*\(/,
      /if\s*\(/,
    ];

    if (codePatterns.some((pattern) => pattern.test(challenge.content))) {
      score += 0.1;
    }

    return Math.min(score, 1);
  }
}

/**
 * Get today's date in YYYY-MM-DD format
 */
export function getTodaysDate(): string {
  return new Date().toISOString().split("T")[0];
}

/**
 * Get difficulty for a specific date using deterministic algorithm
 */
export function getDifficultyForDate(
  date: string,
  weights = DEFAULT_CONFIG.difficultyWeights,
): "easy" | "medium" | "hard" {
  const hash = hashString(date);
  const random = (hash % 1000) / 1000; // Normalize to 0-1

  if (random < weights.easy) {
    return "easy";
  } else if (random < weights.easy + weights.medium) {
    return "medium";
  } else {
    return "hard";
  }
}

/**
 * Simple hash function for deterministic randomness
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Legacy function for backward compatibility
 * @deprecated Use ChallengeService.generateTodaysChallenge instead
 */
export function getTodaysChallenge(): DailyChallenge {
  const service = new ChallengeService();
  // This is a simplified sync version for backward compatibility
  // In practice, should be replaced with async calls
  const result = service.generateTodaysChallenge();
  if (result instanceof Promise) {
    throw new Error("Legacy function cannot handle async operations");
  }
  return (result as any).challenge; // Type assertion for compatibility
}

/**
 * Legacy function for backward compatibility
 * @deprecated Use ChallengeService.generateTodaysChallenge instead
 */
export function generateChallengeForDate(date: string): DailyChallenge {
  const difficulty = getDifficultyForDate(date);
  const challengeIndex = hashString(date);
  const staticChallenge = getChallengeFromPool(difficulty, challengeIndex);

  return {
    id: `${date}-static-${difficulty}`,
    date,
    content: staticChallenge.content,
    title: staticChallenge.title,
    difficulty,
  };
}

// Export default service instance
export const challengeService = new ChallengeService();
