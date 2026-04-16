"use client";
import { useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

const OFFICES = {
  "BB": ["Dominika Kompaniková", "Dominka Kompaníková", "Milan Kováč", "Andrej Čík", "Tomáš Urbán", "Tomás Urban", "Dávid Juhaniak", "David Juhaniak"],
  "TT": ["Bálint Forró", "Bálint Forro", "Tomáš Opálek", "Karolína Lisická", "Martin Blažek", "Lukáš Krommel"],
  "NR": ["Martin Petráš", "Dávid Kalužák", "David Kalužák", "Daniel Kádek", "Gabriela Šodorová", "Dávid Čintala"],
  "BA": ["Milan Švorc", "Ján Mikuš", "Richard Kiss", "Karin Harvan", "Matej Hromada", "Milan Pulc", "Martin Bošeľa", "Peter Maťo", "Jonathán Pavelka", "Matej Klačko", "Dominik Ďurčo"],
  "TN": ["Libor Koníček", "Tomáš Otrubný", "Ján Skovajsa", "Tomáš Kučerka", "Patrik Frič"],
  "PD": ["Peter Mjartan", "Martin Mečiar"],
  "ZA": ["Tomáš Smieško", "Daniel Jašek", "Vladko Hess", "Wlodzimierz Hess", "Irena Varadová", "Matej Gažo", "Veronika Maťková", "Tomáš Ďurana"],
  "PP": ["Sebastián Čuban", "Tomáš Matta"],
  "KE": ["Ján Tej", "Adrián Šomšág", "Viliam Baran", "Jaroslav Hažlinský", "Martin Živčák", "Ján Slivka"]
}

const COLORS = ["#f97316","#3b82f6","#22c55e","#a855f7","#ef4444","#eab308","#06b6d4","#ec4899"]

function getOffice(name) {
  for (const [office, names] of Object.entries(OFFICES)) {
    if (names.some(n => n.trim().toLowerCase() === name.trim().toLowerCase())) return office
  }
  return "Iné"
}

export default function TrendClient({ snapshots }) {
  const [view, setView] = useState("office")
  const [selectedOffice, setSelectedOffice] = useState("Všetky")

  const dates = [...new Set(snapshots.map(s => s.snapshot_date))].sort()

  // Vypočítaj denný priemer pre kancelárie
  const officeData = dates.map(date => {
    const daySnaps = snapshots.filter(s => s.snapshot_date === date)
    const row = { date: date.slice(5) } // MM-DD
    Object.keys(OFFICES).forEach(office => {
      const officeSnaps = daySnaps.filter(s => getOffice(s.owner_name) === office)
      if (officeSnaps.length > 0) {
        const totalOk = officeSnaps.reduce((a,b) => a + b.cena_ok, 0)
        const total = officeSnaps.reduce((a,b) => a + b.total, 0)
        row[office] = total > 0 ? Math.round((totalOk/total)*100) : 0
      }
    })
    return row
  })

  // Vypočítaj denné dáta pre maklérov podľa kancelárie
  const filteredSnaps = selectedOffice === "Všetky" ? snapshots : snapshots.filter(s => getOffice(s.owner_name) === selectedOffice)
  const brokerNames = [...new Set(filteredSnaps.map(s => s.owner_name))].slice(0, 10)

  const brokerData = dates.map(date => {
    const row = { date: date.slice(5) }
    brokerNames.forEach(name => {
      const snap = filteredSnaps.find(s => s.snapshot_date === date && s.owner_name === name)
      if (snap) row[name] = snap.health_pct
    })
    return row
  })

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Trend zdravia ponuky</h1>
      <p className="text-gray-500 mb-6">Vývoj zdravia ponuky v čase</p>

      {dates.length < 2 ? (
        <div className="bg-white rounded-xl p-8 text-center text-gray-500">
          <p className="text-lg mb-2">Zatiaľ máme dáta len pre {dates.length} deň</p>
          <p className="text-sm">Graf sa zobrazí od zajtra keď budeme mať aspoň 2 dni dát.</p>
          <p className="text-sm mt-2">Snapshot sa automaticky uloží každý deň o 23:00.</p>
        </div>
      ) : (
        <>
          <div className="flex gap-3 mb-6">
            <button onClick={() => setView("office")} className={"px-4 py-2 rounded-full text-sm font-medium " + (view === "office" ? "bg-orange-500 text-white" : "bg-gray-200 text-gray-700")}>
              Podľa kancelárií
            </button>
            <button onClick={() => setView("broker")} className={"px-4 py-2 rounded-full text-sm font-medium " + (view === "broker" ? "bg-orange-500 text-white" : "bg-gray-200 text-gray-700")}>
              Podľa maklérov
            </button>
          </div>

          {view === "office" && (
            <div className="bg-white rounded-xl p-6 mb-6">
              <h2 className="text-lg font-semibold mb-4">Vývoj podľa kancelárií (%)</h2>
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={officeData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" />
                  <YAxis domain={[0, 100]} unit="%" />
                  <Tooltip formatter={(v) => v + "%"} />
                  <Legend />
                  {Object.keys(OFFICES).map((office, i) => (
                    <Line key={office} type="monotone" dataKey={office} stroke={COLORS[i]} strokeWidth={2} dot={true} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {view === "broker" && (
            <>
              <div className="flex flex-wrap gap-2 mb-4">
                <button onClick={() => setSelectedOffice("Všetky")} className={"px-3 py-1 rounded-full text-sm " + (selectedOffice === "Všetky" ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700")}>Všetky</button>
                {Object.keys(OFFICES).map(o => (
                  <button key={o} onClick={() => setSelectedOffice(o)} className={"px-3 py-1 rounded-full text-sm " + (selectedOffice === o ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700")}>{o}</button>
                ))}
              </div>
              <div className="bg-white rounded-xl p-6 mb-6">
                <h2 className="text-lg font-semibold mb-4">Vývoj podľa maklérov – {selectedOffice} (%)</h2>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={brokerData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" />
                    <YAxis domain={[0, 100]} unit="%" />
                    <Tooltip formatter={(v) => v + "%"} />
                    <Legend />
                    {brokerNames.map((name, i) => (
                      <Line key={name} type="monotone" dataKey={name} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={true} />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}