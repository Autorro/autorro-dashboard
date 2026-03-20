"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const NAV_ITEMS = [
  { href: "/",                icon: "🏆", label: "Leaderboard predaja" },
  { href: "/zdravie-ponuky",  icon: "🏥", label: "Zdravie ponuky" },
  { href: "/trend",           icon: "📈", label: "Trend zdravia" },
  { href: "/reakčný-čas",    icon: "⚡", label: "Reakčný čas" },
  { href: "/cas-predaja",     icon: "🕐", label: "Čas predaja" },
  { href: "/znacky",          icon: "🚘", label: "Značky vozidiel" },
  { href: "/konverzia",       icon: "🎯", label: "Konverzia leadov" },
  { href: "/users",           icon: "👥", label: "Používatelia" },
  { href: "/zmena-hesla",     icon: "🔑", label: "Zmena hesla" },
];

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

function LogoutButton() {
  const { createClient } = require("../../lib/supabase");
  const router = require("next/navigation").useRouter();
  const supabase = createClient();
  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }
  return (
    <button
      onClick={handleLogout}
      className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-[#F7F6F4] hover:bg-red-900 hover:text-white transition-colors w-full mt-auto"
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

export default function DashboardLayout({ children }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: "#F7F6F4" }}>

      {/* ── Desktop sidebar ── */}
      <aside className="hidden md:flex w-60 flex-col p-5 fixed h-full z-30" style={{ backgroundColor: "#481132" }}>
        <div className="mb-8">
          <Logo />
        </div>
        <nav className="flex flex-col gap-1 flex-1">
          {NAV_ITEMS.map(item => <NavLink key={item.href} {...item} />)}
        </nav>
        <LogoutButton />
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
          {NAV_ITEMS.map(item => (
            <NavLink key={item.href} {...item} onClick={() => setMenuOpen(false)} />
          ))}
        </nav>
        <LogoutButton />
      </aside>

      {/* ── Main content ── */}
      <main className="md:ml-60 flex-1 p-4 md:p-8 pt-20 md:pt-8 min-h-screen" style={{ backgroundColor: "#F7F6F4" }}>
        {children}
      </main>
    </div>
  );
}
