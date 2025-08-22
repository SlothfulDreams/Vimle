/**
 * Google Gemini API Service
 * Provides typed integration with Google's Generative AI
 */

import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import { env, isGeminiEnabled } from './env';
import { z } from 'zod';

// Response validation schema
const geminiChallengeResponseSchema = z.object({
  content: z.string().min(10).max(1000),
  title: z.string().min(5).max(100),
  explanation: z.string().optional(),
});

export type GeminiChallengeResponse = z.infer<typeof geminiChallengeResponseSchema>;

// Custom error types
export class GeminiGenerationError extends Error {
  constructor(
    message: string,
    public code: 'RATE_LIMIT' | 'INVALID_RESPONSE' | 'API_ERROR' | 'DISABLED',
    public retryable: boolean
  ) {
    super(message);
    this.name = 'GeminiGenerationError';
  }
}

// Structured prompts for different difficulty levels
const PROMPT_TEMPLATES = {
  easy: `Generate a simple Vim practice code snippet for beginners:

Requirements:
- 3-5 lines of JavaScript/TypeScript code
- Basic syntax only (variables, simple functions, basic loops)
- Clear, readable code that a beginner would understand
- No complex algorithms or data structures

Return ONLY a JSON response in this exact format:
{
  "content": "the code snippet here",
  "title": "descriptive title starting with the language/concept",
  "explanation": "brief explanation of what this code does"
}`,

  medium: `Generate an intermediate Vim practice code snippet:

Requirements:
- 6-10 lines of JavaScript/TypeScript code
- Intermediate concepts (objects, arrays, conditionals, loops)
- Moderately complex logic but still readable
- May include simple algorithms or data manipulation

Return ONLY a JSON response in this exact format:
{
  "content": "the code snippet here",
  "title": "descriptive title starting with the language/concept",
  "explanation": "brief explanation of what this code does"
}`,

  hard: `Generate an advanced Vim practice code snippet:

Requirements:
- 8-15 lines of JavaScript/TypeScript code
- Advanced concepts (classes, recursion, complex data structures)
- Challenging logic that requires careful editing
- May include algorithms, design patterns, or complex functions

Return ONLY a JSON response in this exact format:
{
  "content": "the code snippet here", 
  "title": "descriptive title starting with the language/concept",
  "explanation": "brief explanation of what this code does"
}`,
} as const;

class GeminiChallengeService {
  private model: GenerativeModel;

  constructor(apiKey: string) {
    const genAI = new GoogleGenerativeAI(apiKey);
    this.model = genAI.getGenerativeModel({ 
      model: env.GEMINI_MODEL,
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1024,
      },
    });
  }

  async generateChallenge(difficulty: 'easy' | 'medium' | 'hard'): Promise<GeminiChallengeResponse> {
    try {
      const prompt = PROMPT_TEMPLATES[difficulty];
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      return this.parseResponse(text);
    } catch (error) {
      console.error('Gemini API error:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('quota') || error.message.includes('rate')) {
          throw new GeminiGenerationError(
            'API rate limit exceeded',
            'RATE_LIMIT',
            true
          );
        }
      }

      throw new GeminiGenerationError(
        `Failed to generate challenge: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'API_ERROR',
        true
      );
    }
  }

  private parseResponse(text: string): GeminiChallengeResponse {
    try {
      // Handle markdown code blocks if present
      const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/```\n([\s\S]*?)\n```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : text;

      // Clean up any extra whitespace or formatting
      const cleanedJsonStr = jsonStr.trim();
      
      const parsed = JSON.parse(cleanedJsonStr);
      return geminiChallengeResponseSchema.parse(parsed);
    } catch (error) {
      console.error('Failed to parse Gemini response:', text);
      throw new GeminiGenerationError(
        'Invalid JSON response from Gemini',
        'INVALID_RESPONSE',
        true
      );
    }
  }
}

// Singleton instance
let geminiService: GeminiChallengeService | null = null;

export function getGeminiService(): GeminiChallengeService {
  if (!isGeminiEnabled()) {
    throw new GeminiGenerationError(
      'Gemini API is not configured',
      'DISABLED',
      false
    );
  }

  if (!geminiService) {
    geminiService = new GeminiChallengeService(env.GEMINI_API_KEY);
  }

  return geminiService;
}

// Validate if generated code looks reasonable
export function validateGeneratedCode(content: string): boolean {
  // Basic validation checks
  const minLength = 20;
  const maxLength = 2000;
  
  if (content.length < minLength || content.length > maxLength) {
    return false;
  }

  // Check for basic code characteristics
  const hasCodePatterns = /[{}();]/.test(content);
  const hasReasonableLines = content.split('\n').length >= 2;
  
  return hasCodePatterns && hasReasonableLines;
}