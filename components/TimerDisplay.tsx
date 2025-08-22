/**
 * Props for the TimerDisplay component
 */
interface TimerDisplayProps {
  /** Current elapsed time in milliseconds */
  elapsedTime: number;
  /** Whether the timer is currently running */
  isRunning: boolean;
  /** Whether to show the timer (only for active attempts) */
  visible: boolean;
}

/**
 * Component for displaying challenge completion timer
 * Shows elapsed time with appropriate status indicators
 */
export function TimerDisplay({ elapsedTime, isRunning, visible }: TimerDisplayProps) {
  if (!visible) {
    return null;
  }

  const displayTime = (elapsedTime / 1000).toFixed(2);
  const statusIcon = isRunning ? "⏱️" : "✅";
  const statusColor = isRunning ? "text-green-500" : "text-blue-500";

  return (
    <div className="text-center text-lg font-mono">
      <span className={statusColor}>
        {statusIcon} {displayTime}s
      </span>
    </div>
  );
}