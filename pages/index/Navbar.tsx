import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";

export function Navbar() {
  const { theme, setTheme } = useTheme();
  const isDarkMode = theme === "dark";
  const toggleDarkMode = () => setTheme(isDarkMode ? "light" : "dark");

  return (
    <nav className="top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border/40 px-6 py-4 flex items-center justify-center relative">
      {/* Centered Title */}
      <h1 className="text-2xl font-bold text-foreground">VIMLE</h1>

      {/* Absolute positioned Dark Mode Toggle */}
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleDarkMode}
        className="absolute right-6 h-10 w-10 rounded-full bg-background/80 backdrop-blur-sm border border-border/40 hover:bg-accent"
        aria-label="Toggle dark mode"
      >
        {isDarkMode ? (
          <Sun className="h-5 w-5 text-foreground" />
        ) : (
          <Moon className="h-5 w-5 text-foreground" />
        )}
      </Button>
    </nav>
  );
}

