import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { trpc } from "@/trpc/client";

interface CompletionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  challengeTitle: string;
  challengeId: string;
  userTimeMs: number;
  difficulty: string;
}

export function CompletionModal({
  open,
  onOpenChange,
  challengeTitle,
  challengeId,
  userTimeMs,
  difficulty,
}: CompletionModalProps) {
  const [timeUntilNext, setTimeUntilNext] = useState("");

  // Fetch global statistics for this challenge
  const globalStatsQuery = trpc.getGlobalChallengeStats.useQuery(
    { challengeId },
    { enabled: open }
  );

  const userTimeSeconds = (userTimeMs / 1000).toFixed(2);
  const globalAvgSeconds = globalStatsQuery.data
    ? (globalStatsQuery.data.averageTime / 1000).toFixed(2)
    : null;

  const getDifficultyColor = (diff: string) => {
    switch (diff) {
      case "easy":
        return "bg-green-500/20 text-green-700 border-green-300";
      case "medium":
        return "bg-orange-500/20 text-orange-700 border-orange-300";
      case "hard":
        return "bg-red-500/20 text-red-700 border-red-300";
      default:
        return "bg-gray-500/20 text-gray-700 border-gray-300";
    }
  };

  // Calculate if user beat the average
  const beatAverage =
    globalAvgSeconds &&
    parseFloat(userTimeSeconds) < parseFloat(globalAvgSeconds);

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
        (msUntilTomorrow % (1000 * 60 * 60)) / (1000 * 60)
      );

      setTimeUntilNext(`${hours}h ${minutes}m`);
    };

    if (open) {
      updateCountdown();
      const interval = setInterval(updateCountdown, 60000);
      return () => clearInterval(interval);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl font-bold">
            🎉 Puzzle Complete!
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Challenge Info */}
          <div className="text-center space-y-2">
            <h3 className="text-lg font-semibold">{challengeTitle}</h3>
            <Badge
              variant="outline"
              className={cn(
                "text-xs font-medium capitalize",
                getDifficultyColor(difficulty)
              )}
            >
              {difficulty}
            </Badge>
          </div>

          {/* Time Comparison */}
          <div className="grid grid-cols-2 gap-4">
            {/* User Time */}
            <div
              className={cn(
                "text-center p-4 rounded-lg border-2 transition-colors bg-muted/30",
                beatAverage
                  ? "border-green-500 bg-green-500/10"
                  : "border-border"
              )}
            >
              <div className="text-sm text-muted-foreground mb-1">
                Your Time
              </div>
              <div className="text-2xl font-mono font-bold">
                {userTimeSeconds}s
              </div>
              {beatAverage && (
                <div className="text-xs text-green-600 mt-1">🏆 Faster!</div>
              )}
            </div>

            {/* Average Time */}
            <div className="text-center p-4 rounded-lg bg-muted/30 border-2 border-border">
              <div className="text-sm text-muted-foreground mb-1">Avg Time</div>
              {globalStatsQuery.isLoading ? (
                <div className="text-2xl font-mono font-bold animate-pulse">
                  --
                </div>
              ) : globalAvgSeconds ? (
                <div className="text-2xl font-mono font-bold">
                  {globalAvgSeconds}s
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">No data yet</div>
              )}
            </div>
          </div>

          {/* Statistics Summary */}
          {globalStatsQuery.data &&
            globalStatsQuery.data.totalCompletions > 0 && (
              <div className="text-center text-sm text-muted-foreground">
                <p>
                  {beatAverage
                    ? `You're faster than ${Math.round(
                        ((globalStatsQuery.data.totalCompletions - 1) /
                          globalStatsQuery.data.totalCompletions) *
                          100
                      )}% of players!`
                    : `Completed by ${globalStatsQuery.data.totalCompletions} ${
                        globalStatsQuery.data.totalCompletions === 1
                          ? "player"
                          : "players"
                      } today`}
                </p>
              </div>
            )}

          {/* Next Challenge Countdown */}
          <div className="text-center space-y-2 pt-4 border-t">
            <div className="text-sm text-muted-foreground">
              Next challenge in
            </div>
            <div className="text-xl font-mono font-bold">{timeUntilNext}</div>
            <div className="text-xs text-muted-foreground">
              See you tomorrow! 🌅
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
