"use client";

import { useEffect, useState } from "react";

export default function Home() {
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch("/api/pipedrive")
      .then((res) => res.json())
      .then((data) => {
        setDeals(data.data ?? []);
        setLoading(false);
      })
      .catch(() => {
        setError("Nepodarilo sa načítať dáta.");
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-8">
      <h1 className="text-2xl font-bold mb-6 text-white">Pipedrive Deals</h1>

      {loading && (
        <div className="flex items-center gap-3 text-gray-400">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-600 border-t-blue-500" />
          Načítavam dáta...
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-red-900/40 border border-red-700 px-4 py-3 text-red-300">
          {error}
        </div>
      )}

      {!loading && !error && (
        <div className="overflow-x-auto rounded-xl border border-gray-800">
          <table className="w-full text-sm">
            <thead className="bg-gray-900 text-gray-400 uppercase text-xs tracking-wider">
              <tr>
                <th className="px-6 py-4 text-left">Názov dealu</th>
                <th className="px-6 py-4 text-left">Hodnota</th>
                <th className="px-6 py-4 text-left">Status</th>
                <th className="px-6 py-4 text-left">Vlastník</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {deals.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                    Žiadne dealy sa nenašli.
                  </td>
                </tr>
              ) : (
                deals.map((deal) => (
                  <tr key={deal.id} className="bg-gray-900/50 hover:bg-gray-800/60 transition-colors">
                    <td className="px-6 py-4 font-medium text-white">{deal.title}</td>
                    <td className="px-6 py-4 text-green-400">
                      {deal.value != null
                        ? `${deal.value.toLocaleString()} ${deal.currency}`
                        : "—"}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          deal.status === "open"
                            ? "bg-blue-900 text-blue-300"
                            : deal.status === "won"
                            ? "bg-green-900 text-green-300"
                            : "bg-red-900 text-red-300"
                        }`}
                      >
                        {deal.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-300">
                      {deal.owner_name ?? "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
