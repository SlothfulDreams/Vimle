import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { trpc } from "@/trpc/client";
import { useAuth } from "./auth-context";
import type { DailyChallenge } from "@/types";
import { 
  getTodaysLocalAttempt, 
  saveLocalCompletion, 
  hasCompletedTodaysChallenge,
  getAllLocalAttempts,
  clearLocalData
} from "./local-storage";

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

const ChallengeContext = createContext<ChallengeContextType | undefined>(undefined);

export function ChallengeProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [todaysChallenge, setTodaysChallenge] = useState<DailyChallenge | null>(null);
  const [userAttempt, setUserAttempt] = useState<ChallengeAttempt | null>(null);
  const [loading, setLoading] = useState(true);
  const [localAttemptLoaded, setLocalAttemptLoaded] = useState(false);
  
  // UI state management
  const [showTomorrowScreen, setShowTomorrowScreen] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);

  // tRPC queries
  const todaysChallengeQuery = trpc.getTodaysChallenge.useQuery(undefined, {
    refetchOnWindowFocus: false,
    staleTime: 60 * 60 * 1000, // 1 hour
  });

  const userAttemptQuery = trpc.getUserAttempt.useQuery(
    { userId: user?.id || 'anonymous' },
    {
      enabled: !!user?.id,
      refetchOnWindowFocus: false,
    }
  );

  const submitCompletionMutation = trpc.submitCompletion.useMutation();
  const migrateLocalDataMutation = trpc.migrateLocalData.useMutation();

  // Load today's challenge
  useEffect(() => {
    if (todaysChallengeQuery.data) {
      setTodaysChallenge(todaysChallengeQuery.data);
    }
  }, [todaysChallengeQuery.data]);

  // Load user attempt (from database for authenticated users)
  useEffect(() => {
    if (user?.id && userAttemptQuery.isSuccess) {
      const data = (userAttemptQuery as any).data;
      if (data) {
        setUserAttempt(data);
      }
    }
  }, [user?.id, userAttemptQuery.isSuccess, userAttemptQuery]);

  // Load local attempt for anonymous users
  useEffect(() => {
    if (!user && typeof window !== 'undefined' && !localAttemptLoaded) {
      const localAttempt = getTodaysLocalAttempt();
      if (localAttempt) {
        setUserAttempt({
          id: `local-${localAttempt.challengeDate}`,
          userId: 'anonymous',
          challengeId: localAttempt.challengeId,
          completedAt: new Date(localAttempt.completedAt),
          timeMs: localAttempt.timeMs,
          attemptDate: new Date(localAttempt.challengeDate)
        });
      }
      setLocalAttemptLoaded(true);
    }
  }, [user, localAttemptLoaded]);

  // Migrate localStorage data to database when user signs in
  useEffect(() => {
    const migrateDataOnSignIn = async () => {
      if (user?.id && typeof window !== 'undefined') {
        const localAttempts = getAllLocalAttempts();
        
        if (localAttempts.length > 0) {
          try {
            console.log(`Migrating ${localAttempts.length} local attempts to database for user ${user.id}`);
            
            const result = await migrateLocalDataMutation.mutateAsync({
              userId: user.id,
              localAttempts: localAttempts,
            });

            console.log('Migration completed:', result);
            
            // Clear localStorage data after successful migration
            if (result.success && result.migratedCount > 0) {
              clearLocalData();
              console.log('Local data cleared after successful migration');
              
              // Refresh user attempt data to get the migrated data
              userAttemptQuery.refetch();
            }
          } catch (error) {
            console.error('Failed to migrate local data on sign in:', error);
            // Don't clear localStorage if migration failed
          }
        }
      }
    };

    // Only attempt migration once per session per user
    if (user?.id && !localAttemptLoaded) {
      migrateDataOnSignIn();
    }
  }, [user?.id, localAttemptLoaded, migrateLocalDataMutation, userAttemptQuery]);

  // Check if tomorrow screen should be shown
  const getTomorrowScreenKey = useCallback(() => {
    if (!todaysChallenge) return null;
    return `tomorrow_screen_${todaysChallenge.date}`;
  }, [todaysChallenge]);

  const checkIfTomorrowScreenSeen = useCallback(() => {
    if (typeof window === 'undefined') return true; // SSR safe default
    const tomorrowKey = getTomorrowScreenKey();
    if (!tomorrowKey) return true;
    return sessionStorage.getItem(tomorrowKey) === 'true';
  }, [getTomorrowScreenKey]);

  // Handle loading state first
  useEffect(() => {
    const challengeLoading = todaysChallengeQuery.isLoading;
    const attemptLoading = user ? userAttemptQuery.isLoading : !localAttemptLoaded;
    setLoading(challengeLoading || attemptLoading);
  }, [todaysChallengeQuery.isLoading, userAttemptQuery.isLoading, user, localAttemptLoaded]);

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
        if (tomorrowKey && typeof window !== 'undefined') {
          sessionStorage.setItem(tomorrowKey, 'true');
        }
      }
    }
  }, [loading, isCompleted, todaysChallenge, checkIfTomorrowScreenSeen, getTomorrowScreenKey]);

  // Submit completion
  const submitCompletion = useCallback(async (timeMs: number) => {
    if (!todaysChallenge || !canAttempt) {
      throw new Error('Cannot submit completion at this time');
    }

    try {
      // For authenticated users, submit to server
      if (user) {
        const result = await submitCompletionMutation.mutateAsync({
          userId: user.id,
          userEmail: user.email,
          challengeId: todaysChallenge.id,
          timeMs,
          challengeDate: todaysChallenge.date
        });
        console.log('Challenge completed successfully (server):', result);
      } else {
        // For anonymous users, save to local storage
        saveLocalCompletion(
          todaysChallenge.id,
          todaysChallenge.date,
          timeMs,
          todaysChallenge.difficulty
        );
        console.log('Challenge completed successfully (local)');
      }

      // Update local state to reflect completion
      const newAttempt = {
        id: user ? `db-${Date.now()}` : `local-${todaysChallenge.date}`,
        userId: user?.id || 'anonymous',
        challengeId: todaysChallenge.id,
        completedAt: new Date(),
        timeMs,
        attemptDate: new Date()
      };
      
      setUserAttempt(newAttempt);
      
      // Show completion modal immediately after completion
      setShowCompletionModal(true);

    } catch (error) {
      console.error('Failed to submit completion:', error);
      throw error;
    }
  }, [todaysChallenge, canAttempt, user, submitCompletionMutation]);

  // Refresh challenge data
  const refreshChallenge = useCallback(async () => {
    await Promise.all([
      todaysChallengeQuery.refetch(),
      user ? userAttemptQuery.refetch() : Promise.resolve()
    ]);
  }, [todaysChallengeQuery, userAttemptQuery, user]);



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
    setCompletionModal
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