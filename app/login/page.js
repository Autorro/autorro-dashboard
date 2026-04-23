"use client";
import { useEffect } from "react";

// SSO: login sa centrálne rieši v app hube. Ak sa sem niekto dostane priamo
// (napr. starým bookmarkom), redirectneme ho na hub s návratom do dashboardu.
export default function LoginPage() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const next = encodeURIComponent(window.location.origin + "/");
    window.location.replace(`https://app.autorro.sk/login?next=${next}`);
  }, []);

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center",
      justifyContent: "center", fontFamily: "system-ui, sans-serif",
      color: "#64748b",
    }}>
      Presmerovanie na prihlásenie…
    </div>
  );
}
