import { MotionTile, type TileState } from "./MotionTile";
import { memo } from "react";

interface Motion {
  command: string;
  state: TileState;
}

interface AttemptRowProps {
  motions: Motion[];
  maxMotions?: number;
  className?: string;
  rowId?: string;
}

export const AttemptRow = memo(function AttemptRow({ motions, maxMotions = 6, className, rowId }: AttemptRowProps) {
  // Pad the motions array to always show the max number of tiles
  const paddedMotions = [...motions];
  while (paddedMotions.length < maxMotions) {
    paddedMotions.push({ command: "", state: "empty" });
  }

  return (
    <div className={`flex gap-2 ${className || ""}`}>
      {paddedMotions.slice(0, maxMotions).map((motion, index) => (
        <MotionTile
          key={`${rowId || 'row'}-${index}`}
          motion={motion.command}
          state={motion.state}
        />
      ))}
    </div>
  );
});