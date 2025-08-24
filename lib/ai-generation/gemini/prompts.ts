/**
 * Gemini AI Prompt Templates
 * Structured prompts for generating code challenges at different difficulty levels
 */

export type DifficultyLevel = "easy" | "medium" | "hard";

/**
 * Base template structure for consistent prompt formatting
 */
interface PromptTemplate {
  requirements: string[];
  codeLength: string;
  concepts: string[];
  jsonFormat: string;
}

/**
 * Prompt configurations for each difficulty level
 */
const PROMPT_CONFIGS: Record<DifficultyLevel, PromptTemplate> = {
  easy: {
    requirements: [
      "3-5 lines of JavaScript/TypeScript code",
      "Basic syntax only (variables, simple functions, basic loops)",
      "Create starting code with 1-2 simple differences from target",
      "Differences should be: variable names, string values, or simple operators",
      "Clear, readable code that a beginner would understand",
      "No complex algorithms or data structures",
    ],
    codeLength: "3-5 lines",
    concepts: [
      "variables",
      "simple functions",
      "basic loops",
      "string editing",
      "variable renaming",
    ],
    jsonFormat: "exact JSON format required",
  },

  medium: {
    requirements: [
      "6-10 lines of JavaScript/TypeScript code",
      "Intermediate concepts (objects, arrays, conditionals, loops)",
      "Create starting code with 2-4 moderate differences from target",
      "Differences should be: function parameters, array/object properties, conditional operators, method names",
      "Moderately complex logic but still readable",
      "May include simple algorithms or data manipulation",
    ],
    codeLength: "6-10 lines",
    concepts: [
      "objects",
      "arrays",
      "conditionals",
      "loops",
      "simple algorithms",
      "parameter editing",
      "property changes",
    ],
    jsonFormat: "exact JSON format required",
  },

  hard: {
    requirements: [
      "8-15 lines of JavaScript/TypeScript code",
      "Advanced concepts (classes, recursion, complex data structures)",
      "Create starting code with 3-6 challenging differences from target",
      "Differences should be: class method names, recursive base cases, data structure operations, algorithm logic, design pattern implementations",
      "Challenging logic that requires careful editing and multiple vim commands",
      "May include algorithms, design patterns, or complex functions",
    ],
    codeLength: "8-15 lines",
    concepts: [
      "classes",
      "recursion",
      "complex data structures",
      "algorithms",
      "design patterns",
      "method refactoring",
      "logic changes",
    ],
    jsonFormat: "exact JSON format required",
  },
};

/**
 * JSON response format specification for editing challenges
 */
const JSON_RESPONSE_FORMAT = `{
  "startingContent": "the incomplete/incorrect code that users start with",
  "content": "the final correct code that users should match",
  "title": "descriptive title starting with the language/concept",
  "explanation": "brief explanation of the editing challenge"
}`;

/**
 * Generate a structured prompt for the specified difficulty level
 */
function createPrompt(difficulty: DifficultyLevel): string {
  const config = PROMPT_CONFIGS[difficulty];
  const difficultyText =
    difficulty === "easy"
      ? "simple"
      : difficulty === "medium"
        ? "intermediate"
        : "advanced";

  return `Generate a ${difficultyText} Vim editing practice challenge${
    difficulty === "easy" ? " for beginners" : ""
  }:

This should be an EDITING challenge where users start with incomplete/incorrect code and need to edit it to match the target.

Requirements:
${config.requirements.map((req) => `- ${req}`).join("\n")}

IMPORTANT EDITING CHALLENGE RULES:
- startingContent should be a realistic "before" version with intentional differences
- content should be the "after" version that users need to achieve
- Focus on differences that require vim motion commands and editing skills
- Make sure both versions are syntactically valid JavaScript/TypeScript
- The editing should feel natural - like fixing bugs or refactoring code

Examples of good editing differences:
- Variable name changes (firstName → fullName)
- String value changes ("Hello" → "Welcome")
- Function parameter changes (x, y → width, height)
- Operator changes (=== → !==, && → ||)
- Method name changes (.map → .filter, .push → .unshift)
- Property name changes (user.name → user.displayName)

Return ONLY a JSON response in this exact format:
${JSON_RESPONSE_FORMAT}`;
}

/**
 * Main prompt templates exported for use in the Gemini service
 * These are the finalized prompts sent to the AI model
 */
export const PROMPT_TEMPLATES: Record<DifficultyLevel, string> = {
  easy: createPrompt("easy"),
  medium: createPrompt("medium"),
  hard: createPrompt("hard"),
} as const;

/**
 * Prompt generation configuration options
 */
export interface PromptOptions {
  /** Additional context to include in the prompt */
  context?: string;
  /** Specific programming language to focus on */
  language?: "javascript" | "typescript";
  /** Additional requirements to append */
  customRequirements?: string[];
}

/**
 * Generate a custom prompt with additional options
 * Useful for A/B testing or specialized challenge generation
 */
export function generateCustomPrompt(
  difficulty: DifficultyLevel,
  options: PromptOptions = {},
): string {
  let basePrompt = PROMPT_TEMPLATES[difficulty];

  if (options.language) {
    basePrompt = basePrompt.replace(
      "JavaScript/TypeScript",
      options.language === "javascript" ? "JavaScript" : "TypeScript",
    );
  }

  if (options.context) {
    basePrompt = `${options.context}\n\n${basePrompt}`;
  }

  if (options.customRequirements?.length) {
    const additionalReqs = options.customRequirements
      .map((req) => `- ${req}`)
      .join("\n");
    basePrompt = basePrompt.replace(
      "Return ONLY a JSON response",
      `${additionalReqs}\n\nReturn ONLY a JSON response`,
    );
  }

  return basePrompt;
}

/**
 * Get prompt configuration for analytics or debugging
 */
export function getPromptConfig(difficulty: DifficultyLevel): PromptTemplate {
  return PROMPT_CONFIGS[difficulty];
}
