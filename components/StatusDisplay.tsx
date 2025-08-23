/**
 * Props for the StatusDisplay component
 */
interface StatusDisplayProps {
  /** Whether a submission is in progress */
  isSubmitting: boolean;
  /** Error message to display, if any */
  error: string | null;
  /** Callback to clear the error */
  onClearError?: () => void;
}

/**
 * Component for displaying submission status and errors
 * Handles loading states and error messages with user-friendly UI
 */
export function StatusDisplay({
  isSubmitting,
  error,
  onClearError,
}: StatusDisplayProps) {
  if (isSubmitting) {
    return (
      <div className="text-center text-sm text-blue-600">
        <div className="inline-flex items-center gap-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" />
          Saving your completion...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-sm bg-red-50 border border-red-200 rounded-lg p-3 max-w-md mx-auto">
        <div className="text-red-800 font-medium">⚠️ Save Failed</div>
        <div className="text-red-600 mt-1">{error}</div>
        {onClearError && (
          <button
            onClick={onClearError}
            className="mt-2 text-xs text-red-600 underline hover:text-red-800 transition-colors"
          >
            Dismiss
          </button>
        )}
      </div>
    );
  }

  return null;
}
