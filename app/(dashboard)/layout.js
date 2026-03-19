"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

function NavLink({ href, icon, label }) {
  const pathname = usePathname();
  const active = pathname === href;
  return (
    <Link href={href} className={"flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors " + (active ? "bg-[#FF501C] text-white font-semibold" : "text-[#F7F6F4] hover:bg-[#5c1a42] hover:text-white")}>
      <span>{icon}</span> {label}
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
    <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-[#F7F6F4] hover:bg-red-900 hover:text-white transition-colors w-full mt-auto">
      <span>🚪</span> Odhlásiť sa
    </button>
  );
}

export default function DashboardLayout({ children }) {
  return (
    <div className="flex min-h-screen" style={{backgroundColor: "#F7F6F4"}}>
      <aside className="hidden md:flex w-60 flex-col p-5 fixed h-full" style={{backgroundColor: "#481132"}}>
        <div className="mb-8 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{backgroundColor: "#FF501C"}}>
            <span className="text-white font-bold text-sm">A</span>
          </div>
          <div>
            <h1 className="text-white font-bold text-base leading-tight">Autorro</h1>
            <p className="text-xs" style={{color: "#c4a0b4"}}>Dashboard</p>
          </div>
        </div>
        <nav className="flex flex-col gap-1 flex-1">
          <NavLink href="/" icon="🏥" label="Zdravie ponuky" />
          <NavLink href="/trend" icon="📈" label="Trend zdravia" />
          <NavLink href="/reakčný-čas" icon="⚡" label="Reakčný čas" />
          <NavLink href="/cas-predaja" icon="🕐" label="Čas predaja" />
          <NavLink href="/konverzia" icon="🎯" label="Konverzia leadov" />
          <NavLink href="/users" icon="👥" label="Používatelia" />
          <NavLink href="/zmena-hesla" icon="🔑" label="Zmena hesla" />
        </nav>
        <LogoutButton />
      </aside>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 flex justify-around z-50 border-t" style={{backgroundColor: "#481132", borderColor: "#5c1a42"}}>
        <Link href="/" className="flex flex-col items-center py-3 px-3 text-xs text-white">
          <span className="text-lg">🏥</span>Zdravie
        </Link>
        <Link href="/trend" className="flex flex-col items-center py-3 px-3 text-xs text-white">
          <span className="text-lg">📈</span>Trend
        </Link>
        <Link href="/reakčný-čas" className="flex flex-col items-center py-3 px-3 text-xs text-white">
          <span className="text-lg">⚡</span>Reakčný čas
        </Link>
        <Link href="/cas-predaja" className="flex flex-col items-center py-3 px-3 text-xs text-white">
          <span className="text-lg">🕐</span>Čas predaja
        </Link>
      </nav>

      <main className="md:ml-60 flex-1 p-4 md:p-8 pb-24 md:pb-8 min-h-screen" style={{backgroundColor: "#F7F6F4"}}>
        {children}
      </main>
    </div>
  );
}