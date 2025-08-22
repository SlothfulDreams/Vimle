import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { trpc } from "@/trpc/client";
import { useAuth } from "@/lib/auth-context";
import { getLocalStats } from "@/lib/local-storage";

interface CompletionPopupProps {
  isOpen: boolean;
  onClose: () => void;
  completionTimeMs: number;
  challengeTitle: string;
  difficulty: string;
  autoCloseDelay?: number; // milliseconds
}

export function CompletionPopup({ 
  isOpen, 
  onClose, 
  completionTimeMs, 
  challengeTitle,
  difficulty,
  autoCloseDelay = 5000 
}: CompletionPopupProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);
  const { user } = useAuth();

  const timeInSeconds = (completionTimeMs / 1000).toFixed(2);

  // Fetch user stats for average time (only for authenticated users)
  const statsQuery = trpc.getChallengeStats.useQuery(
    { userId: user?.id || '' },
    { 
      enabled: isOpen && !!user?.id,
      refetchOnWindowFocus: false 
    }
  );

  // For anonymous users, get local stats (client-side only)
  const [localStats, setLocalStats] = useState<ReturnType<typeof getLocalStats> | null>(null);
  
  useEffect(() => {
    if (!user && typeof window !== 'undefined' && isOpen) {
      setLocalStats(getLocalStats());
    }
  }, [user, isOpen]);
  
  // Determine average time from either server stats or local stats
  const averageTimeMs = user 
    ? (statsQuery.data?.averageTime || 0)
    : (localStats?.averageTime || 0);
  
  const averageTimeSeconds = averageTimeMs > 0 ? (averageTimeMs / 1000).toFixed(2) : null;

  const getDifficultyColor = (diff: string) => {
    switch (diff) {
      case 'easy': return 'bg-red-500/20 text-red-700 border-red-300';
      case 'medium': return 'bg-orange-500/20 text-orange-700 border-orange-300';
      case 'hard': return 'bg-red-500/20 text-red-700 border-red-300';
      default: return 'bg-gray-500/20 text-gray-700 border-gray-300';
    }
  };

  // Handle opening animation
  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      // Small delay to ensure DOM is ready for animation
      const timer = setTimeout(() => setIsVisible(true), 10);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
      // Wait for animation to complete before removing from DOM
      const timer = setTimeout(() => setShouldRender(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Auto-close timer
  useEffect(() => {
    if (isOpen && autoCloseDelay > 0) {
      const timer = setTimeout(onClose, autoCloseDelay);
      return () => clearTimeout(timer);
    }
  }, [isOpen, autoCloseDelay, onClose]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!shouldRender) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className={cn(
          "fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-opacity duration-300",
          isVisible ? "opacity-100" : "opacity-0"
        )}
        onClick={onClose}
      />
      
      {/* Popup Modal */}
      <div 
        className={cn(
          "fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50",
          "bg-background border border-border rounded-lg shadow-2xl",
          "p-8 max-w-md w-full mx-4",
          "transition-all duration-300",
          isVisible 
            ? "opacity-100 scale-100 translate-y-0" 
            : "opacity-0 scale-95 translate-y-4"
        )}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Close"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M13.854 2.146a.5.5 0 0 1 0 .708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8 2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708 0z"/>
          </svg>
        </button>

        {/* Celebration content */}
        <div className="text-center space-y-6">
          {/* Celebration emoji and header */}
          <div className="space-y-3">
            <div className="text-6xl animate-bounce">🎉</div>
            <h2 className="text-2xl font-bold text-foreground">
              Challenge Completed!
            </h2>
          </div>

          {/* Challenge info */}
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-foreground">
              {challengeTitle}
            </h3>
            <Badge 
              variant="outline"
              className={cn("text-xs font-medium capitalize", getDifficultyColor(difficulty))}
            >
              {difficulty}
            </Badge>
          </div>

          {/* Time display with comparison */}
          <div className="space-y-4">
            <div className="bg-muted/30 rounded-lg p-4 border">
              <div className="text-sm text-muted-foreground mb-1">Your Time</div>
              <div className="text-3xl font-mono font-bold text-foreground">
                {timeInSeconds}s
              </div>
            </div>
            
            {averageTimeSeconds && (
              <div className="bg-muted/20 rounded-lg p-3 border">
                <div className="text-xs text-muted-foreground mb-1">Your Average</div>
                <div className="text-xl font-mono font-semibold text-foreground">
                  {averageTimeSeconds}s
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {parseFloat(timeInSeconds) < parseFloat(averageTimeSeconds) 
                    ? "🎯 Faster than your average!" 
                    : "Keep practicing to improve your time"}
                </div>
              </div>
            )}
          </div>

          {/* Come back tomorrow message */}
          <div className="space-y-3">
            <div className="text-4xl">🌅</div>
            <div>
              <h3 className="font-semibold text-foreground mb-2">Amazing work!</h3>
              <p className="text-sm text-muted-foreground">
                Come back tomorrow for a new coding challenge
              </p>
            </div>
          </div>

          {/* Auto-close notice */}
          <div className="text-xs text-muted-foreground">
            This will close automatically in a few seconds
          </div>
        </div>
      </div>
    </>
  );
}