/**
 * Environment Variables Configuration
 * Provides type-safe access to environment variables
 */

export const env = {
  GEMINI_API_KEY: process.env.GEMINI_API_KEY!,
  GEMINI_MODEL: "gemini-1.5-flash",
} as const;

// Runtime validation
if (typeof window === "undefined") {
  // Only validate on server-side
  if (!env.GEMINI_API_KEY) {
    console.warn(
      "!  GEMINI_API_KEY is not set. AI challenge generation will be disabled.",
    );
  }
}

export const isGeminiEnabled = (): boolean => {
  return Boolean(env.GEMINI_API_KEY);
};

