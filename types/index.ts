/**
 * Shared type definitions for the Vimle application
 * This file contains all common types used across components and services
 */

export type DifficultyLevel = "easy" | "medium" | "hard";

/**
 * Represents a daily coding challenge
 */
export interface DailyChallenge {
  id: string;
  date: string;
  content: string;
  title: string;
  difficulty: DifficultyLevel;
}

/**
 * User's attempt at completing a challenge
 */
export interface ChallengeAttempt {
  id: string;
  userId: string;
  challengeId: string;
  completedAt?: Date;
  timeMs?: number;
  attemptDate: Date;
}

/**
 * Statistics for a specific challenge across all users
 */
export interface GlobalChallengeStats {
  averageTime: number;
  totalCompletions: number;
  fastestTime: number | null;
}

/**
 * Personal user statistics across all challenges
 */
export interface UserChallengeStats {
  totalAttempts: number;
  completedChallenges: number;
  averageTime: number;
  currentStreak: number;
  bestTime: number | null;
}

/**
 * Timer state for challenge completion tracking
 */
export interface TimerState {
  startTime: number | null;
  elapsedTime: number;
  isRunning: boolean;
}

/**
 * UI state for the challenge completion flow
 */
export interface ChallengeUIState {
  showTomorrowScreen: boolean;
  showCompletionModal: boolean;
  isSubmitting: boolean;
  submissionError: string | null;
}

/**
 * Vim motion types for editor interaction tracking
 */
export type VimMotion = "h" | "j" | "k" | "l" | "w" | "b" | "d" | "y" | "p" | "u" | "i" | "a" | "o";

/**
 * Editor configuration and state
 */
export interface EditorState {
  content: string;
  readonly: boolean;
  hasUserInteracted: boolean;
  resetTrigger: number;
}

/**
 * Props for the VimEditor component
 */
export interface VimEditorProps {
  onMotionCapture: (motion: VimMotion) => void;
  onContentChange?: (content: string) => void;
  onUserInteraction?: () => void;
  resetTrigger: number;
  readonly?: boolean;
  initialContent?: string;
}

/**
 * Authentication context state
 */
export interface AuthState {
  user: any | null; // TODO: Replace with proper User type from Supabase
  session: any | null; // TODO: Replace with proper Session type from Supabase
  loading: boolean;
}

/**
 * Challenge context state and actions
 */
export interface ChallengeContextState {
  todaysChallenge: DailyChallenge | null;
  userAttempt: ChallengeAttempt | null;
  isCompleted: boolean;
  canAttempt: boolean;
  loading: boolean;
  showTomorrowScreen: boolean;
  showCompletionModal: boolean;
}

/**
 * Local storage structure for offline challenge attempts
 */
export interface LocalChallengeAttempt {
  challengeId: string;
  challengeDate: string;
  completedAt: string;
  timeMs: number;
  difficulty: string;
}

/**
 * Error types for better error handling
 */
export type AppError = 
  | { type: "CHALLENGE_NOT_FOUND"; message: string }
  | { type: "SUBMISSION_FAILED"; message: string; details?: unknown }
  | { type: "AUTH_ERROR"; message: string }
  | { type: "NETWORK_ERROR"; message: string }
  | { type: "VALIDATION_ERROR"; message: string; field?: string };

/**
 * API response wrapper type
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: AppError;
}

/**
 * Utility type for making properties optional
 */
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/**
 * Utility type for making properties required
 */
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;