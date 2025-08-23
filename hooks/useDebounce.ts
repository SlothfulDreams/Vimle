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

  useEffect(() => {
    // Clear previous timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new debounced timeout
    timeoutRef.current = setTimeout(callback, delay);

    // Cleanup on unmount or dependency change
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, dependencies);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);
}
