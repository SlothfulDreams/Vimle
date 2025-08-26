import type React from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import type { DailyChallenge } from "@/types";
import { trpc } from "@/trpc/client";
import { useAuth } from "./auth-context.js";
import {
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
  undefined,
);

export function ChallengeProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [todaysChallenge, setTodaysChallenge] = useState<DailyChallenge | null>(
    null,
  );
  const [userAttempt, setUserAttempt] = useState<ChallengeAttempt | null>(null);
  const [loading, setLoading] = useState(true);
  const [localAttemptLoaded, setLocalAttemptLoaded] = useState(false);

  // UI state management
  const [showTomorrowScreen, setShowTomorrowScreen] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);

  // Load today's challenge from API
  useEffect(() => {
    const loadTodaysChallenge = async () => {
      try {
        const challenge = await trpc.getTodaysChallenge.query();
        setTodaysChallenge(challenge);
      } catch (error) {
        console.error("Failed to load today's challenge:", error);
        // Optionally set an error state here
        setLoading(false);
      }
    };

    loadTodaysChallenge();
  }, []);

  // Load user attempt from API (with localStorage fallback)
  useEffect(() => {
    if (typeof window !== "undefined" && todaysChallenge && user?.id) {
      const loadUserAttempt = async () => {
        try {
          // Try to load from API first
          const apiAttempt = await trpc.getUserAttempt.query({
            userId: user.id,
            challengeDate: todaysChallenge.date,
          });
          
          if (apiAttempt) {
            setUserAttempt(apiAttempt);
          } else {
            // Fall back to localStorage if no API attempt
            const localAttempt = getTodaysLocalAttempt();
            if (localAttempt && localAttempt.challengeId === todaysChallenge.id) {
              setUserAttempt({
                id: `local-${localAttempt.challengeDate}`,
                userId: user.id,
                challengeId: localAttempt.challengeId,
                completedAt: new Date(localAttempt.completedAt),
                timeMs: localAttempt.timeMs,
                attemptDate: new Date(localAttempt.challengeDate),
              });
              
              // Optionally migrate localStorage data to database
              // This could be done with a separate migration endpoint
            }
          }
        } catch (error) {
          console.error("Failed to load user attempt:", error);
          // Fall back to localStorage on error
          const localAttempt = getTodaysLocalAttempt();
          if (localAttempt && localAttempt.challengeId === todaysChallenge.id) {
            setUserAttempt({
              id: `local-${localAttempt.challengeDate}`,
              userId: user.id,
              challengeId: localAttempt.challengeId,
              completedAt: new Date(localAttempt.completedAt),
              timeMs: localAttempt.timeMs,
              attemptDate: new Date(localAttempt.challengeDate),
            });
          }
        }
        setLocalAttemptLoaded(true);
      };
      
      loadUserAttempt();
    } else if (typeof window !== "undefined" && todaysChallenge && !user?.id) {
      // For anonymous users, only check localStorage
      const localAttempt = getTodaysLocalAttempt();
      if (localAttempt && localAttempt.challengeId === todaysChallenge.id) {
        setUserAttempt({
          id: `local-${localAttempt.challengeDate}`,
          userId: "anonymous",
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
  }, [todaysChallenge, localAttemptLoaded]);

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
        // Always save to localStorage first for offline support
        saveLocalCompletion(
          todaysChallenge.id,
          todaysChallenge.date,
          timeMs,
          todaysChallenge.difficulty,
        );

        // If user is authenticated, also save to database
        if (user?.id && user.email) {
          try {
            const result = await trpc.submitCompletion.mutate({
              userId: user.id,
              userEmail: user.email,
              challengeId: todaysChallenge.id,
              challengeDate: todaysChallenge.date,
              timeMs,
            });
            
            console.log("Challenge completed successfully (database):", result);
            
            // Update local state with database response
            const newAttempt = {
              id: result.attemptId || `db-${Date.now()}`,
              userId: user.id,
              challengeId: todaysChallenge.id,
              completedAt: new Date(),
              timeMs,
              attemptDate: new Date(),
            };
            
            setUserAttempt(newAttempt);
          } catch (apiError) {
            console.error("Failed to save to database, but localStorage save succeeded:", apiError);
            // Still update local state even if API fails
            const newAttempt = {
              id: `local-${todaysChallenge.date}`,
              userId: user.id,
              challengeId: todaysChallenge.id,
              completedAt: new Date(),
              timeMs,
              attemptDate: new Date(),
            };
            
            setUserAttempt(newAttempt);
          }
        } else {
          // For anonymous users, only use localStorage
          console.log("Challenge completed successfully (localStorage only - anonymous user)");
          
          const newAttempt = {
            id: `local-${todaysChallenge.date}`,
            userId: "anonymous",
            challengeId: todaysChallenge.id,
            completedAt: new Date(),
            timeMs,
            attemptDate: new Date(),
          };
          
          setUserAttempt(newAttempt);
        }

        // Show completion modal immediately after completion
        setShowCompletionModal(true);
      } catch (error) {
        console.error("Failed to submit completion:", error);
        throw error;
      }
    },
    [todaysChallenge, canAttempt, user],
  );

  // Refresh challenge data from API
  const refreshChallenge = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch fresh challenge from API
      const challenge = await trpc.getTodaysChallenge.query();
      setTodaysChallenge(challenge);
      
      // If user is authenticated, also refresh their attempt status
      if (user?.id) {
        try {
          const apiAttempt = await trpc.getUserAttempt.query({
            userId: user.id,
            challengeDate: challenge.date,
          });
          
          if (apiAttempt) {
            setUserAttempt(apiAttempt);
          } else {
            // Check localStorage as fallback
            const localAttempt = getTodaysLocalAttempt();
            if (localAttempt && localAttempt.challengeId === challenge.id) {
              setUserAttempt({
                id: `local-${localAttempt.challengeDate}`,
                userId: user.id,
                challengeId: localAttempt.challengeId,
                completedAt: new Date(localAttempt.completedAt),
                timeMs: localAttempt.timeMs,
                attemptDate: new Date(localAttempt.challengeDate),
              });
            } else {
              setUserAttempt(null);
            }
          }
        } catch (error) {
          console.error("Failed to refresh user attempt:", error);
        }
      }
      
      console.log("Challenge data refreshed successfully");
    } catch (error) {
      console.error("Failed to refresh challenge:", error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Set tomorrow screen visibility
  const setTomorrowScreen = useCallback((show: boolean) => {
    setShowTomorrowScreen(show);
  }, []);

  // Set completion modal visibility
  const setCompletionModal = useCallback((show: boolean) => {
    setShowCompletionModal(show);
  }, []);

  // Debug helper to force completion modal (remove in production)
  useEffect(() => {
    if (typeof window !== "undefined") {
      (window as Window & { forceCompletionModal?: () => void }).forceCompletionModal = () => {
        console.log("Forcing completion modal for testing...");
        setShowCompletionModal(true);
      };
    }
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
