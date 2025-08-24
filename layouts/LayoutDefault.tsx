import "./style.css";
import "./tailwind.css";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/lib/auth-context";
import { ChallengeProvider } from "@/lib/challenge-context";

export default function LayoutDefault({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      disableTransitionOnChange={false}
    >
      <AuthProvider>
        <ChallengeProvider>
          <div className="min-h-screen bg-background">{children}</div>
        </ChallengeProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
