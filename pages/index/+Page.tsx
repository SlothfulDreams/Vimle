import { lazy, Suspense } from "react";
import { CenteredLayout } from "./CenteredLayout";
import { Navbar } from "./Navbar";
import { Instructions } from "./Instructions";
import { Challenge } from "./Challenge";
import { CompletionModal } from "./CompletionModal";
import { useChallenge } from "@/lib/challenge-context";
import { EditorContainer } from "@/components/EditorContainer";
import { ChallengeDisplay } from "@/components/ChallengeDisplay";
import { TimerDisplay } from "@/components/TimerDisplay";
import { StatusDisplay } from "@/components/StatusDisplay";
import { LoadingScreen } from "@/components/LoadingScreen";
import { useTimer } from "@/hooks/useTimer";
import { logger } from "@/lib/logger";

/**
 * Lazy load conditional components for better performance
 * Code splitting ensures TomorrowScreen is only loaded when needed
 */
const TomorrowScreen = lazy(() => import("./TomorrowScreen").then(m => ({ default: m.TomorrowScreen })));


/**
 * Main game component for Vimle challenge interface
 * Orchestrates the daily coding challenge experience with vim editors
 */
export default function VimleGame() {
  const { 
    todaysChallenge, 
    userAttempt, 
    isCompleted, 
    canAttempt, 
    loading,
    showTomorrowScreen,
    showCompletionModal,
    setCompletionModal
  } = useChallenge();
  
  const timer = useTimer();

  /**
   * Handles user's first interaction with the challenge
   * Starts the timer when user begins working
   */
  const handleUserInteraction = () => {
    if (!timer.isRunning) {
      timer.startTimer();
      logger.challenge.started(todaysChallenge?.id || 'unknown');
    }
  };

  // Show loading state while fetching challenge data
  if (loading) {
    return <LoadingScreen />;
  }

  // Show tomorrow screen for completed challenges
  if (showTomorrowScreen && todaysChallenge && userAttempt) {
    return (
      <Suspense fallback={
        <LoadingScreen 
          message="Loading completion screen..." 
          description="Preparing your challenge results"
        />
      }>
        <TomorrowScreen
          challengeTitle={todaysChallenge.title}
          completionTimeMs={userAttempt.timeMs || 0}
          completedAt={userAttempt.completedAt || new Date()}
          difficulty={todaysChallenge.difficulty}
        />
      </Suspense>
    );
  }

  // Main challenge interface
  return (
    <>
      <Navbar />
      <CenteredLayout>
        <div className="flex flex-col items-center space-y-8">
          {/* Challenge Header */}
          {todaysChallenge ? (
            <ChallengeDisplay challenge={todaysChallenge} />
          ) : (
            <Challenge />
          )}
          
          {/* Instructions */}
          <Instructions />

          {/* Timer Display */}
          <TimerDisplay
            elapsedTime={timer.elapsedTime}
            isRunning={timer.isRunning}
            visible={(timer.isRunning || timer.elapsedTime > 0) && canAttempt}
          />

          {/* Status Display */}
          <StatusDisplay
            isSubmitting={false} // Handled by EditorContainer now
            error={null} // Handled by EditorContainer now
          />

          {/* Main Editor Container */}
          {todaysChallenge && (
            <EditorContainer
              todaysChallenge={todaysChallenge}
              canAttempt={canAttempt}
              isCompleted={isCompleted}
              resetTrigger={0} // TODO: Add reset functionality if needed
              onUserInteraction={handleUserInteraction}
            />
          )}
        </div>
      </CenteredLayout>

      {/* Completion Modal */}
      {todaysChallenge && userAttempt && (
        <CompletionModal
          open={showCompletionModal}
          onOpenChange={setCompletionModal}
          challengeTitle={todaysChallenge.title}
          challengeId={todaysChallenge.id}
          userTimeMs={userAttempt.timeMs || 0}
          completedAt={userAttempt.completedAt || new Date()}
          difficulty={todaysChallenge.difficulty}
        />
      )}
    </>
  );
}

