import { useState } from "react";
import { AttemptRow } from "./AttemptRow";
import { TileState } from "./MotionTile";

interface Motion {
  command: string;
  state: TileState;
}

interface Attempt {
  motions: Motion[];
}

export function MotionFeedback() {
  // Sample data - in real implementation this would come from game state
  const [attempts] = useState<Attempt[]>([
    {
      motions: [
        { command: "3j", state: "correct" },
        { command: "w", state: "partial" },
        { command: "dd", state: "incorrect" },
      ],
    },
    {
      motions: [
        { command: "2j", state: "incorrect" },
        { command: "2w", state: "correct" },
        { command: "dd", state: "correct" },
      ],
    },
  ]);

  const maxAttempts = 6;

  return (
    <div className="w-[320px]">
      <h3 className="text-lg font-semibold text-foreground mb-4 text-center">
        Attempts
      </h3>
      <div className="space-y-2">
        {attempts.map((attempt, index) => (
          <AttemptRow key={index} motions={attempt.motions} />
        ))}
        
        {/* Empty rows for remaining attempts */}
        {Array.from({ length: maxAttempts - attempts.length }, (_, index) => (
          <AttemptRow key={`empty-${index}`} motions={[]} />
        ))}
      </div>
    </div>
  );
}