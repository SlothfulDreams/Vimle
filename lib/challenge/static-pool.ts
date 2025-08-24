/**
 * Static Challenge Pool
 * Pre-defined code challenges for deterministic daily challenges
 * Used as fallback when AI generation is unavailable
 */

import type { DifficultyLevel } from "@/types";

/**
 * Structure for static challenge definitions
 */
export interface StaticChallenge {
  /** Code content to be edited */
  content: string;
  /** Human-readable title */
  title: string;
}

/**
 * Pool of static code challenges organized by difficulty
 * These provide consistent, high-quality challenges when AI is unavailable
 */
export const STATIC_CHALLENGE_POOL: Record<DifficultyLevel, StaticChallenge[]> =
  {
    easy: [
      {
        content: `function hello() {
  console.log("Hello, World!");
}`,
        title: "Basic Function - Hello World",
      },
      {
        content: `const sum = (a, b) => {
  return a + b;
};`,
        title: "Arrow Function - Sum",
      },
      {
        content: `for (let i = 0; i < 5; i++) {
  console.log(i);
}`,
        title: "Simple Loop",
      },
      {
        content: `const greeting = "Hello";
const name = "World";
console.log(greeting + " " + name);`,
        title: "Variables and String Concatenation",
      },
      {
        content: `function isEven(num) {
  return num % 2 === 0;
}`,
        title: "Simple Function - Even Check",
      },
      {
        content: `const numbers = [1, 2, 3, 4, 5];
console.log(numbers.length);`,
        title: "Array Basics",
      },
    ],

    medium: [
      {
        content: `function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}`,
        title: "Recursive Function - Fibonacci",
      },
      {
        content: `const factorial = (n) => {
  if (n === 0) return 1;
  return n * factorial(n - 1);
};`,
        title: "Recursive Function - Factorial",
      },
      {
        content: `function isPrime(num) {
  if (num <= 1) return false;
  for (let i = 2; i < num; i++) {
    if (num % i === 0) return false;
  }
  return true;
}`,
        title: "Algorithm - Prime Number Check",
      },
      {
        content: `function findMax(arr) {
  let max = arr[0];
  for (let i = 1; i < arr.length; i++) {
    if (arr[i] > max) {
      max = arr[i];
    }
  }
  return max;
}`,
        title: "Array Processing - Find Maximum",
      },
      {
        content: `const person = {
  name: "John",
  age: 30,
  greet() {
    return \`Hello, I'm \${this.name}\`;
  }
};`,
        title: "Object with Method",
      },
      {
        content: `function reverseString(str) {
  let reversed = "";
  for (let i = str.length - 1; i >= 0; i--) {
    reversed += str[i];
  }
  return reversed;
}`,
        title: "String Manipulation - Reverse",
      },
    ],

    hard: [
      {
        content: `function quickSort(arr) {
  if (arr.length <= 1) return arr;
  const pivot = arr[Math.floor(arr.length / 2)];
  const left = arr.filter(x => x < pivot);
  const right = arr.filter(x => x > pivot);
  return [...quickSort(left), pivot, ...quickSort(right)];
}`,
        title: "Algorithm - Quick Sort",
      },
      {
        content: `class BinaryTree {
  constructor(value) {
    this.value = value;
    this.left = null;
    this.right = null;
  }
  
  insert(value) {
    if (value < this.value) {
      this.left = this.left ? this.left.insert(value) : new BinaryTree(value);
    } else {
      this.right = this.right ? this.right.insert(value) : new BinaryTree(value);
    }
    return this;
  }
}`,
        title: "Data Structure - Binary Tree",
      },
      {
        content: `function memoize(fn) {
  const cache = {};
  return function(...args) {
    const key = JSON.stringify(args);
    if (key in cache) {
      return cache[key];
    }
    const result = fn.apply(this, args);
    cache[key] = result;
    return result;
  };
}`,
        title: "Higher-Order Function - Memoization",
      },
      {
        content: `class EventEmitter {
  constructor() {
    this.events = {};
  }
  
  on(event, listener) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(listener);
  }
  
  emit(event, ...args) {
    if (this.events[event]) {
      this.events[event].forEach(listener => listener(...args));
    }
  }
}`,
        title: "Design Pattern - Event Emitter",
      },
      {
        content: `function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}`,
        title: "Utility Function - Debounce",
      },
      {
        content: `async function asyncReduce(array, callback, initialValue) {
  let accumulator = initialValue;
  for (const item of array) {
    accumulator = await callback(accumulator, item);
  }
  return accumulator;
}`,
        title: "Async Programming - Reduce",
      },
    ],
  };

/**
 * Get total number of challenges in the pool
 */
export function getPoolSize(): {
  total: number;
  byDifficulty: Record<DifficultyLevel, number>;
} {
  const byDifficulty = {
    easy: STATIC_CHALLENGE_POOL.easy.length,
    medium: STATIC_CHALLENGE_POOL.medium.length,
    hard: STATIC_CHALLENGE_POOL.hard.length,
  };

  return {
    total: byDifficulty.easy + byDifficulty.medium + byDifficulty.hard,
    byDifficulty,
  };
}

/**
 * Get a challenge from the pool by difficulty and index
 */
export function getChallengeFromPool(
  difficulty: DifficultyLevel,
  index: number
): StaticChallenge {
  const pool = STATIC_CHALLENGE_POOL[difficulty];

  if (pool.length === 0) {
    throw new Error(`No challenges available for difficulty: ${difficulty}`);
  }

  // Wrap around if index exceeds pool size
  const normalizedIndex = index % pool.length;
  return pool[normalizedIndex];
}

/**
 * Get a random challenge from the pool
 */
export function getRandomChallengeFromPool(
  difficulty: DifficultyLevel
): StaticChallenge {
  const pool = STATIC_CHALLENGE_POOL[difficulty];

  if (pool.length === 0) {
    throw new Error(`No challenges available for difficulty: ${difficulty}`);
  }

  const randomIndex = Math.floor(Math.random() * pool.length);
  return pool[randomIndex];
}

/**
 * Validate that all challenges in the pool are properly formatted
 */
export function validateChallengePool(): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const [difficulty, challenges] of Object.entries(
    STATIC_CHALLENGE_POOL
  )) {
    if (challenges.length === 0) {
      warnings.push(`No challenges defined for difficulty: ${difficulty}`);
      continue;
    }

    challenges.forEach((challenge, index) => {
      const prefix = `${difficulty}[${index}]`;

      // Check required fields
      if (!challenge.content || challenge.content.trim().length === 0) {
        errors.push(`${prefix}: Missing or empty content`);
      }

      if (!challenge.title || challenge.title.trim().length === 0) {
        errors.push(`${prefix}: Missing or empty title`);
      }

      // Check content quality
      if (challenge.content && challenge.content.length < 10) {
        warnings.push(
          `${prefix}: Content is very short (${challenge.content.length} chars)`
        );
      }

      if (challenge.content && challenge.content.length > 1000) {
        warnings.push(
          `${prefix}: Content is very long (${challenge.content.length} chars)`
        );
      }

      // Basic syntax check
      if (
        challenge.content &&
        !challenge.content.includes("{") &&
        !challenge.content.includes("=")
      ) {
        warnings.push(
          `${prefix}: Content may not be valid JavaScript/TypeScript`
        );
      }
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
