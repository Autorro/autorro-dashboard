"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { UserProvider } from "../../lib/user-context";
import { createClient } from "../../lib/supabase";
import SWRProvider from "../../components/SWRProvider";
import RefreshButton from "../../components/RefreshButton";

const HUB_URL = "https://app.autorro.sk";

const NAV_ITEMS = [
  { href: "/",                        icon: "🏆", label: "Leaderboard predaja" },
  { href: "/zdravie-ponuky",          icon: "🏥", label: "Zdravie ponuky" },
  { href: "/reakčný-čas",             icon: "⚡", label: "Reakčný čas" },
  { href: "/cas-predaja",             icon: "🕐", label: "Čas predaja" },
  { href: "/znacky",                  icon: "🚘", label: "Značky vozidiel" },
  { href: "/konverzia",               icon: "🎯", label: "Konverzia leadov" },
  { href: "/vyhodnotenie-callcentra", icon: "📞", label: "Vyhodnotenie callcentra" },
  { href: "/zmena-hesla",             icon: "🔑", label: "Zmena hesla" },
];

function NavItems({ onClick }) {
  return (
    <>
      {NAV_ITEMS.map(item => <NavLink key={item.href} {...item} onClick={onClick} />)}
    </>
  );
}

function NavLink({ href, icon, label, onClick }) {
  const pathname = usePathname();
  const active = pathname === href;
  return (
    <Link
      href={href}
      onClick={onClick}
      className={"flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors " +
        (active ? "bg-[#FF501C] text-white font-semibold" : "text-[#F7F6F4] hover:bg-[#5c1a42] hover:text-white")}
    >
      <span className="text-lg w-6 text-center">{icon}</span>
      <span>{label}</span>
    </Link>
  );
}

function HubLink({ onClick }) {
  return (
    <a
      href={HUB_URL}
      onClick={onClick}
      className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-[#F7F6F4] hover:bg-[#5c1a42] hover:text-white transition-colors"
    >
      <span className="text-lg w-6 text-center">↩️</span>
      <span>Späť na hub</span>
    </a>
  );
}

function LogoutButton() {
  const router = useRouter();
  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    // Po odhlásení rovno späť na hub login
    window.location.href = `${HUB_URL}/login`;
  }
  return (
    <button
      onClick={handleLogout}
      className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-[#F7F6F4] hover:bg-red-900 hover:text-white transition-colors w-full"
    >
      <span className="text-lg w-6 text-center">🚪</span>
      <span>Odhlásiť sa</span>
    </button>
  );
}

function Logo() {
  return (
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "#FF501C" }}>
        <span className="text-white font-bold text-sm">A</span>
      </div>
      <div>
        <h1 className="text-white font-bold text-base leading-tight">Autorro</h1>
        <p className="text-xs" style={{ color: "#c4a0b4" }}>Dashboard</p>
      </div>
    </div>
  );
}

function DashboardLayoutInner({ children }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: "#F7F6F4" }}>

      {/* ── Desktop sidebar ── */}
      <aside className="hidden md:flex w-60 flex-col p-5 fixed h-full z-30" style={{ backgroundColor: "#481132" }}>
        <div className="mb-8">
          <Logo />
        </div>
        <nav className="flex flex-col gap-1 flex-1">
          <NavItems />
        </nav>
        <div className="flex flex-col gap-1 mt-auto pt-3 border-t border-[#5c1a42]">
          <RefreshButton />
          <HubLink />
          <LogoutButton />
        </div>
      </aside>

      {/* ── Mobile top bar ── */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 py-3" style={{ backgroundColor: "#481132" }}>
        <Logo />
        <button
          onClick={() => setMenuOpen(o => !o)}
          className="flex flex-col gap-1.5 p-2 rounded-lg hover:bg-[#5c1a42] transition-colors"
          aria-label="Menu"
        >
          <span className={`block h-0.5 w-6 bg-white transition-transform duration-200 ${menuOpen ? "rotate-45 translate-y-2" : ""}`} />
          <span className={`block h-0.5 w-6 bg-white transition-opacity duration-200 ${menuOpen ? "opacity-0" : ""}`} />
          <span className={`block h-0.5 w-6 bg-white transition-transform duration-200 ${menuOpen ? "-rotate-45 -translate-y-2" : ""}`} />
        </button>
      </header>

      {/* ── Mobile drawer overlay ── */}
      {menuOpen && (
        <div
          className="md:hidden fixed inset-0 z-30 bg-black/50"
          onClick={() => setMenuOpen(false)}
        />
      )}

      {/* ── Mobile drawer ── */}
      <aside
        className={`md:hidden fixed top-0 right-0 h-full w-72 z-40 flex flex-col p-5 transition-transform duration-300 ${menuOpen ? "translate-x-0" : "translate-x-full"}`}
        style={{ backgroundColor: "#481132" }}
      >
        <div className="flex items-center justify-between mb-8">
          <Logo />
          <button
            onClick={() => setMenuOpen(false)}
            className="text-white text-2xl leading-none p-1 hover:opacity-70"
            aria-label="Zavrieť"
          >
            ×
          </button>
        </div>
        <nav className="flex flex-col gap-1 flex-1">
          <NavItems onClick={() => setMenuOpen(false)} />
        </nav>
        <div className="flex flex-col gap-1 mt-auto pt-3 border-t border-[#5c1a42]">
          <RefreshButton />
          <HubLink onClick={() => setMenuOpen(false)} />
          <LogoutButton />
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="md:ml-60 flex-1 p-4 md:p-8 pt-20 md:pt-8 min-h-screen" style={{ backgroundColor: "#F7F6F4" }}>
        {children}
      </main>
    </div>
  );
}

export default function DashboardLayout({ children }) {
  const adminEmails = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || "").split(",");
  return (
    <SWRProvider>
      <UserProvider adminEmails={adminEmails}>
        <DashboardLayoutInner>{children}</DashboardLayoutInner>
      </UserProvider>
    </SWRProvider>
  );
}
