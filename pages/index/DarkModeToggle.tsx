import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDarkMode } from "./hooks/useDarkMode";

export function DarkModeToggle() {
  const { isDarkMode, toggleDarkMode } = useDarkMode();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleDarkMode}
      className="fixed top-4 right-4 z-10 h-10 w-10 rounded-full bg-background/80 backdrop-blur-sm border border-border/40 hover:bg-accent"
      aria-label="Toggle dark mode"
    >
      {isDarkMode ? (
        <Sun className="h-5 w-5 text-foreground" />
      ) : (
        <Moon className="h-5 w-5 text-foreground" />
      )}
    </Button>
  );
}
