import { useCallback, useState, useEffect, useRef, useMemo, lazy, Suspense } from "react";
import { VimEditor } from "./VimEditor";
import { CenteredLayout } from "./CenteredLayout";
import { Navbar } from "./Navbar";
import { Instructions } from "./Instructions";
import { Challenge } from "./Challenge";
import { useChallenge } from "@/lib/challenge-context";

// Lazy load conditional components for better code splitting
const CompletionPopup = lazy(() => import("./CompletionPopup").then(m => ({ default: m.CompletionPopup })));
const TomorrowScreen = lazy(() => import("./TomorrowScreen").then(m => ({ default: m.TomorrowScreen })));


export default function VimleGame() {
  const { 
    todaysChallenge, 
    userAttempt, 
    isCompleted, 
    canAttempt, 
    submitCompletion, 
    loading,
    showCompletionPopup,
    showTomorrowScreen,
    dismissCompletionPopup
  } = useChallenge();
  
  const [resetTrigger, setResetTrigger] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [leftEditorContent, setLeftEditorContent] = useState("");
  const [rightEditorContent, setRightEditorContent] = useState("");
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const comparisonTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Memoized normalized content to avoid recomputation
  const normalizedLeftContent = useMemo(() => {
    return leftEditorContent.replace(/\s/g, '');
  }, [leftEditorContent]);

  const normalizedRightContent = useMemo(() => {
    return rightEditorContent.replace(/\s/g, '');
  }, [rightEditorContent]);

  // Use challenge content for right editor when available
  useEffect(() => {
    if (todaysChallenge && !rightEditorContent) {
      setRightEditorContent(todaysChallenge.content);
    }
  }, [todaysChallenge, rightEditorContent]);

  // Mark initialization complete once both editors have content
  useEffect(() => {
    if (leftEditorContent !== undefined && rightEditorContent !== undefined && !isInitialized) {
      setIsInitialized(true);
    }
  }, [leftEditorContent, rightEditorContent, isInitialized]);

  // Timer effect
  useEffect(() => {
    if (isTimerRunning) {
      intervalRef.current = setInterval(() => {
        if (startTime) {
          setElapsedTime(Date.now() - startTime);
        }
      }, 10); // Update every 10ms for smooth display
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isTimerRunning, startTime]);

  // Optimized debounced comparison function
  const performComparison = useCallback(() => {
    if (hasUserInteracted && isTimerRunning) {
      console.log('Comparing:', {
        leftLength: normalizedLeftContent.length,
        rightLength: normalizedRightContent.length,
        leftContent: normalizedLeftContent.slice(0, 20) + '...',
        rightContent: normalizedRightContent.slice(0, 20) + '...',
        match: normalizedLeftContent === normalizedRightContent
      });
      
      // Early exit: quick length check before expensive comparison
      if (normalizedLeftContent.length !== normalizedRightContent.length) {
        console.log('Length mismatch, skipping comparison');
        return;
      }
      
      // Only do full comparison if lengths match
      if (normalizedLeftContent && normalizedRightContent && normalizedLeftContent === normalizedRightContent) {
        setIsTimerRunning(false);
        const completionTime = Date.now() - (startTime || 0);
        console.log(`Timer stopped! Completed in ${(completionTime / 1000).toFixed(2)} seconds`);
        
        // Submit completion to the challenge system
        if (canAttempt) {
          submitCompletion(completionTime).catch(console.error);
        }
      } else {
        console.log('Content does not match despite same length');
      }
    }
  }, [hasUserInteracted, isTimerRunning, normalizedLeftContent, normalizedRightContent, startTime, canAttempt, submitCompletion]);

  // Debounced content comparison (300ms delay)
  useEffect(() => {
    console.log('Debounce Effect:', {
      hasUserInteracted,
      leftEditorContent: leftEditorContent ? `"${leftEditorContent.slice(0, 20)}..."` : 'empty',
      rightEditorContent: rightEditorContent ? `"${rightEditorContent.slice(0, 20)}..."` : 'empty',
      isTimerRunning,
      willTrigger: hasUserInteracted && leftEditorContent && rightEditorContent && isTimerRunning
    });
    
    if (hasUserInteracted && leftEditorContent && rightEditorContent && isTimerRunning) {
      console.log('Setting debounced timeout...');
      // Clear previous timeout
      if (comparisonTimeoutRef.current) {
        clearTimeout(comparisonTimeoutRef.current);
      }
      
      // Set new debounced timeout
      comparisonTimeoutRef.current = setTimeout(performComparison, 300);
    }
    
    return () => {
      if (comparisonTimeoutRef.current) {
        clearTimeout(comparisonTimeoutRef.current);
      }
    };
  }, [leftEditorContent, rightEditorContent, hasUserInteracted, isTimerRunning, performComparison]);

  const handleUserInteraction = useCallback(() => {
    if (isInitialized && !hasUserInteracted) {
      console.log('User interaction detected - setting hasUserInteracted to true');
      setHasUserInteracted(true);
      
      if (!isTimerRunning) {
        const now = Date.now();
        setStartTime(now);
        setElapsedTime(0);
        setIsTimerRunning(true);
        console.log('Timer started from user interaction');
      }
    }
  }, [isInitialized, hasUserInteracted, isTimerRunning]);

  const handleMotionCapture = useCallback(
    (motion: string) => {
      // Handle user interaction (includes timer start)
      handleUserInteraction();
      console.log('Motion captured:', motion);
    },
    [handleUserInteraction],
  );

  // Show loading state
  if (loading) {
    return (
      <>
        <Navbar />
        <CenteredLayout>
          <div className="flex flex-col items-center space-y-8">
            <div className="text-center">
              <div className="text-lg font-semibold">Loading today's challenge...</div>
              <div className="text-sm text-muted-foreground mt-2">Preparing your daily coding challenge</div>
            </div>
          </div>
        </CenteredLayout>
      </>
    );
  }

  // Show tomorrow screen if user has completed and dismissed popup
  if (showTomorrowScreen && todaysChallenge && userAttempt) {
    return (
      <Suspense fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
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

  // For completed challenges, always show the interface with readonly editors
  // The popup will appear when needed

  // Show active challenge interface
  return (
    <>
      <Navbar />
      <CenteredLayout>
        <div className="flex flex-col items-center space-y-8">
          {todaysChallenge ? (
            <div className="text-center max-w-2xl mx-auto mb-6">
              <h2 className="text-lg font-bold text-foreground mb-2">
                Today's Challenge
              </h2>
              <p className="text-foreground font-semibold">
                {todaysChallenge.title}
              </p>
              <div className="mt-2">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {todaysChallenge.difficulty}
                </span>
              </div>
            </div>
          ) : (
            <Challenge />
          )}
          
          <Instructions />

          {/* Timer Display - only show for active attempts */}
          {(isTimerRunning || elapsedTime > 0) && canAttempt && (
            <div className="text-center text-lg font-mono">
              <span className={isTimerRunning ? "text-green-500" : "text-blue-500"}>
                {isTimerRunning ? "⏱️ " : "✅ "}{(elapsedTime / 1000).toFixed(2)}s
              </span>
            </div>
          )}


          {/* Main Content - Two Editors Side by Side */}
          {todaysChallenge && (
            <div className="flex gap-8 items-center justify-center">
              <VimEditor
                onMotionCapture={canAttempt ? handleMotionCapture : () => {}}
                onContentChange={canAttempt ? setLeftEditorContent : () => {}}
                onUserInteraction={canAttempt ? handleUserInteraction : undefined}
                resetTrigger={resetTrigger}
                readonly={!canAttempt} // readonly if completed
                initialContent={isCompleted ? todaysChallenge.content : undefined}
              />
              <VimEditor
                onMotionCapture={() => {}}
                onContentChange={setRightEditorContent}
                resetTrigger={resetTrigger}
                readonly={true}
                initialContent={todaysChallenge.content}
              />
            </div>
          )}
        </div>
      </CenteredLayout>

      {/* Completion Popup - shows immediately after completion */}
      {showCompletionPopup && todaysChallenge && userAttempt && (
        <Suspense fallback={null}>
          <CompletionPopup
            isOpen={showCompletionPopup}
            onClose={dismissCompletionPopup}
            completionTimeMs={userAttempt.timeMs || 0}
            challengeTitle={todaysChallenge.title}
            difficulty={todaysChallenge.difficulty}
          />
        </Suspense>
      )}

    </>
  );
}

