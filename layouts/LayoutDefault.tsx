import "./style.css";
import "./tailwind.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import { ThemeProvider } from "next-themes";
import { useState } from "react";
import { AuthProvider } from "@/lib/auth-context";
import { ChallengeProvider } from "@/lib/challenge-context";
import { trpc } from "@/trpc/client";

export default function LayoutDefault({
  children,
}: {
  children: React.ReactNode;
}) {
  const [queryClient] = useState(() => new QueryClient());
  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: "/api/trpc",
        }),
      ],
    }),
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
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
      </QueryClientProvider>
    </trpc.Provider>
  );
}
