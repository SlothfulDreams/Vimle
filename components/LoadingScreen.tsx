import { Navbar } from "@/pages/index/Navbar";
import { CenteredLayout } from "@/pages/index/CenteredLayout";

/**
 * Props for the LoadingScreen component
 */
interface LoadingScreenProps {
  /** Loading message to display */
  message?: string;
  /** Subtitle/description for the loading state */
  description?: string;
}

/**
 * Component for displaying loading states
 * Provides consistent loading UI with customizable messages
 */
export function LoadingScreen({ 
  message = "Loading today's challenge...", 
  description = "Preparing your daily coding challenge" 
}: LoadingScreenProps) {
  return (
    <>
      <Navbar />
      <CenteredLayout>
        <div className="flex flex-col items-center space-y-8">
          <div className="text-center">
            <div className="text-lg font-semibold">{message}</div>
            <div className="text-sm text-muted-foreground mt-2">{description}</div>
            <div className="mt-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
            </div>
          </div>
        </div>
      </CenteredLayout>
    </>
  );
}