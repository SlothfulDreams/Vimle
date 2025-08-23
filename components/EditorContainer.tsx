import { useCallback, useEffect, useState } from "react";
import { useCompletionHandler } from "@/hooks/useCompletionHandler";
import { useDebounce } from "@/hooks/useDebounce";
import { useTimer } from "@/hooks/useTimer";
import { VimEditor } from "@/pages/index/VimEditor";
import type { DailyChallenge, VimMotion } from "@/types";

/**
 * Props for the EditorContainer component
 */
interface EditorContainerProps {
  /** Today's challenge data */
  todaysChallenge: DailyChallenge;
  /** Whether user can attempt the challenge */
  canAttempt: boolean;
  /** Whether challenge is already completed */
  isCompleted: boolean;
  /** Reset trigger for clearing editor content */
  resetTrigger: number;
  /** Callback when user first interacts with editor */
  onUserInteraction?: () => void;
}

/**
 * Container component managing dual editor setup and challenge completion logic
 * Handles timer management, content comparison, and user interaction tracking
 */
export function EditorContainer({
  todaysChallenge,
  canAttempt,
  isCompleted,
  resetTrigger,
  onUserInteraction,
}: EditorContainerProps) {
  // Editor content state
  const [leftEditorContent, setLeftEditorContent] = useState("");
  const [rightEditorContent, setRightEditorContent] = useState("");
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Timer management
  const timer = useTimer();

  // Completion handling
  const completion = useCompletionHandler(
    leftEditorContent,
    rightEditorContent,
    hasUserInteracted,
    timer.isRunning,
  );

  /**
   * Initialize right editor with challenge content
   */
  useEffect(() => {
    if (todaysChallenge && !rightEditorContent) {
      setRightEditorContent(todaysChallenge.content);
    }
  }, [todaysChallenge, rightEditorContent]);

  /**
   * Mark initialization complete when both editors have content
   */
  useEffect(() => {
    if (
      leftEditorContent !== undefined &&
      rightEditorContent !== undefined &&
      !isInitialized
    ) {
      setIsInitialized(true);
    }
  }, [leftEditorContent, rightEditorContent, isInitialized]);

  /**
   * Handle user's first interaction with the editor
   */
  const handleUserInteraction = useCallback(() => {
    if (isInitialized && !hasUserInteracted) {
      setHasUserInteracted(true);
      onUserInteraction?.();

      // Start timer on first interaction
      if (!timer.isRunning) {
        timer.startTimer();
      }
    }
  }, [isInitialized, hasUserInteracted, timer, onUserInteraction]);

  /**
   * Handle vim motion capture from editor
   */
  const handleMotionCapture = useCallback(
    (motion: VimMotion) => {
      handleUserInteraction();

      // Could add motion analytics here in the future
      if (process.env.NODE_ENV === "development") {
        console.debug("Motion captured:", motion);
      }
    },
    [handleUserInteraction],
  );

  /**
   * Debounced completion check to avoid excessive comparisons
   * Triggers 300ms after last content change
   */
  useDebounce(
    () => {
      if (completion.shouldComplete) {
        const completionTime = timer.stopTimer();
        completion.handleCompletion(completionTime);
      }
    },
    300,
    [
      leftEditorContent,
      rightEditorContent,
      hasUserInteracted,
      timer.isRunning,
      completion.shouldComplete,
    ],
  );

  return (
    <div className="flex gap-8 items-center justify-center">
      {/* User's Editor (Left) */}
      <VimEditor
        onMotionCapture={canAttempt ? handleMotionCapture : () => {}}
        onContentChange={canAttempt ? setLeftEditorContent : () => {}}
        onUserInteraction={canAttempt ? handleUserInteraction : undefined}
        resetTrigger={resetTrigger}
        readonly={!canAttempt}
        initialContent={
          isCompleted
            ? todaysChallenge.content
            : todaysChallenge.startingContent || undefined
        }
      />

      {/* Target Editor (Right) */}
      <VimEditor
        onMotionCapture={() => {}} // No motion capture for readonly editor
        onContentChange={setRightEditorContent}
        resetTrigger={resetTrigger}
        readonly={true}
        initialContent={todaysChallenge.content}
      />
    </div>
  );
}
