import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type TileState = "correct" | "partial" | "incorrect" | "empty";

interface MotionTileProps {
  motion: string;
  state: TileState;
  className?: string;
}

export function MotionTile({ motion, state, className }: MotionTileProps) {
  const stateClasses = {
    correct: "bg-green-500 hover:bg-green-600 text-white border-green-500 dark:bg-green-600 dark:hover:bg-green-700 dark:border-green-600",
    partial: "bg-yellow-500 hover:bg-yellow-600 text-white border-yellow-500 dark:bg-yellow-600 dark:hover:bg-yellow-700 dark:border-yellow-600", 
    incorrect: "bg-gray-400 hover:bg-gray-500 text-white border-gray-400 dark:bg-gray-600 dark:hover:bg-gray-700 dark:border-gray-600",
    empty: "bg-gray-100 hover:bg-gray-200 text-gray-400 border-gray-300 border-2 border-dashed dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-500 dark:border-gray-600"
  };

  return (
    <Badge
      variant="outline"
      className={cn(
        "flex items-center justify-center w-12 h-12 text-sm font-mono font-bold rounded-md transition-colors",
        stateClasses[state],
        className
      )}
    >
      {motion || "?"}
    </Badge>
  );
}