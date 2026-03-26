"use client";
import { useState } from "react";
import { createClient } from "../../lib/supabase";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const supabase = createClient();

  async function handleReset(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`
    });
    if (error) {
      setError("Email nebol nájdený alebo nastala chyba");
    } else {
      setMessage("Email s odkazom na obnovu hesla bol odoslaný!");
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
        <h2 className="text-xl font-bold text-center text-gray-900 mb-2">Zabudnuté heslo</h2>
        <p className="text-center text-gray-500 text-sm mb-6">Zadajte váš email a pošleme vám odkaz na obnovu hesla</p>
        {!message ? (
          <form onSubmit={handleReset} className="flex flex-col gap-4">
            <div>
              <label className="text-sm font-medium text-gray-900">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="mt-1 w-full border border-gray-200 rounded-lg px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-400"
                placeholder="meno@autorro.sk"
                required
              />
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded-lg transition-colors"
            >
              {loading ? "Odosielanie..." : "Odoslať odkaz"}
            </button>
          </form>
        ) : (
          <div className="text-center">
            <p className="text-green-600 font-medium mb-4">{message}</p>
            <p className="text-gray-500 text-sm">Skontrolujte váš email a kliknite na odkaz.</p>
          </div>
        )}
        <div className="text-center mt-6">
          <Link href="/login" className="text-sm text-orange-500 hover:text-orange-600">
            ← Späť na prihlásenie
          </Link>
        </div>
      </div>
    </div>
  );
}