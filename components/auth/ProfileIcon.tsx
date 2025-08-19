import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { User } from "lucide-react";
import { LoginDialog } from "./LoginDialog";
import { UserDropdown } from "./UserDropdown";

export function ProfileIcon() {
  const { user, loading } = useAuth();

  // Show loading state
  if (loading) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className="h-10 w-10 rounded-full bg-background/80 backdrop-blur-sm border border-border/40"
        aria-label="Loading profile"
        disabled
      >
        <User className="h-5 w-5 text-foreground opacity-50" />
      </Button>
    );
  }

  // If user is authenticated, show user dropdown
  if (user) {
    return <UserDropdown />;
  }

  // If user is not authenticated, show login trigger
  return (
    <LoginDialog>
      <Button
        variant="ghost"
        size="icon"
        className="h-10 w-10 rounded-full bg-background/80 backdrop-blur-sm border border-border/40 hover:bg-accent"
        aria-label="Sign in"
      >
        <User className="h-5 w-5 text-foreground" />
      </Button>
    </LoginDialog>
  );
}