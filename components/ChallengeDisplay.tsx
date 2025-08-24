import type { DailyChallenge } from "@/types";

/**
 * Props for the ChallengeDisplay component
 */
interface ChallengeDisplayProps {
  /** Challenge data to display */
  challenge: DailyChallenge;
}

/**
 * Component for displaying challenge information
 * Shows challenge title, difficulty badge, and metadata
 */
export function ChallengeDisplay({ challenge }: ChallengeDisplayProps) {
  /**
   * Gets appropriate styling for difficulty badge
   */
  const getDifficultyStyle = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case "easy":
        return "bg-green-100 text-green-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      case "hard":
        return "bg-red-100 text-red-800";
      default:
        return "bg-blue-100 text-blue-800";
    }
  };

  return (
    <div className="text-center max-w-2xl mx-auto mb-6">
      <h2 className="text-lg font-bold text-foreground mb-2">
        Today's Challenge
      </h2>
      <p className="text-foreground font-semibold">{challenge.title}</p>
      <div className="mt-2">
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getDifficultyStyle(
            challenge.difficulty
          )}`}
        >
          {challenge.difficulty}
        </span>
      </div>
    </div>
  );
}
