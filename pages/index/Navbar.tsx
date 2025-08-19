import { Moon, Sun, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";
import { ClientOnly } from "@/components/ClientOnly";
import { ProfileIcon } from "@/components/auth/ProfileIcon";

export function Navbar() {
  const { theme, setTheme } = useTheme();
  const isDarkMode = theme === "dark";
  const toggleDarkMode = () => setTheme(isDarkMode ? "light" : "dark");

  return (
    <nav className="top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border/40 px-6 py-4 flex items-center justify-center relative">
      {/* Centered Title */}
      <h1 className="text-2xl font-bold text-foreground">VIMLE</h1>

      {/* Absolute positioned Profile Icon */}
      <ClientOnly
        fallback={
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-16 h-10 w-10 rounded-full bg-background/80 backdrop-blur-sm border border-border/40"
            aria-label="Profile"
            disabled
          >
            <User className="h-5 w-5 text-foreground opacity-50" />
          </Button>
        }
      >
        <div className="absolute right-16">
          <ProfileIcon />
        </div>
      </ClientOnly>

      {/* Absolute positioned Dark Mode Toggle */}
      <ClientOnly
        fallback={
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-6 h-10 w-10 rounded-full bg-background/80 backdrop-blur-sm border border-border/40"
            aria-label="Toggle dark mode"
            disabled
          >
            <Sun className="h-5 w-5 text-foreground opacity-50" />
          </Button>
        }
      >
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
      </ClientOnly>
    </nav>
  );
}
