"use client";
import { useState } from "react";

const STAGES = {
  7: "Dohodnúť stretnutie",
  8: "Neskôr dohodnúť stretnutie", 
  9: "Dohodnuté stretnutie",
  10: "Nafotené",
  11: "Podpisované",
  13: "Inzerované",
  31: "Inzerované SK",
  34: "Inzerované SK2",
  22: "Inzerované CZ"
}

export default function ReakcnyClient({ changes }) {
  // Vypočítaj reakčný čas: čas medzi "Dohodnúť stretnutie" (7) a "Dohodnuté stretnutie" (9)
  const dealMap = {}
  changes.forEach(c => {
    if (!dealMap[c.deal_id]) dealMap[c.deal_id] = []
    dealMap[c.deal_id].push(c)
  })

  // Pre každý deal nájdi čas od stage 7 do stage 9
  const reactionTimes = []
  Object.values(dealMap).forEach(events => {
    const toStretnutie = events.find(e => e.to_stage === 7)
    const toDohodnute = events.find(e => e.to_stage === 9)
    if (toStretnutie && toDohodnute) {
      const diff = new Date(toDohodnute.changed_at) - new Date(toStretnutie.changed_at)
      const hours = Math.round(diff / 3600000)
      reactionTimes.push({
        deal_id: toStretnutie.deal_id,
        deal_title: toStretnutie.deal_title,
        owner_name: toStretnutie.owner_name,
        hours,
        days: Math.round(hours / 24 * 10) / 10
      })
    }
  })

  // Grupuj podľa makléra
  const brokers = {}
  reactionTimes.forEach(r => {
    if (!brokers[r.owner_name]) brokers[r.owner_name] = []
    brokers[r.owner_name].push(r.hours)
  })

  const brokerStats = Object.entries(brokers).map(([name, times]) => ({
    name,
    count: times.length,
    avg: Math.round(times.reduce((a,b) => a+b, 0) / times.length),
    min: Math.min(...times),
    max: Math.max(...times)
  })).sort((a,b) => a.avg - b.avg)

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Reakčný čas</h1>
      <p className="text-gray-500 mb-8">Čas od "Dohodnúť stretnutie" po "Dohodnuté stretnutie"</p>

      {changes.length === 0 ? (
        <div className="bg-white rounded-xl p-8 text-center text-gray-500">
          <p className="text-lg mb-2">Zatiaľ žiadne dáta</p>
          <p className="text-sm">Dáta sa zbierajú od dnes. Prvé štatistiky uvidíš keď makléri začnú presúvať dealy.</p>
        </div>
      ) : brokerStats.length === 0 ? (
        <div className="bg-white rounded-xl p-8 text-center text-gray-500">
          <p className="text-lg mb-2">Zbierame dáta...</p>
          <p className="text-sm">Zatiaľ máme {changes.length} zmien stage. Reakčný čas sa vypočíta keď maklér presunie deal z "Dohodnúť stretnutie" na "Dohodnuté stretnutie".</p>
        </div>
      ) : (
        <table className="w-full text-sm bg-white rounded-xl overflow-hidden">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-3 text-left">#</th>
              <th className="p-3 text-left">Maklér</th>
              <th className="p-3 text-left">Počet</th>
              <th className="p-3 text-left">Priemerný čas</th>
              <th className="p-3 text-left">Najrýchlejší</th>
              <th className="p-3 text-left">Najpomalší</th>
            </tr>
          </thead>
          <tbody>
            {brokerStats.map((b, i) => (
              <tr key={b.name} className="border-t border-gray-100">
                <td className="p-3 text-gray-500">{i+1}</td>
                <td className="p-3 font-medium">{b.name}</td>
                <td className="p-3">{b.count}</td>
                <td className="p-3 font-bold text-blue-600">{b.avg}h</td>
                <td className="p-3 text-green-600">{b.min}h</td>
                <td className="p-3 text-red-500">{b.max}h</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="mt-8 bg-white rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-4">Posledné zmeny stage ({changes.length})</h2>
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-3 text-left">Deal</th>
              <th className="p-3 text-left">Maklér</th>
              <th className="p-3 text-left">Z</th>
              <th className="p-3 text-left">Na</th>
              <th className="p-3 text-left">Čas</th>
            </tr>
          </thead>
          <tbody>
            {changes.slice(0, 20).map(c => (
              <tr key={c.id} className="border-t border-gray-100">
                <td className="p-3">{c.deal_title}</td>
                <td className="p-3">{c.owner_name}</td>
                <td className="p-3 text-gray-500 text-xs">{STAGES[c.from_stage] || c.from_stage}</td>
                <td className="p-3 text-gray-500 text-xs">{STAGES[c.to_stage] || c.to_stage}</td>
                <td className="p-3 text-gray-500 text-xs">{new Date(c.changed_at).toLocaleString("sk")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}