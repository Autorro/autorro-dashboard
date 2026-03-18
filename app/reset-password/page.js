"use client";
import { useState, useEffect } from "react";
import { createClient } from "../../lib/supabase";
import { useRouter } from "next/navigation";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();
  const supabase = createClient();

  async function handleReset(e) {
    e.preventDefault();
    if (password !== confirm) {
      setError("Heslá sa nezhodujú");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setError(error.message);
    } else {
      setMessage("Heslo úspešne zmenené! Presmerovávam...");
      setTimeout(() => router.push("/"), 2000);
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-orange-500">Autorro Dashboard</h1>
          <p className="text-xs text-gray-400">CRManagement</p>
        </div>
        <h2 className="text-xl font-bold text-center text-gray-900 mb-6">Nastavte si heslo</h2>
        <form onSubmit={handleReset} className="flex flex-col gap-4">
          <div>
            <label className="text-sm font-medium text-gray-900">Nové heslo</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="mt-1 w-full border border-gray-200 rounded-lg px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-400"
              placeholder="Minimálne 6 znakov"
              required
              minLength={6}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-900">Potvrďte heslo</label>
            <input
              type="password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              className="mt-1 w-full border border-gray-200 rounded-lg px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-400"
              required
            />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          {message && <p className="text-green-600 text-sm font-medium">{message}</p>}
          <button
            type="submit"
            disabled={loading}
            className="bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded-lg transition-colors"
          >
            {loading ? "Ukladám..." : "Nastaviť heslo"}
          </button>
        </form>
      </div>
    </div>
  );
}