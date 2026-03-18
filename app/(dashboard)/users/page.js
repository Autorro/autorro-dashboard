"use client";
import { useState, useEffect } from "react";

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function loadUsers() {
    const res = await fetch("/api/users");
    const data = await res.json();
    setUsers(data.users || []);
  }

  useEffect(() => { loadUsers(); }, []);

  async function handleCreate(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email })
    });
    const data = await res.json();
    if (data.error) {
      setError(data.error);
    } else {
      setMessage("Pozvánka odoslaná na " + email + "!");
      setEmail("");
      loadUsers();
    }
    setLoading(false);
  }

  async function handleDelete(id) {
    if (!confirm("Naozaj vymazať tohto používateľa?")) return;
    await fetch("/api/users?id=" + id, { method: "DELETE" });
    loadUsers();
  }

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Správa používateľov</h1>
      <p className="text-gray-500 mb-8">Pozvi nových používateľov – dostanú email s odkazom na nastavenie hesla</p>

      <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
        <h2 className="text-lg font-semibold mb-4">Pozvať nového používateľa</h2>
        <form onSubmit={handleCreate} className="flex flex-col gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700">Email</label>
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
          {message && <p className="text-green-600 text-sm font-medium">{message}</p>}
          <button
            type="submit"
            disabled={loading}
            className="bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded-lg transition-colors"
          >
            {loading ? "Odosielanie..." : "Poslať pozvánku"}
          </button>
        </form>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-semibold mb-4">Používatelia ({users.length})</h2>
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-3 text-left text-gray-600">Email</th>
              <th className="p-3 text-left text-gray-600">Vytvorený</th>
              <th className="p-3 text-left text-gray-600">Posledné prihlásenie</th>
              <th className="p-3 text-left text-gray-600"></th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} className="border-t border-gray-100">
                <td className="p-3 font-medium">{u.email}</td>
                <td className="p-3 text-gray-500">{new Date(u.created_at).toLocaleDateString("sk")}</td>
                <td className="p-3 text-gray-500">{u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleDateString("sk") : "Nikdy"}</td>
                <td className="p-3">
                  <button onClick={() => handleDelete(u.id)} className="text-red-500 hover:text-red-700 text-xs">
                    Vymazať
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}