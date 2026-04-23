"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { UserProvider, useUser } from "../../lib/user-context";
import { createClient } from "../../lib/supabase";

const HUB_URL = "https://app.autorro.sk";

const NAV_ITEMS = [
  { href: "/",                        icon: "🏆", label: "Leaderboard predaja" },
  { href: "/zdravie-ponuky",          icon: "🏥", label: "Zdravie ponuky" },
  { href: "/reakčný-čas",             icon: "⚡", label: "Reakčný čas" },
  { href: "/cas-predaja",             icon: "🕐", label: "Čas predaja" },
  { href: "/znacky",                  icon: "🚘", label: "Značky vozidiel" },
  { href: "/konverzia",               icon: "🎯", label: "Konverzia leadov" },
  { href: "/vyhodnotenie-callcentra", icon: "📞", label: "Vyhodnotenie callcentra" },
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

function TopBar() {
  const { email } = useUser();
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    // Po odhlásení rovno späť na hub login
    window.location.href = `${HUB_URL}/login`;
  }

  return (
    <div className="bg-white border-b border-gray-200 px-4 md:px-8 py-3 flex items-center justify-between gap-3">
      <a
        href={HUB_URL}
        className="inline-flex items-center gap-2 text-sm font-medium text-[#481132] hover:text-[#FF501C] transition-colors"
      >
        <span className="text-base">←</span>
        <span className="hidden sm:inline">Späť na hub</span>
        <span className="sm:hidden">Hub</span>
      </a>

      <div className="flex items-center gap-1 md:gap-3">
        {email && (
          <span className="hidden md:inline text-sm text-gray-500 mr-2 truncate max-w-[220px]">
            {email}
          </span>
        )}
        <Link
          href="/zmena-hesla"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-gray-700 hover:bg-gray-100 transition-colors"
        >
          <span>🔑</span>
          <span className="hidden sm:inline">Zmena hesla</span>
        </Link>
        <button
          onClick={handleLogout}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-gray-700 hover:bg-red-50 hover:text-red-700 transition-colors"
        >
          <span>🚪</span>
          <span className="hidden sm:inline">Odhlásiť</span>
        </button>
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
      </aside>

      {/* ── Main content ── */}
      <main className="md:ml-60 flex-1 flex flex-col min-h-screen pt-14 md:pt-0" style={{ backgroundColor: "#F7F6F4" }}>
        <TopBar />
        <div className="flex-1 p-4 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}

export default function DashboardLayout({ children }) {
  const adminEmails = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || "").split(",");
  return (
    <UserProvider adminEmails={adminEmails}>
      <DashboardLayoutInner>{children}</DashboardLayoutInner>
    </UserProvider>
  );
}
