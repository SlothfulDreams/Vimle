import { useState, useCallback } from "react";
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

export default function VimleGame() {
  // Dummy target sequence for testing
  const targetSequence = ["j", "j", "w"];

  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [currentMotions, setCurrentMotions] = useState<string[]>([]);
  const [resetTrigger, setResetTrigger] = useState(0);

  const handleMotionCapture = useCallback(
    (motion: string) => {
      setCurrentMotions((prev) => {
        const newMotions = [...prev, motion];

        // If we've captured enough motions for this attempt
        if (newMotions.length >= targetSequence.length) {
          // Compare with target sequence and assign states
          const motionObjects: Motion[] = newMotions.map((cmd, index) => ({
            command: cmd,
            state: getTileState(cmd, index, targetSequence),
          }));

          // Add completed attempt
          setAttempts((prevAttempts) => {
            const newAttempts = [
              ...prevAttempts,
              {
                id: `attempt-${Date.now()}-${prevAttempts.length}`,
                motions: motionObjects,
              },
            ];

            // If we've reached max attempts, reset the game
            if (newAttempts.length >= 6) {
              setTimeout(() => {
                setAttempts([]);
                setResetTrigger((prev) => prev + 1);
              }, 1000);
            }

            return newAttempts;
          });

          // Clear current motions to start next attempt
          return [];
        }

        return newMotions;
      });
    },
    [targetSequence],
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

