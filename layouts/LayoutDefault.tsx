import "./style.css";
import "./tailwind.css";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "../lib/auth-context";

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
        <div className="min-h-screen bg-background">{children}</div>
      </AuthProvider>
    </ThemeProvider>
  );
}
