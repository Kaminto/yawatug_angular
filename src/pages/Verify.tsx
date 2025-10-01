
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

const Verify = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<"verifying" | "success" | "error">("verifying");
  const [errorMsg, setErrorMsg] = useState<string>("");

  useEffect(() => {
    async function checkVerification() {
      // Re-fetch session in case the user is already authenticated
      const { data: { session } } = await supabase.auth.getSession();
      if (session && session.user && session.user.email_confirmed_at) {
        setStatus("success");
        setTimeout(() => navigate("/dashboard"), 1200);
        return;
      }

      // Try to refresh the authentication token in case of verification redirect
      const url = window.location.href;
      const hash = window.location.hash;
      // New Supabase Auth v2 uses query params (?access_token=...), older ones use hash
      const params = new URLSearchParams(hash.startsWith("#") ? hash.slice(1) : window.location.search.substring(1));
      const access_token = params.get("access_token");
      if (access_token) {
        // Attempt to set session from token (Supabase v2)
        const { error } = await supabase.auth.setSession({
          access_token,
          refresh_token: params.get("refresh_token") || "",
        });
        if (error) {
          setStatus("error");
          setErrorMsg("Verification failed: invalid or expired link.");
        } else {
          setStatus("success");
          toast({ title: "Email verified!", description: "Your email has been successfully confirmed." });
          setTimeout(() => navigate("/dashboard"), 1500);
        }
      } else {
        setStatus("error");
        setErrorMsg("Verification link is invalid, expired, or you are already verified.");
      }
    }
    checkVerification();
  }, [navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-white to-gray-100 dark:from-yawatu-black-light dark:to-black text-black dark:text-white px-4">
      <div className="bg-white/90 dark:bg-black/80 max-w-md w-full p-8 rounded-lg shadow-md border dark:border-yawatu-gold/30 border-gray-200 text-center">
        <img src="/lovable-uploads/1fd2bc66-b830-488d-b442-e2cf372e915b.png" alt="Yawatu Minerals & Mining Logo" className="h-14 mx-auto mb-2" />
        <h1 className="text-2xl font-bold gold-text mb-2">Email Verification</h1>
        {status === "verifying" && (
          <div>
            <p className="text-gray-700 dark:text-gray-300">Verifying your email...</p>
          </div>
        )}
        {status === "success" && (
          <div>
            <p className="text-green-700 dark:text-green-400 font-semibold mb-2">Success! Your email has been verified.</p>
            <p>Redirecting to your dashboard...</p>
          </div>
        )}
        {status === "error" && (
          <div>
            <p className="text-red-600 dark:text-red-400 font-semibold mb-2">{errorMsg}</p>
            <div className="mt-4 flex flex-col gap-2">
              <Button variant="secondary" onClick={() => navigate("/login")}>Go to Login</Button>
              <Button variant="outline" onClick={() => navigate("/register")}>Create New Account</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Verify;

