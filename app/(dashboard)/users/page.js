"use client";
import { useState, useEffect } from "react";

function Badge({ confirmed }) {
  return confirmed
    ? <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">Aktívny</span>
    : <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">Čaká na potvrdenie</span>
}

const ROLE_STYLE = {
  "admin":     "bg-red-100 text-red-700",
  "manažment": "bg-blue-100 text-blue-700",
  "maklér":    "bg-gray-100 text-gray-600",
};
const ROLE_LABEL = { "admin": "Admin", "manažment": "Manažment", "maklér": "Maklér" };
function RoleBadge({ role }) {
  const r = role || "maklér";
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_STYLE[r] || "bg-gray-100 text-gray-600"}`}>{ROLE_LABEL[r] || r}</span>;
}

export default function UsersPage() {
  const [users,          setUsers]          = useState([]);
  const [pipedriveUsers, setPipedriveUsers] = useState([]);
  const [loading,        setLoading]        = useState(false);
  const [fetching,       setFetching]       = useState(true);
  const [message,        setMessage]        = useState("");
  const [error,          setError]          = useState("");
  const [form, setForm] = useState({ email: "", full_name: "", pipedrive_name: "", role: "maklér" });

  async function loadUsers() {
    setFetching(true);
    const res  = await fetch("/api/users");
    const data = await res.json();
    if (data.error) setError(data.error);
    else setUsers(data.users || []);
    setFetching(false);
  }

  async function loadPipedriveUsers() {
    const res  = await fetch("/api/pipedrive-users");
    const data = await res.json();
    if (!data.error) setPipedriveUsers(data.users || []);
  }

  useEffect(() => {
    loadUsers();
    loadPipedriveUsers();
  }, []);

  function handlePipedriveSelect(e) {
    const userId = e.target.value;
    if (!userId) return;
    const pu = pipedriveUsers.find(u => String(u.id) === userId);
    if (!pu) return;
    // Derive email suggestion: last part of their Pipedrive email if it ends @autorro.sk,
    // otherwise leave blank for manual entry
    const suggestedEmail = pu.email?.endsWith("@autorro.sk") ? pu.email : "";
    setForm(f => ({
      ...f,
      full_name:      pu.name,
      pipedrive_name: pu.name,
      email:          suggestedEmail || f.email,
    }));
  }

  async function handleCreate(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    const res  = await fetch("/api/users", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(form),
    });
    const data = await res.json();

    if (data.error) {
      setError(data.error);
    } else {
      setMessage(`✓ Pozvánka odoslaná na ${form.email}`);
      setForm({ email: "", full_name: "", pipedrive_name: "", role: "maklér" });
      loadUsers();
    }
    setLoading(false);
  }

  async function handleResend(email) {
    const res  = await fetch("/api/users", {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ email }),
    });
    const data = await res.json();
    if (data.error) alert(data.error);
    else setMessage(`✓ Pozvánka znova odoslaná na ${email}`);
  }

  async function handleDelete(id, email) {
    if (!confirm(`Naozaj vymazať ${email}?`)) return;
    const res  = await fetch(`/api/users?id=${id}`, { method: "DELETE" });
    const data = await res.json();
    if (data.error) alert(data.error);
    else { setMessage(`✓ Používateľ ${email} vymazaný`); loadUsers(); }
  }

  const confirmed   = users.filter(u => u.confirmed);
  const unconfirmed = users.filter(u => !u.confirmed);

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-1">Správa používateľov</h1>
        <p className="text-gray-500">Vytvor účet → používateľ dostane email s odkazom na nastavenie hesla</p>
      </div>

      {/* Formulár */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-semibold mb-5">Pridať nového používateľa</h2>
        <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {pipedriveUsers.length > 0 && (
            <div className="md:col-span-2">
              <label className="text-sm font-medium text-gray-700 block mb-1">
                Vybrať z Pipedrive
                <span className="text-gray-400 font-normal ml-1">(automaticky vyplní polia)</span>
              </label>
              <select
                onChange={handlePipedriveSelect}
                defaultValue=""
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-orange-400"
              >
                <option value="">— Vyber používateľa —</option>
                {pipedriveUsers.map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="md:col-span-2">
            <label className="text-sm font-medium text-gray-700 block mb-1">Email *</label>
            <input
              type="email"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-400"
              placeholder="priezvisko@autorro.sk"
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Celé meno *</label>
            <input
              type="text"
              value={form.full_name}
              onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-400"
              placeholder="Meno Priezvisko"
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">
              Meno v Pipedrive
              <span className="text-gray-400 font-normal ml-1">(ak sa líši)</span>
            </label>
            <input
              type="text"
              value={form.pipedrive_name}
              onChange={e => setForm(f => ({ ...f, pipedrive_name: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-400"
              placeholder="Rovnaké ako celé meno"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Rola</label>
            <select
              value={form.role}
              onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white"
            >
              <option value="maklér">Maklér</option>
              <option value="manažment">Manažment</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          {error   && <p className="md:col-span-2 text-red-500 text-sm">{error}</p>}
          {message && <p className="md:col-span-2 text-green-600 text-sm font-medium">{message}</p>}

          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={loading}
              className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-semibold px-6 py-2.5 rounded-lg transition-colors"
            >
              {loading ? "Odosielanie..." : "Vytvoriť účet a poslať pozvánku"}
            </button>
          </div>
        </form>
      </div>

      {/* Zoznam */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            Používatelia
            <span className="ml-2 text-sm font-normal text-gray-500">
              {confirmed.length} aktívnych · {unconfirmed.length} čaká
            </span>
          </h2>
          <button onClick={loadUsers} className="text-sm text-gray-500 hover:text-gray-700">
            ↻ Obnoviť
          </button>
        </div>

        {fetching ? (
          <div className="p-8 text-center text-gray-400">Načítavam...</div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center text-gray-400">Žiadni používatelia</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-5 py-3 text-left">Meno / Email</th>
                <th className="px-5 py-3 text-left">Pipedrive</th>
                <th className="px-5 py-3 text-left">Rola</th>
                <th className="px-5 py-3 text-left">Stav</th>
                <th className="px-5 py-3 text-left">Posledné prihlásenie</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3">
                    <div className="font-medium text-gray-900">{u.full_name || "—"}</div>
                    <div className="text-gray-400 text-xs">{u.email}</div>
                  </td>
                  <td className="px-5 py-3 text-gray-600 text-xs">{u.pipedrive_name || u.full_name || "—"}</td>
                  <td className="px-5 py-3"><RoleBadge role={u.role} /></td>
                  <td className="px-5 py-3"><Badge confirmed={u.confirmed} /></td>
                  <td className="px-5 py-3 text-gray-400 text-xs">
                    {u.last_sign_in ? new Date(u.last_sign_in).toLocaleDateString("sk") : "Nikdy"}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex gap-3 justify-end">
                      {!u.confirmed && (
                        <button
                          onClick={() => handleResend(u.email)}
                          className="text-xs text-blue-500 hover:text-blue-700"
                        >
                          Znova odoslať
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(u.id, u.email)}
                        className="text-xs text-red-400 hover:text-red-600"
                      >
                        Vymazať
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
