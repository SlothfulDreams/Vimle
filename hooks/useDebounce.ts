import { useEffect, useRef } from "react";

/**
 * Custom hook for debouncing function calls
 * Useful for expensive operations like content comparison
 *
 * @param callback - Function to debounce
 * @param delay - Delay in milliseconds
 * @param dependencies - Dependencies that trigger the debounced call
 */
export function useDebounce(
  callback: () => void,
  delay: number,
  dependencies: React.DependencyList,
) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const callbackRef = useRef(callback);

  // Update callback ref without triggering effect
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    // Clear previous timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new debounced timeout using the ref to avoid dependency issues
    timeoutRef.current = setTimeout(() => callbackRef.current(), delay);

    // Cleanup on unmount or dependency change
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
    // biome-ignore lint/correctness/useExhaustiveDependencies: Dynamic dependencies array is intentional to prevent re-renders
  }, dependencies); // Fixed: don't spread dependencies to prevent infinite re-renders

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);
}
