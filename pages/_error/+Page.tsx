import { useEffect } from "react";
import { navigate } from "vike/client/router";
import { usePageContext } from "vike-react/usePageContext";
import { supabase } from "@/lib/supabase";

export default function AuthCallback() {
  const _pageContext = usePageContext();

  useEffect(() => {
    const handleAuthCallback = async () => {
      // Only run on client-side when supabase client is available
      if (!supabase || typeof window === "undefined") {
        console.error("Supabase client not available");
        navigate(
          `/?error=${encodeURIComponent("Authentication service unavailable")}`
        );
        return;
      }

      // Get the auth code from URL params
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get("code");
      const error = urlParams.get("error");

      if (error) {
        console.error("Auth error:", error);
        navigate(`/?error=${encodeURIComponent(error)}`);
        return;
      }

      if (code) {
        const { error: sessionError } =
          await supabase.auth.exchangeCodeForSession(code);

        if (sessionError) {
          console.error("Session error:", sessionError);
          navigate(`/?error=${encodeURIComponent(sessionError.message)}`);
          return;
        }
      }

      // Redirect to home page on success
      navigate("/");
    };

    handleAuthCallback();
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <p className="mt-4 text-muted-foreground">
          Completing authentication...
        </p>
      </div>
    </div>
  );
}
