"use client";
import { useEffect } from "react";

// SSO: reset hesla sa rieši v app hube.
export default function ResetPasswordPage() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    // Zachovaj query / hash fragment — Supabase recovery link má v URL parametre.
    const search = window.location.search || "";
    const hash = window.location.hash || "";
    window.location.replace(`https://app.autorro.sk/reset-password${search}${hash}`);
  }, []);

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center",
      justifyContent: "center", fontFamily: "system-ui, sans-serif",
      color: "#64748b",
    }}>
      Presmerovanie…
    </div>
  );
}
