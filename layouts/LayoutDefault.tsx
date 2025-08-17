import "./style.css";
import "./tailwind.css";
import { ThemeProvider } from "next-themes";

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
      <div className="min-h-screen bg-background">{children}</div>
    </ThemeProvider>
  );
}
