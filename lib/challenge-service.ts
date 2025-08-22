/**
 * Challenge Service - Generates deterministic daily challenges
 * 
 * This service creates consistent daily challenges that are the same
 * for all users globally, similar to how Wordle works.
 */

export interface DailyChallenge {
  id: string;
  date: string; // YYYY-MM-DD format
  content: string;
  title: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

// Pool of code challenges for different difficulty levels
const CHALLENGE_POOL = {
  easy: [
    {
      content: `function hello() {
  console.log("Hello, World!");
}`,
      title: "Basic Function - Hello World"
    },
    {
      content: `const sum = (a, b) => {
  return a + b;
};`,
      title: "Arrow Function - Sum"
    },
    {
      content: `for (let i = 0; i < 5; i++) {
  console.log(i);
}`,
      title: "Simple Loop"
    }
  ],
  medium: [
    {
      content: `function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}`,
      title: "Recursive Function - Fibonacci"
    },
    {
      content: `const factorial = (n) => {
  if (n === 0) return 1;
  return n * factorial(n - 1);
};`,
      title: "Recursive Function - Factorial"
    },
    {
      content: `function isPrime(num) {
  if (num <= 1) return false;
  for (let i = 2; i < num; i++) {
    if (num % i === 0) return false;
  }
  return true;
}`,
      title: "Algorithm - Prime Number Check"
    }
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
      title: "Algorithm - Quick Sort"
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
      title: "Data Structure - Binary Tree"
    }
  ]
};

/**
 * Simple hash function to convert date string to number
 */
function hashDate(dateString: string): number {
  let hash = 0;
  for (let i = 0; i < dateString.length; i++) {
    const char = dateString.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Get today's date in YYYY-MM-DD format (UTC)
 */
export function getTodaysDate(): string {
  const now = new Date();
  const utc = new Date(now.getTime() + now.getTimezoneOffset() * 60000);
  return utc.toISOString().split('T')[0];
}

/**
 * Generate a deterministic challenge for a given date
 */
export function generateChallengeForDate(date: string): DailyChallenge {
  const hash = hashDate(date);
  
  // Determine difficulty based on day of week (cycle through difficulties)
  const daysSinceEpoch = Math.floor(new Date(date).getTime() / (1000 * 60 * 60 * 24));
  const difficultyIndex = daysSinceEpoch % 3;
  const difficulties: Array<'easy' | 'medium' | 'hard'> = ['easy', 'medium', 'hard'];
  const difficulty = difficulties[difficultyIndex];
  
  // Select challenge from pool based on hash
  const pool = CHALLENGE_POOL[difficulty];
  const challengeIndex = hash % pool.length;
  const challenge = pool[challengeIndex];
  
  return {
    id: `${date}-${difficulty}-${challengeIndex}`,
    date,
    content: challenge.content,
    title: challenge.title,
    difficulty
  };
}

/**
 * Get today's challenge
 */
export function getTodaysChallenge(): DailyChallenge {
  const today = getTodaysDate();
  return generateChallengeForDate(today);
}

/**
 * Get challenge for a specific date (for testing or historical data)
 */
export function getChallengeForDate(date: string): DailyChallenge {
  return generateChallengeForDate(date);
}