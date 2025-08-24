import { useCallback, useMemo, useState } from "react";
import { useChallenge } from "@/lib/challenge-context";
import type { ChallengeUIState } from "@/types";

/**
 * Custom hook for handling challenge completion logic
 * Manages content comparison, submission state, and completion detection
 *
 * @param leftContent - Content from the user's editor
 * @param rightContent - Target content to match
 * @param timer - Timer state object from parent component
 * @returns Completion state and handler functions
 */
export function useCompletionHandler(
  leftContent: string,
  rightContent: string,
  timer: {
    isRunning: boolean;
    elapsedTime: number;
    stopTimer: () => number;
  },
) {
  const { canAttempt, submitCompletion } = useChallenge();

  const [uiState, setUIState] = useState<ChallengeUIState>({
    showTomorrowScreen: false,
    showCompletionModal: false,
    isSubmitting: false,
    submissionError: null,
  });

  /**
   * Normalized content with whitespace removed for comparison
   * Memoized to prevent unnecessary recalculations
   */
  const normalizedContent = useMemo(
    () => ({
      left: leftContent.replace(/\s/g, ""),
      right: rightContent.replace(/\s/g, ""),
    }),
    [leftContent, rightContent],
  );

  /**
   * Checks if content matches and user is ready for completion
   */
  const isContentMatching = useMemo(() => {
    const { left, right } = normalizedContent;

    // Early exit for performance: check lengths first
    if (left.length !== right.length) {
      return false;
    }

    // Only do expensive string comparison if lengths match
    return left.length > 0 && right.length > 0 && left === right;
  }, [normalizedContent]);

  /**
   * Determines if challenge completion should be triggered
   * Uses timer.isRunning as proxy for user interaction to simplify logic
   */
  const shouldComplete = useMemo(
    () =>
      timer.isRunning &&
      isContentMatching &&
      canAttempt &&
      !uiState.isSubmitting,
    [
      timer.isRunning,
      isContentMatching,
      canAttempt,
      uiState.isSubmitting,
    ],
  );

  /**
   * Handles the challenge completion submission
   * @param completionTimeMs - Time taken to complete the challenge
   */
  const handleCompletion = useCallback(
    async (completionTimeMs: number) => {
      if (!shouldComplete) {
        return;
      }

      setUIState((prev) => ({
        ...prev,
        isSubmitting: true,
        submissionError: null,
      }));

      try {
        await submitCompletion(completionTimeMs);

        // Success - the challenge context will handle UI updates
        setUIState((prev) => ({
          ...prev,
          isSubmitting: false,
        }));
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Failed to save your completion. Please try again.";

        setUIState((prev) => ({
          ...prev,
          isSubmitting: false,
          submissionError: errorMessage,
        }));
      }
    },
    [shouldComplete, submitCompletion],
  );

  /**
   * Clears the submission error
   */
  const clearError = useCallback(() => {
    setUIState((prev) => ({ ...prev, submissionError: null }));
  }, []);

  /**
   * Updates tomorrow screen visibility
   */
  const setShowTomorrowScreen = useCallback((show: boolean) => {
    setUIState((prev) => ({ ...prev, showTomorrowScreen: show }));
  }, []);

  /**
   * Updates completion modal visibility
   */
  const setShowCompletionModal = useCallback((show: boolean) => {
    setUIState((prev) => ({ ...prev, showCompletionModal: show }));
  }, []);

  return {
    // State
    isContentMatching,
    shouldComplete,
    normalizedContent,
    uiState,

    // Actions
    handleCompletion,
    clearError,
    setShowTomorrowScreen,
    setShowCompletionModal,

    // Computed values for debugging
    debug: {
      leftLength: normalizedContent.left.length,
      rightLength: normalizedContent.right.length,
      contentPreview: {
        left: `${normalizedContent.left.slice(0, 20)}...`,
        right: `${normalizedContent.right.slice(0, 20)}...`,
      },
    },
  };
}
