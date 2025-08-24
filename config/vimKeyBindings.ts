import type { VimMotion } from "@/types";

/**
 * Configuration for Vim key bindings and motion capture
 * Centralizes key mapping to ensure consistency across the application
 */

/**
 * Key binding configuration for Vim motions
 */
export interface VimKeyBinding {
  key: string;
  motion: VimMotion;
  description: string;
}

/**
 * Supported Vim key bindings for motion capture
 * These keys will trigger motion capture callbacks
 */
export const VIM_KEY_BINDINGS: readonly VimKeyBinding[] = [
  { key: "h", motion: "h", description: "Move cursor left" },
  { key: "j", motion: "j", description: "Move cursor down" },
  { key: "k", motion: "k", description: "Move cursor up" },
  { key: "l", motion: "l", description: "Move cursor right" },
  { key: "w", motion: "w", description: "Move to next word" },
  { key: "b", motion: "b", description: "Move to previous word" },
] as const;

/**
 * Creates a key binding configuration for CodeMirror
 * @param onMotionCapture Callback function when motion is captured
 * @returns Array of key binding objects for CodeMirror
 */
export function createVimKeyBindings(
  onMotionCapture: (motion: VimMotion) => void
): Array<{ key: string; run: () => boolean }> {
  return VIM_KEY_BINDINGS.map(({ key, motion }) => ({
    key,
    run: () => {
      onMotionCapture(motion);
      return false; // Let vim handle the actual motion
    },
  }));
}
