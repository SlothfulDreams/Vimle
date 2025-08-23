/**
 * Content validation for AI-generated code challenges
 * Ensures generated code meets quality and safety standards
 */

import { createGeminiError } from "./errors";
import type { ValidationResult } from "./types";

/**
 * Validation rules for generated code content
 */
const VALIDATION_RULES = {
  /** Minimum number of non-whitespace characters */
  minLength: 10,
  /** Maximum number of characters */
  maxLength: 1000,
  /** Maximum number of lines */
  maxLines: 20,
  /** Minimum number of lines for medium/hard challenges */
  minLinesForComplex: 3,
  /** Forbidden patterns that indicate malicious or inappropriate code */
  forbiddenPatterns: [
    /eval\s*\(/, // eval() calls
    /Function\s*\(/, // Function constructor
    /document\./, // DOM manipulation
    /window\./, // Window object access
    /process\./, // Node.js process access
    /require\s*\(/, // CommonJS requires
    /import\s*\(/, // Dynamic imports
    /fetch\s*\(/, // Network requests
    /XMLHttpRequest/, // AJAX requests
    /__proto__/, // Prototype pollution
    /constructor/, // Constructor access
    /localStorage/, // Local storage access
    /sessionStorage/, // Session storage access
    /alert\s*\(/, // Alert dialogs
    /confirm\s*\(/, // Confirm dialogs
    /prompt\s*\(/, // Prompt dialogs
  ],
  /** Required patterns for valid JavaScript/TypeScript */
  requiredPatterns: {
    // At least one of these should be present
    hasCodeStructure: [
      /function\s+\w+/, // Function declaration
      /const\s+\w+\s*=/, // Const declaration
      /let\s+\w+\s*=/, // Let declaration
      /var\s+\w+\s*=/, // Var declaration
      /class\s+\w+/, // Class declaration
      /\w+\s*=>\s*/, // Arrow function
      /for\s*\(/, // For loop
      /while\s*\(/, // While loop
      /if\s*\(/, // If statement
    ],
  },
};

/**
 * Validate generated code content for safety and quality
 *
 * @param content - The generated code string to validate
 * @param difficulty - Expected difficulty level for additional checks
 * @returns ValidationResult with status and any issues found
 */
export function validateGeneratedCode(
  content: string,
  difficulty?: "easy" | "medium" | "hard",
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Basic length validation
  if (!content || content.trim().length < VALIDATION_RULES.minLength) {
    errors.push(
      `Content must be at least ${VALIDATION_RULES.minLength} characters`,
    );
  }

  if (content.length > VALIDATION_RULES.maxLength) {
    errors.push(
      `Content must be less than ${VALIDATION_RULES.maxLength} characters`,
    );
  }

  // Line count validation
  const lines = content.split("\n");
  if (lines.length > VALIDATION_RULES.maxLines) {
    errors.push(
      `Content must have fewer than ${VALIDATION_RULES.maxLines} lines`,
    );
  }

  // Complexity validation for medium/hard challenges
  if (difficulty && ["medium", "hard"].includes(difficulty)) {
    const nonEmptyLines = lines.filter((line) => line.trim().length > 0);
    if (nonEmptyLines.length < VALIDATION_RULES.minLinesForComplex) {
      warnings.push(
        `${difficulty} challenges should have at least ${VALIDATION_RULES.minLinesForComplex} lines of code`,
      );
    }
  }

  // Security validation - check for forbidden patterns
  for (const pattern of VALIDATION_RULES.forbiddenPatterns) {
    if (pattern.test(content)) {
      errors.push(`Content contains forbidden pattern: ${pattern.source}`);
    }
  }

  // Structure validation - ensure it looks like valid code
  const hasValidStructure =
    VALIDATION_RULES.requiredPatterns.hasCodeStructure.some((pattern) =>
      pattern.test(content),
    );

  if (!hasValidStructure) {
    errors.push(
      "Content doesn't appear to contain valid JavaScript/TypeScript code structures",
    );
  }

  // Syntax validation (basic)
  if (!isValidJavaScriptSyntax(content)) {
    warnings.push("Content may have syntax errors (basic validation failed)");
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Basic JavaScript syntax validation
 * Not comprehensive, but catches obvious syntax errors
 */
function isValidJavaScriptSyntax(code: string): boolean {
  try {
    // Very basic check - count brackets and braces
    let braceCount = 0;
    let bracketCount = 0;
    let parenCount = 0;

    for (const char of code) {
      switch (char) {
        case "{":
          braceCount++;
          break;
        case "}":
          braceCount--;
          break;
        case "[":
          bracketCount++;
          break;
        case "]":
          bracketCount--;
          break;
        case "(":
          parenCount++;
          break;
        case ")":
          parenCount--;
          break;
      }

      // If any count goes negative, brackets are mismatched
      if (braceCount < 0 || bracketCount < 0 || parenCount < 0) {
        return false;
      }
    }

    // All brackets should be closed
    return braceCount === 0 && bracketCount === 0 && parenCount === 0;
  } catch {
    return false;
  }
}

/**
 * Validate that content is appropriate for vim editing practice
 * Checks for patterns that would make poor vim practice material
 */
export function validateVimPracticeContent(content: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Should have some variety in characters for good vim practice
  const charVariety = new Set(content.replace(/\s/g, "")).size;
  if (charVariety < 5) {
    warnings.push(
      "Content has low character variety, may not provide good vim practice",
    );
  }

  // Should have some indentation for vim practice
  const hasIndentation = /^\s+/m.test(content);
  if (!hasIndentation) {
    warnings.push(
      "Content lacks indentation, missing opportunity for vim practice",
    );
  }

  // Should have multiple lines for movement practice
  const lineCount = content.split("\n").filter((line) => line.trim()).length;
  if (lineCount < 2) {
    warnings.push("Single-line content provides limited vim movement practice");
  }

  // Check for good vim practice opportunities
  const practiceOpportunities = [
    { pattern: /\w+\(\)/, description: "function calls" },
    { pattern: /[{}]/, description: "brace matching" },
    { pattern: /[[\]]/, description: "bracket navigation" },
    { pattern: /['"]/g, description: "quote handling" },
    { pattern: /\b\w{4,}\b/g, description: "word navigation" },
  ];

  let opportunityCount = 0;
  for (const opportunity of practiceOpportunities) {
    if (opportunity.pattern.test(content)) {
      opportunityCount++;
    }
  }

  if (opportunityCount < 2) {
    warnings.push(
      "Content may not provide enough variety for comprehensive vim practice",
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Comprehensive validation combining all checks
 */
export function comprehensiveValidation(
  content: string,
  difficulty?: "easy" | "medium" | "hard",
): ValidationResult {
  const codeValidation = validateGeneratedCode(content, difficulty);
  const vimValidation = validateVimPracticeContent(content);

  return {
    isValid: codeValidation.isValid && vimValidation.isValid,
    errors: [...codeValidation.errors, ...vimValidation.errors],
    warnings: [...codeValidation.warnings, ...vimValidation.warnings],
  };
}

/**
 * Throw appropriate error if validation fails
 */
export function validateOrThrow(
  content: string,
  difficulty?: "easy" | "medium" | "hard",
): void {
  const result = comprehensiveValidation(content, difficulty);

  if (!result.isValid) {
    throw createGeminiError.validation(result.errors);
  }
}
