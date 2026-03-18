"use client";
import { useState } from "react";
import { createClient } from "../../../lib/supabase";

export default function ChangePasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const supabase = createClient();

  async function handleChange(e) {
    e.preventDefault();
    if (password !== confirm) {
      setError("Heslá sa nezhodujú");
      return;
    }
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setError(error.message);
    } else {
      setMessage("Heslo úspešne zmenené!");
      setPassword("");
      setConfirm("");
    }
    setLoading(false);
  }

  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-3xl font-bold mb-2">Zmena hesla</h1>
      <p className="text-gray-500 mb-8">Zmeňte si svoje prihlasovacie heslo</p>
      <div className="bg-white rounded-xl shadow-sm p-6">
        <form onSubmit={handleChange} className="flex flex-col gap-4">
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
            {loading ? "Ukladám..." : "Zmeniť heslo"}
          </button>
        </form>
      </div>
    </div>
  );
}