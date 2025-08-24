import type React from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import type { DailyChallenge } from "@/types";
import { useAuth } from "./auth-context.js";
import {
  clearLocalData,
  getAllLocalAttempts,
  getTodaysLocalAttempt,
  saveLocalCompletion,
} from "./local-storage.js";

interface ChallengeAttempt {
  id: string;
  userId: string;
  challengeId: string;
  completedAt?: Date;
  timeMs?: number;
  attemptDate: Date;
}

interface ChallengeContextType {
  // Challenge data
  todaysChallenge: DailyChallenge | null;
  userAttempt: ChallengeAttempt | null;

  // State flags
  isCompleted: boolean;
  canAttempt: boolean;
  loading: boolean;

  // UI states
  showTomorrowScreen: boolean;
  showCompletionModal: boolean;

  // Actions
  submitCompletion: (timeMs: number) => Promise<void>;
  refreshChallenge: () => Promise<void>;
  setTomorrowScreen: (show: boolean) => void;
  setCompletionModal: (show: boolean) => void;
}

const ChallengeContext = createContext<ChallengeContextType | undefined>(
  undefined
);

export function ChallengeProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [todaysChallenge, setTodaysChallenge] = useState<DailyChallenge | null>(
    null
  );
  const [userAttempt, setUserAttempt] = useState<ChallengeAttempt | null>(null);
  const [loading, setLoading] = useState(true);
  const [localAttemptLoaded, setLocalAttemptLoaded] = useState(false);

  // UI state management
  const [showTomorrowScreen, setShowTomorrowScreen] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);

  // Load today's challenge (using static data for now)
  useEffect(() => {
    // TODO: Load from API or static data
    const mockChallenge: DailyChallenge = {
      id: "daily-" + new Date().toISOString().split("T")[0],
      date: new Date().toISOString().split("T")[0],
      title: "Sample Challenge",
      content: `function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}`,
      difficulty: "medium",
    };
    setTodaysChallenge(mockChallenge);
  }, []);

  // Load user attempt (from local storage for now)
  useEffect(() => {
    if (typeof window !== "undefined" && todaysChallenge) {
      const localAttempt = getTodaysLocalAttempt();
      if (localAttempt) {
        setUserAttempt({
          id: `local-${localAttempt.challengeDate}`,
          userId: user?.id || "anonymous",
          challengeId: localAttempt.challengeId,
          completedAt: new Date(localAttempt.completedAt),
          timeMs: localAttempt.timeMs,
          attemptDate: new Date(localAttempt.challengeDate),
        });
      }
      setLocalAttemptLoaded(true);
    }
  }, [todaysChallenge, user?.id]);

  // Check if tomorrow screen should be shown
  const getTomorrowScreenKey = useCallback(() => {
    if (!todaysChallenge) return null;
    return `tomorrow_screen_${todaysChallenge.date}`;
  }, [todaysChallenge]);

  const checkIfTomorrowScreenSeen = useCallback(() => {
    if (typeof window === "undefined") return true; // SSR safe default
    const tomorrowKey = getTomorrowScreenKey();
    if (!tomorrowKey) return true;
    return sessionStorage.getItem(tomorrowKey) === "true";
  }, [getTomorrowScreenKey]);

  // Handle loading state
  useEffect(() => {
    const attemptLoading = !localAttemptLoaded;
    setLoading(!todaysChallenge || attemptLoading);
  }, [todaysChallenge, user, localAttemptLoaded]);

  // Check if user has completed today's challenge (define before useEffect that uses it)
  const isCompleted = userAttempt?.completedAt != null;

  // User can attempt if they haven't completed it yet
  const canAttempt = !isCompleted;

  // Determine tomorrow screen visibility when challenge is completed
  useEffect(() => {
    if (!loading && isCompleted && todaysChallenge) {
      const tomorrowScreenSeen = checkIfTomorrowScreenSeen();

      if (!tomorrowScreenSeen) {
        setShowTomorrowScreen(true);

        // Mark tomorrow screen as seen when it's displayed
        const tomorrowKey = getTomorrowScreenKey();
        if (tomorrowKey && typeof window !== "undefined") {
          sessionStorage.setItem(tomorrowKey, "true");
        }
      }
    }
  }, [
    loading,
    isCompleted,
    todaysChallenge,
    checkIfTomorrowScreenSeen,
    getTomorrowScreenKey,
  ]);

  // Submit completion
  const submitCompletion = useCallback(
    async (timeMs: number) => {
      if (!todaysChallenge || !canAttempt) {
        throw new Error("Cannot submit completion at this time");
      }

      try {
        // Save to local storage for now (TODO: Add server submission)
        saveLocalCompletion(
          todaysChallenge.id,
          todaysChallenge.date,
          timeMs,
          todaysChallenge.difficulty
        );
        console.log("Challenge completed successfully (local)");

        // Update local state to reflect completion
        const newAttempt = {
          id: user ? `db-${Date.now()}` : `local-${todaysChallenge.date}`,
          userId: user?.id || "anonymous",
          challengeId: todaysChallenge.id,
          completedAt: new Date(),
          timeMs,
          attemptDate: new Date(),
        };

        setUserAttempt(newAttempt);

        // Show completion modal immediately after completion
        setShowCompletionModal(true);
      } catch (error) {
        console.error("Failed to submit completion:", error);
        throw error;
      }
    },
    [todaysChallenge, canAttempt, user]
  );

  // Refresh challenge data (simplified for local storage)
  const refreshChallenge = useCallback(async () => {
    // TODO: Add refresh logic when server endpoints are available
    console.log("Refresh requested");
  }, []);

  // Set tomorrow screen visibility
  const setTomorrowScreen = useCallback((show: boolean) => {
    setShowTomorrowScreen(show);
  }, []);

  // Set completion modal visibility
  const setCompletionModal = useCallback((show: boolean) => {
    setShowCompletionModal(show);
  }, []);

  const value: ChallengeContextType = {
    todaysChallenge,
    userAttempt,
    isCompleted,
    canAttempt,
    loading,
    showTomorrowScreen,
    showCompletionModal,
    submitCompletion,
    refreshChallenge,
    setTomorrowScreen,
    setCompletionModal,
  };

  return (
    <ChallengeContext.Provider value={value}>
      {children}
    </ChallengeContext.Provider>
  );
}

export function useChallenge() {
  const context = useContext(ChallengeContext);
  if (context === undefined) {
    throw new Error("useChallenge must be used within a ChallengeProvider");
  }
  return context;
}
