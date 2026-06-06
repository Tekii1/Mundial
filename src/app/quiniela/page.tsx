"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabaseClient";

type Match = {
  id: string;
  home_team: string;
  away_team: string;
  group_or_phase: string;
  kickoff_at: string;
  home_logo_url: string | null;
  away_logo_url: string | null;
};

export default function QuinielaPage() {
  const supabase = getSupabaseClient();
  const router = useRouter();
  const [matches, setMatches] = useState<Match[]>([]);
  const [predictions, setPredictions] = useState<Record<string, { home: string, away: string }>>({});
  const [championTeam, setChampionTeam] = useState("");
  const [stepIndex, setStepIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [page, setPage] = useState(0); // Estado para paginación
  
  const isInitialized = useRef(false);

  useEffect(() => {
    if (isInitialized.current) return;
    isInitialized.current = true;

    const loadInitialData = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          router.push("/login");
          return;
        }
        setSession(session);

        const [mRes, pRes, cRes] = await Promise.all([
          fetch("/api/matches"),
          fetch("/api/predictions", { headers: { Authorization: `Bearer ${session.access_token}` } }),
          fetch("/api/champion", { headers: { Authorization: `Bearer ${session.access_token}` } })
        ]);
        
        const [matchesData, predsData, championData] = await Promise.all([mRes.json(), pRes.json(), cRes.json()]);
        
        setMatches(matchesData || []);
        setChampionTeam(championData?.championTeam || "");

        const formatted = predsData.reduce((acc: any, p: any) => ({
          ...acc,
          [p.match_id]: { 
            home: p.predicted_home_score?.toString() || "", 
            away: p.predicted_away_score?.toString() || "" 
          }
        }), {});
        setPredictions(formatted);
      } catch (err) {
        console.error("Error cargando datos:", err);
      } finally {
        setIsLoading(false);
      }
    };
    loadInitialData();
  }, [supabase, router]);

  // Resetear página al cambiar de grupo
  useEffect(() => { setPage(0); }, [stepIndex]);

  const data = useMemo(() => {
    const groupsMap = new Map<string, Match[]>();
    const teamsSet = new Set<string>();
    matches.forEach(m => {
      const phase = (m.group_or_phase || "OTROS").toUpperCase();
      if (!groupsMap.has(phase)) groupsMap.set(phase, []);
      groupsMap.get(phase)!.push(m);
      if (m.home_team !== "TBD") teamsSet.add(m.home_team);
      if (m.away_team !== "TBD") teamsSet.add(m.away_team);
    });
    const sortedPhases = Array.from(groupsMap.keys()).sort();
    return { steps: ["CAMPEÓN", ...sortedPhases], groups: groupsMap, teams: Array.from(teamsSet).sort() };
  }, [matches]);

  const currentStep = data.steps[stepIndex] || "CAMPEÓN";
  const matchesToShow = data.groups.get(currentStep) || [];
  
  // Lógica de Paginación
  const pageSize = 10;
  const totalPages = Math.ceil(matchesToShow.length / pageSize);
  const paginatedMatches = useMemo(() => matchesToShow.slice(page * pageSize, (page + 1) * pageSize), [matchesToShow, page]);

  const handlePredChange = (id: string, field: "home" | "away", val: string) => {
    if (val !== "" && parseInt(val) < 0) return;
    setPredictions(prev => ({ ...prev, [id]: { ...(prev[id] || { home: "", away: "" }), [field]: val } }));
  };

  const saveCurrentPhase = async () => {
    setIsSaving(true);
    try {
      if (currentStep === "CAMPEÓN") {
        const res = await fetch("/api/champion", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session.access_token}` },
          body: JSON.stringify({ championTeam })
        });
        if (!res.ok) throw new Error("Error al guardar campeón");
        alert("¡Campeón guardado!");
        return;
      }

      const validPredictions = matchesToShow
        .filter(m => predictions[m.id]?.home !== "" && predictions[m.id]?.away !== "")
        .map(m => ({ matchId: m.id, home: parseInt(predictions[m.id].home), away: parseInt(predictions[m.id].away) }));

      if (validPredictions.length === 0) { alert("No hay cambios para guardar."); return; }

      const res = await fetch("/api/predictions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session.access_token}` },
        body: JSON.stringify({ predictions: validPredictions })
      });

      if (!res.ok) throw new Error("Error al guardar");
      alert(`¡${currentStep} guardado exitosamente!`);
    } catch (err: any) { alert(err.message); }
    finally { setIsSaving(false); }
  };

  if (isLoading) return <div className="p-10 text-center text-emerald-500 font-black animate-pulse">CARGANDO QUINIELA...</div>;

  return (
    <section className="max-w-4xl mx-auto p-4 space-y-8 text-white pb-32">
      <header className="space-y-6">
        <h1 className="text-4xl font-black text-emerald-500 tracking-tighter">QUINIELA 2026</h1>
        <nav className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide border-b border-white/10">
          {data.steps.map((step, idx) => (
            <button key={step} onClick={() => setStepIndex(idx)}
              className={`px-5 py-2 rounded-full whitespace-nowrap text-sm font-black transition-all ${stepIndex === idx ? "bg-emerald-500 text-black" : "bg-white/5 text-neutral-400"}`}>
              {step.replace("GROUP ", "G")}
            </button>
          ))}
        </nav>
      </header>

      <main className="min-h-[400px]">
        {currentStep === "CAMPEÓN" ? (
          <div className="bg-white/5 border border-white/10 rounded-[2rem] p-10 space-y-8">
            <h2 className="text-5xl font-black italic">🏆 EL CAMPEÓN</h2>
            <select value={championTeam} onChange={(e) => setChampionTeam(e.target.value)} className="w-full bg-neutral-900 p-5 rounded-2xl border border-white/10 text-xl font-bold">
              <option value="">Selecciona tu favorito...</option>
              {data.teams.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <button onClick={saveCurrentPhase} className="w-full bg-emerald-500 text-black font-black py-5 rounded-2xl text-xl">GUARDAR CAMPEÓN</button>
          </div>
        ) : (
          <div className="space-y-8">
            <h2 className="text-4xl font-black uppercase italic tracking-tighter">{currentStep.replace("GROUP", "GRUPO")}</h2>
            <div className="grid gap-4">
              {paginatedMatches.map((match) => (
                <div key={match.id} className="grid grid-cols-[1fr_auto_1fr] items-center p-5 rounded-[1.5rem] bg-white/5 border border-white/10">
                  <div className="flex items-center justify-end gap-4">
                    <span className="font-black text-sm md:text-lg">{match.home_team}</span>
                    {match.home_logo_url && <img src={match.home_logo_url} className="w-10 h-10 object-contain" />}
                  </div>
                  <div className="flex items-center gap-3 bg-neutral-950 rounded-2xl p-2 border border-white/5 mx-4">
                    <input type="number" min="0" value={predictions[match.id]?.home || ""} onChange={(e) => handlePredChange(match.id, "home", e.target.value)} className="w-12 h-12 text-center bg-transparent font-black text-2xl text-emerald-500 outline-none" />
                    <span className="text-neutral-800">VS</span>
                    <input type="number" min="0" value={predictions[match.id]?.away || ""} onChange={(e) => handlePredChange(match.id, "away", e.target.value)} className="w-12 h-12 text-center bg-transparent font-black text-2xl text-emerald-500 outline-none" />
                  </div>
                  <div className="flex items-center justify-start gap-4">
                    {match.away_logo_url && <img src={match.away_logo_url} className="w-10 h-10 object-contain" />}
                    <span className="font-black text-sm md:text-lg">{match.away_team}</span>
                  </div>
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-4">
                <button disabled={page === 0} onClick={() => setPage(p => p - 1)} className="px-6 py-2 bg-white/10 rounded-full font-black">ANTERIOR</button>
                <span className="font-black text-emerald-500">{page + 1} / {totalPages}</span>
                <button disabled={page === totalPages - 1} onClick={() => setPage(p => p + 1)} className="px-6 py-2 bg-white/10 rounded-full font-black">SIGUIENTE</button>
              </div>
            )}

            <button onClick={saveCurrentPhase} disabled={isSaving} className="w-full bg-emerald-500 text-black font-black py-5 rounded-2xl text-xl">
              {isSaving ? "GUARDANDO..." : `GUARDAR ${currentStep.replace("GROUP", "GRUPO")}`}
            </button>
          </div>
        )}
      </main>
    </section>
  );
}