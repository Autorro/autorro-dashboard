"use client";
import Link from "next/link";
import { createClient } from "../../lib/supabase";
import { useRouter } from "next/navigation";

function LogoutButton() {
  const router = useRouter();
  const supabase = createClient();
  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }
  return (
    <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors w-full mt-auto">
      <span>🚪</span> Odhlásiť sa
    </button>
  );
}

export default function DashboardLayout({ children }) {
  return (
    <div className="flex min-h-screen bg-gray-100">
      <aside className="hidden md:flex w-56 bg-white border-r border-gray-200 flex-col p-4 fixed h-full">
        <div className="mb-8">
          <h1 className="text-lg font-bold text-gray-900">Autorro Dashboard</h1>
          <p className="text-xs text-gray-400">CRManagement</p>
        </div>
        <nav className="flex flex-col gap-1 flex-1">
          <Link href="/" className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors">
            <span>🏥</span> Zdravie ponuky
          </Link>
          <Link href="/reakčný-čas" className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors">
            <span>⚡</span> Reakčný čas
          </Link>
          <Link href="/aktivity" className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors">
            <span>📊</span> Aktivity
          </Link>
          <Link href="/pipeline" className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors">
            <span>🚗</span> Pipeline
          </Link>
        </nav>
        <LogoutButton />
      </aside>
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around z-50">
        <Link href="/" className="flex flex-col items-center py-3 px-4 text-xs text-gray-600">
          <span className="text-xl">🏥</span>Zdravie
        </Link>
        <Link href="/reakčný-čas" className="flex flex-col items-center py-3 px-4 text-xs text-gray-600">
          <span className="text-xl">⚡</span>Reakčný čas
        </Link>
        <Link href="/aktivity" className="flex flex-col items-center py-3 px-4 text-xs text-gray-600">
          <span className="text-xl">📊</span>Aktivity
        </Link>
        <Link href="/pipeline" className="flex flex-col items-center py-3 px-4 text-xs text-gray-600">
          <span className="text-xl">🚗</span>Pipeline
        </Link>
      </nav>
      <main className="md:ml-56 flex-1 p-4 md:p-8 pb-24 md:pb-8 bg-gray-100 min-h-screen">
        {children}
      </main>
    </div>
  );
}