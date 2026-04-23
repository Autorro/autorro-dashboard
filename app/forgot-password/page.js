"use client";
import { useEffect } from "react";

// SSO: reset hesla sa rieši v app hube.
export default function ForgotPasswordPage() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.location.replace("https://app.autorro.sk/reset-password");
  }, []);

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center",
      justifyContent: "center", fontFamily: "system-ui, sans-serif",
      color: "#64748b",
    }}>
      Presmerovanie na obnovu hesla…
    </div>
  );
}
