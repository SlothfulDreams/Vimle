import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface TomorrowScreenProps {
  challengeTitle: string;
  completionTimeMs: number;
  completedAt: Date;
  difficulty: string;
}

export function TomorrowScreen({
  challengeTitle,
  completionTimeMs,
  completedAt,
  difficulty,
}: TomorrowScreenProps) {
  const [timeUntilNext, setTimeUntilNext] = useState("");

  const timeInSeconds = (completionTimeMs / 1000).toFixed(2);

  const getDifficultyColor = (diff: string) => {
    switch (diff) {
      case "easy":
        return "bg-red-500/20 text-red-700 border-red-300";
      case "medium":
        return "bg-orange-500/20 text-orange-700 border-orange-300";
      case "hard":
        return "bg-red-500/20 text-red-700 border-red-300";
      default:
        return "bg-gray-500/20 text-gray-700 border-gray-300";
    }
  };

  // Calculate time until next challenge (midnight)
  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);

      const msUntilTomorrow = tomorrow.getTime() - now.getTime();
      const hours = Math.floor(msUntilTomorrow / (1000 * 60 * 60));
      const minutes = Math.floor(
        (msUntilTomorrow % (1000 * 60 * 60)) / (1000 * 60),
      );

      setTimeUntilNext(`${hours}h ${minutes}m`);
    };

    // Update immediately and then every minute
    updateCountdown();
    const interval = setInterval(updateCountdown, 60000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 min-h-screen bg-background flex items-center justify-center p-6 z-50">
      <div className="w-full max-w-lg space-y-8 text-center">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-foreground tracking-wide">
            Vimle
          </h1>
          <p className="text-sm text-muted-foreground">Daily Vim Challenge</p>
        </div>

        {/* Celebration Header */}
        <div className="space-y-4">
          <div className="text-6xl animate-bounce">🎉</div>
          <h2 className="text-2xl font-bold text-foreground">
            Challenge Completed!
          </h2>

          <div className="flex items-center justify-center gap-3">
            <h3 className="text-lg font-semibold text-foreground">
              {challengeTitle}
            </h3>
            <Badge
              variant="outline"
              className={cn(
                "text-xs font-medium capitalize",
                getDifficultyColor(difficulty),
              )}
            >
              {difficulty}
            </Badge>
          </div>

          {/* Challenge completed indicator */}
          <div className="bg-muted/20 rounded-lg p-4 border">
            <div className="flex items-center justify-center gap-2">
              <div className="text-2xl">✅</div>
              <div className="text-sm text-muted-foreground">Amazing work!</div>
            </div>
          </div>
        </div>

        {/* Time Display - Prominent */}
        <div className="space-y-4">
          <div className="bg-muted/30 rounded-lg p-6 border">
            <div className="text-sm text-muted-foreground mb-2">Your Time</div>
            <div className="text-4xl font-mono font-bold text-foreground">
              {timeInSeconds}s
            </div>
          </div>

          <div className="bg-muted/20 rounded-lg p-4 border">
            <div className="text-xs text-muted-foreground mb-1">Completed</div>
            <div className="text-lg font-semibold text-foreground">
              {completedAt.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}
            </div>
          </div>
        </div>

        {/* Countdown Section */}
        <div className="space-y-4 pt-4">
          <div className="text-4xl">🌅</div>
          <div className="space-y-2">
            <h3 className="text-xl font-semibold text-foreground">
              See you tomorrow!
            </h3>
            <p className="text-sm text-muted-foreground">
              Next Vimle challenge in:
            </p>
            <div className="text-2xl font-mono font-bold text-foreground">
              {timeUntilNext}
            </div>
          </div>
        </div>

        {/* Subtle footer */}
        <div className="pt-8">
          <p className="text-xs text-muted-foreground">
            A new coding challenge will be available tomorrow
          </p>
        </div>
      </div>
    </div>
  );
}
