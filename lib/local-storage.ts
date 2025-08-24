/**
 * Local Storage Service for Anonymous Users
 *
 * Provides daily challenge completion tracking for users without accounts.
 * Ensures single attempt per day even for anonymous users.
 */

export interface LocalChallengeAttempt {
  challengeId: string;
  challengeDate: string; // YYYY-MM-DD
  completedAt: string; // ISO string
  timeMs: number;
  difficulty: string;
}

const STORAGE_KEY = "vimle_challenge_attempts";

/**
 * Get all stored challenge attempts from localStorage
 */
function getStoredAttempts(): LocalChallengeAttempt[] {
  if (typeof window === "undefined") return [];

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error("Failed to parse stored challenge attempts:", error);
    return [];
  }
}

/**
 * Save challenge attempts to localStorage
 */
function saveAttempts(attempts: LocalChallengeAttempt[]): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(attempts));
  } catch (error) {
    console.error("Failed to save challenge attempts:", error);
  }
}

/**
 * Get user's attempt for a specific date
 */
export function getLocalAttemptForDate(
  date: string,
): LocalChallengeAttempt | null {
  const attempts = getStoredAttempts();
  return attempts.find((attempt) => attempt.challengeDate === date) || null;
}

/**
 * Get user's attempt for today
 */
export function getTodaysLocalAttempt(): LocalChallengeAttempt | null {
  const today = new Date().toISOString().split("T")[0];
  return getLocalAttemptForDate(today);
}

/**
 * Check if user has completed today's challenge
 */
export function hasCompletedTodaysChallenge(): boolean {
  return getTodaysLocalAttempt() !== null;
}

/**
 * Save a new challenge completion
 */
export function saveLocalCompletion(
  challengeId: string,
  challengeDate: string,
  timeMs: number,
  difficulty: string,
): void {
  const attempts = getStoredAttempts();

  // Check if already completed this date (prevent duplicates)
  const existingIndex = attempts.findIndex(
    (attempt) => attempt.challengeDate === challengeDate,
  );

  const newAttempt: LocalChallengeAttempt = {
    challengeId,
    challengeDate,
    completedAt: new Date().toISOString(),
    timeMs,
    difficulty,
  };

  if (existingIndex >= 0) {
    // Update existing attempt (shouldn't happen in normal flow, but safety check)
    attempts[existingIndex] = newAttempt;
  } else {
    // Add new attempt
    attempts.push(newAttempt);
  }

  // Keep only last 30 days to prevent localStorage bloat
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const cutoffDate = thirtyDaysAgo.toISOString().split("T")[0];

  const filteredAttempts = attempts.filter(
    (attempt) => attempt.challengeDate >= cutoffDate,
  );

  saveAttempts(filteredAttempts);
}

/**
 * Get all challenge attempts (for stats/history)
 */
export function getAllLocalAttempts(): LocalChallengeAttempt[] {
  return getStoredAttempts();
}

/**
 * Get user statistics from local attempts
 */
export function getLocalStats() {
  const attempts = getStoredAttempts();
  const completedAttempts = attempts.filter((attempt) => attempt.timeMs > 0);

  if (completedAttempts.length === 0) {
    return {
      totalAttempts: 0,
      completedChallenges: 0,
      averageTime: 0,
      currentStreak: 0,
      bestTime: null,
    };
  }

  const totalTime = completedAttempts.reduce(
    (sum, attempt) => sum + attempt.timeMs,
    0,
  );
  const averageTime = totalTime / completedAttempts.length;
  const bestTime = Math.min(
    ...completedAttempts.map((attempt) => attempt.timeMs),
  );

  // Calculate current streak
  let currentStreak = 0;
  const sortedAttempts = [...completedAttempts].sort((a, b) =>
    b.challengeDate.localeCompare(a.challengeDate),
  );

  let currentDate = new Date();
  for (const attempt of sortedAttempts) {
    const attemptDate = new Date(attempt.challengeDate);
    const daysDiff = Math.floor(
      (currentDate.getTime() - attemptDate.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (daysDiff === currentStreak) {
      currentStreak++;
      currentDate = attemptDate;
    } else {
      break;
    }
  }

  return {
    totalAttempts: attempts.length,
    completedChallenges: completedAttempts.length,
    averageTime,
    currentStreak,
    bestTime,
  };
}

/**
 * Clear all local storage data (for account migration or reset)
 */
export function clearLocalData(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Export local data for account migration
 */
export function exportLocalData(): LocalChallengeAttempt[] {
  return getStoredAttempts();
}
