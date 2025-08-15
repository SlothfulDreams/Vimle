import { useReducer, useCallback } from "react";
import { VimEditor } from "./VimEditor";
import { MotionFeedback } from "./MotionFeedback";
import { CenteredLayout } from "./CenteredLayout";
import { Navbar } from "./Navbar";
import { Instructions } from "./Instructions";
import { Challenge } from "./Challenge";
import { TileState } from "./MotionTile";

// Helper function to determine tile state based on Wordle-like logic
function getTileState(
  motion: string,
  position: number,
  targetSequence: string[],
): TileState {
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

interface GameState {
  attempts: Attempt[];
  currentMotions: string[];
  resetTrigger: number;
}

type GameAction = 
  | { type: 'ADD_MOTION'; motion: string }
  | { type: 'COMPLETE_ATTEMPT'; attempt: Attempt }
  | { type: 'RESET_GAME' };

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'ADD_MOTION':
      return {
        ...state,
        currentMotions: [...state.currentMotions, action.motion]
      };
    case 'COMPLETE_ATTEMPT':
      const newAttempts = [...state.attempts, action.attempt];
      return {
        ...state,
        attempts: newAttempts,
        currentMotions: [], // Clear current motions atomically
        resetTrigger: newAttempts.length >= 6 ? state.resetTrigger + 1 : state.resetTrigger
      };
    case 'RESET_GAME':
      return {
        attempts: [],
        currentMotions: [],
        resetTrigger: state.resetTrigger + 1
      };
    default:
      return state;
  }
}

export default function VimleGame() {
  // Dummy target sequence for testing
  const targetSequence = ["j", "j", "w"];

  const [gameState, dispatch] = useReducer(gameReducer, {
    attempts: [],
    currentMotions: [],
    resetTrigger: 0
  });

  const { attempts, currentMotions, resetTrigger } = gameState;

  const handleMotionCapture = useCallback(
    (motion: string) => {
      const newMotions = [...currentMotions, motion];

      // If we've captured enough motions for this attempt
      if (newMotions.length >= targetSequence.length) {
        // Compare with target sequence and assign states
        const motionObjects: Motion[] = newMotions.map((cmd, index) => ({
          command: cmd,
          state: getTileState(cmd, index, targetSequence),
        }));

        // Create completed attempt
        const completedAttempt: Attempt = {
          id: `attempt-${Date.now()}-${attempts.length}`,
          motions: motionObjects,
        };

        // Dispatch atomic state update
        dispatch({ type: 'COMPLETE_ATTEMPT', attempt: completedAttempt });

        // If this would be the 6th attempt, reset after delay
        if (attempts.length + 1 >= 6) {
          setTimeout(() => {
            dispatch({ type: 'RESET_GAME' });
          }, 1000);
        }
      } else {
        // Normal motion capture
        dispatch({ type: 'ADD_MOTION', motion });
      }
    },
    [currentMotions, targetSequence, attempts.length],
  );

  return (
    <>
      <Navbar />
      <CenteredLayout>
        <div className="flex flex-col items-center space-y-8">
          <Challenge />
          <Instructions />

          {/* Main Content - Editor and Attempts Side by Side */}
          <div className="flex gap-8 items-center justify-center">
            <VimEditor
              onMotionCapture={handleMotionCapture}
              resetTrigger={resetTrigger}
            />
            <MotionFeedback
              attempts={attempts}
              currentMotions={currentMotions}
              targetSequence={targetSequence}
            />
          </div>
        </div>
      </CenteredLayout>
    </>
  );
}

