"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { createClient } from "./supabase";

/**
 * Roly v systéme:
 *  - "admin"      → vidí všetko vrátane správy používateľov
 *  - "manažment"  → vidí všetko v dashboardoch
 *  - "maklér"     → vidí len svoj zárobok, bez súhrnného prehľadu financovania
 */

const UserContext = createContext({ role: "maklér", pipedriveName: null, email: null, fullName: null, loading: true });

export function UserProvider({ children }) {
  const [info, setInfo] = useState({ role: "maklér", pipedriveName: null, email: null, fullName: null, loading: true });

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { setInfo(i => ({ ...i, loading: false })); return; }

      const appMeta  = user.app_metadata  || {};
      const userMeta = user.user_metadata || {};
      const email    = user.email || "";
      // Rola je v app_metadata — chránená, user si ju sám cez klienta nezmení.
      // Single source of truth: admin = app_metadata.role === 'admin'.
      // (Historický env-based fallback NEXT_PUBLIC_ADMIN_EMAILS bol odstránený
      // kvôli leaku admin zoznamu do klientskeho JS bundla.)
      const role = appMeta.role || "maklér";

      setInfo({
        role,
        pipedriveName: userMeta.pipedrive_name || null,
        fullName:      userMeta.full_name      || null,
        email,
        loading: false,
      });
    });
  }, []);

  return <UserContext.Provider value={info}>{children}</UserContext.Provider>;
}

export function useUser() {
  return useContext(UserContext);
}

/** Skratka — true ak môže vidieť všetky zárobky */
export function canSeeAll(role) {
  return role === "admin" || role === "manažment";
}
