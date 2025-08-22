/**
 * AI Challenge Generator
 * Integrates Gemini API with the existing challenge system
 */

import type { DailyChallenge } from './challenge-service';
import { getGeminiService, GeminiGenerationError, validateGeneratedCode } from './gemini-service';
import { isGeminiEnabled } from './env';

interface GenerationOptions {
  date: string;
  difficulty: 'easy' | 'medium' | 'hard';
  retries?: number;
}

interface GenerationResult {
  challenge: DailyChallenge;
  promptUsed: string;
  generatedBy: 'gemini' | 'static';
}

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

/**
 * Generate a challenge using AI or fallback to static pool
 */
export async function generateDailyChallenge(
  options: GenerationOptions
): Promise<GenerationResult> {
  const { date, difficulty, retries = MAX_RETRIES } = options;

  // If Gemini is not enabled, use static fallback immediately
  if (!isGeminiEnabled()) {
    console.log('Gemini not enabled, using static challenge');
    return generateStaticFallback(date, difficulty);
  }

  try {
    const geminiService = getGeminiService();
    const response = await geminiService.generateChallenge(difficulty);

    // Validate the generated code
    if (!validateGeneratedCode(response.content)) {
      throw new GeminiGenerationError(
        'Generated code failed validation',
        'INVALID_RESPONSE',
        true
      );
    }

    const challenge: DailyChallenge = {
      id: `${date}-gemini-${difficulty}`,
      date,
      content: response.content.trim(),
      title: response.title,
      difficulty,
    };

    return {
      challenge,
      promptUsed: `Generated ${difficulty} challenge for ${date}`,
      generatedBy: 'gemini',
    };

  } catch (error) {
    console.error(`Failed to generate AI challenge (attempt ${MAX_RETRIES - retries + 1}):`, error);

    // If we have retries left and the error is retryable, try again
    if (retries > 0 && error instanceof GeminiGenerationError && error.retryable) {
      console.log(`Retrying in ${RETRY_DELAY_MS}ms...`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
      
      return generateDailyChallenge({
        ...options,
        retries: retries - 1,
      });
    }

    // If all retries failed, fall back to static challenges
    console.log('All AI generation attempts failed, falling back to static challenge');
    return generateStaticFallback(date, difficulty);
  }
}

/**
 * Generate a static challenge as fallback
 * Uses the existing static challenge pool
 */
function generateStaticFallback(date: string, difficulty: 'easy' | 'medium' | 'hard'): GenerationResult {
  // Import the existing challenge generation logic
  const { generateChallengeForDate } = require('./challenge-service');
  
  // Generate using the existing deterministic method
  const staticChallenge = generateChallengeForDate(date);
  
  // Override the difficulty if needed
  const challenge: DailyChallenge = {
    ...staticChallenge,
    difficulty,
    id: `${date}-static-${difficulty}`,
  };

  return {
    challenge,
    promptUsed: `Static fallback for ${difficulty} challenge`,
    generatedBy: 'static',
  };
}

/**
 * Get the difficulty for a given date
 * Cycles through difficulties: easy → medium → hard
 */
export function getDifficultyForDate(date: string): 'easy' | 'medium' | 'hard' {
  const daysSinceEpoch = Math.floor(new Date(date).getTime() / (1000 * 60 * 60 * 24));
  const difficultyIndex = daysSinceEpoch % 3;
  const difficulties: Array<'easy' | 'medium' | 'hard'> = ['easy', 'medium', 'hard'];
  return difficulties[difficultyIndex];
}

/**
 * Generate today's challenge with proper difficulty rotation
 */
export async function generateTodaysChallenge(): Promise<GenerationResult> {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const difficulty = getDifficultyForDate(today);
  
  return generateDailyChallenge({
    date: today,
    difficulty,
  });
}

/**
 * Batch generate challenges for multiple days (useful for testing or pre-generation)
 */
export async function batchGenerateChallenges(
  startDate: string,
  days: number
): Promise<GenerationResult[]> {
  const results: GenerationResult[] = [];
  
  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];
    
    const difficulty = getDifficultyForDate(dateStr);
    
    try {
      const result = await generateDailyChallenge({
        date: dateStr,
        difficulty,
      });
      results.push(result);
      
      // Add small delay between requests to be respectful to the API
      if (i < days - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    } catch (error) {
      console.error(`Failed to generate challenge for ${dateStr}:`, error);
      // Continue with other days even if one fails
    }
  }
  
  return results;
}