import { AttemptRow } from "./AttemptRow";
import { TileState } from "./MotionTile";
import { useMemo } from "react";

// Helper function to determine tile state based on Wordle-like logic
function getTileState(motion: string, position: number, targetSequence: string[]): TileState {
  if (targetSequence[position] === motion) {
    return "correct"; // Exact match at correct position
  }
  
  if (targetSequence.includes(motion)) {
    return "partial"; // Motion exists in target but wrong position
  }
  
  return "incorrect"; // Motion doesn't exist in target sequence
}

interface Motion {
  command: string;
  state: TileState;
}

interface Attempt {
  id: string;
  motions: Motion[];
}

interface MotionFeedbackProps {
  attempts: Attempt[];
  currentMotions: string[];
  targetSequence?: string[];
}

export function MotionFeedback({ attempts, currentMotions, targetSequence = [] }: MotionFeedbackProps) {
  const maxAttempts = 6;

  // Memoize current attempt to prevent unnecessary re-renders
  const currentAttempt = useMemo((): Attempt => ({
    id: "current",
    motions: currentMotions.map((cmd, index) => ({ 
      command: cmd, 
      state: targetSequence[index] !== undefined
        ? getTileState(cmd, index, targetSequence)
        : "empty" as TileState
    }))
  }), [currentMotions, targetSequence]);

  return (
    <div className="w-[320px]">
      <h3 className="text-lg font-semibold text-foreground mb-4 text-center">
        Attempts
      </h3>
      <div className="space-y-2">
        {/* Completed attempts */}
        {attempts.map((attempt) => (
          <AttemptRow key={attempt.id} motions={attempt.motions} rowId={attempt.id} />
        ))}
        
        {/* Current attempt in progress (if any motions captured) */}
        {currentMotions.length > 0 && attempts.length < maxAttempts && (
          <AttemptRow key={currentAttempt.id} motions={currentAttempt.motions} rowId={currentAttempt.id} />
        )}
        
        {/* Empty rows for remaining attempts */}
        {Array.from({ 
          length: maxAttempts - attempts.length - (currentMotions.length > 0 ? 1 : 0) 
        }, (_, index) => (
          <AttemptRow key={`empty-${index}`} motions={[]} rowId={`empty-${index}`} />
        ))}
      </div>
    </div>
  );
}