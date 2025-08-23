import { useCallback, useEffect, useRef, useState } from "react";
import type { TimerState } from "@/types";

/**
 * Custom hook for managing challenge completion timer
 * Provides precise timing functionality with 10ms updates for smooth display
 *
 * @returns Timer state and control functions
 */
export function useTimer() {
  const [timerState, setTimerState] = useState<TimerState>({
    startTime: null,
    elapsedTime: 0,
    isRunning: false,
  });

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Starts the timer from the current timestamp
   * Automatically begins updating elapsed time every 10ms
   */
  const startTimer = useCallback(() => {
    const now = Date.now();
    setTimerState({
      startTime: now,
      elapsedTime: 0,
      isRunning: true,
    });
  }, []);

  /**
   * Stops the timer and preserves the final elapsed time
   * @returns The final elapsed time in milliseconds
   */
  const stopTimer = useCallback(() => {
    setTimerState((prev) => ({
      ...prev,
      isRunning: false,
    }));
    return timerState.elapsedTime;
  }, [timerState.elapsedTime]);

  /**
   * Resets the timer to initial state
   */
  const resetTimer = useCallback(() => {
    setTimerState({
      startTime: null,
      elapsedTime: 0,
      isRunning: false,
    });
  }, []);

  /**
   * Updates elapsed time every 10ms when timer is running
   * Ensures smooth display updates for user feedback
   */
  useEffect(() => {
    if (timerState.isRunning && timerState.startTime) {
      intervalRef.current = setInterval(() => {
        setTimerState((prev) => ({
          ...prev,
          elapsedTime: Date.now() - (prev.startTime || 0),
        }));
      }, 10); // 10ms updates for smooth display
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Cleanup interval on unmount or state change
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [timerState.isRunning, timerState.startTime]);

  return {
    ...timerState,
    startTimer,
    stopTimer,
    resetTimer,
    /**
     * Formatted display time in seconds with 2 decimal places
     */
    displayTime: (timerState.elapsedTime / 1000).toFixed(2),
  };
}
