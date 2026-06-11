"use client";

import { useEffect, useMemo, useState, useRef, memo } from "react";
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

// Fecha límite global: 11 de junio de 2026 a las 12:00 UTC
const DEADLINE = new Date("2026-06-11T12:00:00Z");

// --- Componentes Memoizados ---

const MatchRow = memo(({ match, prediction, onChange }: any) => {
  const isLocked = new Date() > new Date(match.kickoff_at);
  return (
    <div className={`grid grid-cols-[1fr_auto_1fr] items-center p-5 rounded-[1.5rem] bg-white/5 border border-white/10 ${isLocked ? "opacity-60" : ""}`}>
      <div className="flex items-center justify-end gap-4">
        <span className="font-black text-sm md:text-lg">{match.home_team}</span>
        {match.home_logo_url && <img src={match.home_logo_url} className="w-10 h-10 object-contain" alt="" />}
      </div>
      <div className="flex items-center gap-3 bg-neutral-950 rounded-2xl p-2 border border-white/5 mx-4">
        <input 
          type="number" 
          min="0" 
          disabled={isLocked}
          value={prediction?.home ?? ""} 
          onChange={(e) => onChange(match.id, "home", e.target.value)} 
          className="w-12 h-12 text-center bg-transparent font-black text-2xl text-emerald-500 outline-none disabled:text-neutral-600" 
        />
        <span className="text-neutral-800">VS</span>
        <input 
          type="number" 
          min="0" 
          disabled={isLocked}
          value={prediction?.away ?? ""} 
          onChange={(e) => onChange(match.id, "away", e.target.value)} 
          className="w-12 h-12 text-center bg-transparent font-black text-2xl text-emerald-500 outline-none disabled:text-neutral-600" 
        />
      </div>
      <div className="flex items-center justify-start gap-4">
        {match.away_logo_url && <img src={match.away_logo_url} className="w-10 h-10 object-contain" alt="" />}
        <span className="font-black text-sm md:text-lg">{match.away_team}</span>
      </div>
    </div>
  );
});
MatchRow.displayName = "MatchRow";

const ChampionSelector = memo(({ value, teams, onChange, onSave }: any) => {
  const isLocked = new Date() > DEADLINE;
  return (
    <div className="bg-white/5 border border-white/10 rounded-[2rem] p-10 space-y-8">
      <h2 className="text-5xl font-black italic">🏆 EL CAMPEÓN</h2>
      {isLocked && (
        <div className="bg-red-500/20 text-red-500 p-4 rounded-xl text-center font-bold">🚫 El plazo para elegir campeón ha finalizado.</div>
      )}
      <select disabled={isLocked} value={value} onChange={(e) => onChange(e.target.value)} className="w-full bg-neutral-900 p-5 rounded-2xl border border-white/10 text-xl font-bold cursor-pointer disabled:opacity-50">
        <option value="">Selecciona tu favorito...</option>
        {teams.map((t: string) => <option key={t} value={t}>{t}</option>)}
      </select>
      {!isLocked && (
        <button onClick={onSave} className="w-full bg-emerald-500 text-black font-black py-5 rounded-2xl text-xl hover:bg-emerald-400 transition-colors">GUARDAR CAMPEÓN</button>
      )}
    </div>
  );
});
ChampionSelector.displayName = "ChampionSelector";

const MatchList = memo(({ matches, predictions, onPredChange, onSave, phaseName, isSaving }: any) => (
  <div className="space-y-8">
    <h2 className="text-4xl font-black uppercase italic tracking-tighter">{phaseName.replace("GROUP", "GRUPO")}</h2>
    <div className="grid gap-4">
      {matches.map((match: any) => (
        <MatchRow key={match.id} match={match} prediction={predictions[match.id]} onChange={onPredChange} />
      ))}
    </div>
    <button onClick={onSave} disabled={isSaving} className="w-full bg-emerald-500 text-black font-black py-5 rounded-2xl text-xl hover:bg-emerald-400 transition-colors">
      {isSaving ? "GUARDANDO..." : `GUARDAR ${phaseName.replace("GROUP", "GRUPO")}`}
    </button>
  </div>
));
MatchList.displayName = "MatchList";

// --- Página Principal ---

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
  const [page, setPage] = useState(0);

  const hasLoadedData = useRef(false);

  useEffect(() => {
    return () => {
      setMatches([]);
      setPredictions({});
      hasLoadedData.current = false;
    };
  }, []);

  const loadData = async (currentSession: any) => {
    if (hasLoadedData.current) return;
    hasLoadedData.current = true;
    try {
      const [mRes, pRes, cRes] = await Promise.all([
        fetch("/api/matches"),
        fetch("/api/predictions", { headers: { Authorization: `Bearer ${currentSession.access_token}` } }),
        fetch("/api/champion", { headers: { Authorization: `Bearer ${currentSession.access_token}` } })
      ]);
      const [matchesData, predsData, championData] = await Promise.all([mRes.json(), pRes.json(), cRes.json()]);
      setMatches(matchesData || []);
      setChampionTeam(championData?.championTeam || "");
      const formatted = (predsData || []).reduce((acc: any, p: any) => ({
        ...acc,
        [p.match_id]: { home: p.predicted_home_score?.toString() || "", away: p.predicted_away_score?.toString() || "" }
      }), {});
      setPredictions(formatted);
    } catch (err) { console.error("Error cargando datos:", err); hasLoadedData.current = false; } finally { setIsLoading(false); }
  };

  useEffect(() => {
    let isSubscribed = true;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!isSubscribed) return;
      if (!session) router.push("/auth");
      else { setSession(session); loadData(session); }
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isSubscribed) return;
      if (event === 'SIGNED_OUT') router.push("/auth");
      else if (event === 'SIGNED_IN' && session) { setSession(session); loadData(session); }
    });
    return () => { isSubscribed = false; subscription.unsubscribe(); };
  }, []);

  useEffect(() => { setPage(0); }, [stepIndex]);

  const data = useMemo(() => {
    const groupsMap = new Map<string, Match[]>();
    const teamsSet = new Set<string>();
    if (!Array.isArray(matches)) return { steps: ["CAMPEÓN"], groups: groupsMap, teams: [] };
    matches.forEach(m => {
      const phase = (m.group_or_phase || "OTROS").toUpperCase();
      if (!groupsMap.has(phase)) groupsMap.set(phase, []);
      groupsMap.get(phase)!.push(m);
      if (m.home_team !== "TBD") teamsSet.add(m.home_team);
      if (m.away_team !== "TBD") teamsSet.add(m.away_team);
    });
    return { steps: ["CAMPEÓN", ...Array.from(groupsMap.keys()).sort()], groups: groupsMap, teams: Array.from(teamsSet).sort() };
  }, [matches]);

  const currentStep = data.steps[stepIndex] || "CAMPEÓN";
  const matchesToShow = data.groups.get(currentStep) || [];
  const paginatedMatches = useMemo(() => matchesToShow.slice(page * 10, (page + 1) * 10), [matchesToShow, page]);
  const totalPages = Math.ceil(matchesToShow.length / 10);

  const handlePredChange = (id: string, field: "home" | "away", val: string) => {
    if (val !== "" && (parseInt(val) < 0 || parseInt(val) > 99)) return;
    setPredictions(prev => ({ ...prev, [id]: { ...(prev[id] || { home: "", away: "" }), [field]: val } }));
  };

  const saveCurrentPhase = async () => {
    if (!session) return;
    setIsSaving(true);
    try {
      if (currentStep === "CAMPEÓN") {
        await fetch("/api/champion", { method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session.access_token}` }, body: JSON.stringify({ championTeam }) });
        alert("¡Campeón guardado!"); 
        setIsSaving(false);
        return;
      }
      
      const validPredictions = matchesToShow
        .reduce((acc: any[], m) => {
          const pred = predictions[m.id];
          if (pred && pred.home !== "" && pred.away !== "") {
            acc.push({ 
              matchId: m.id, 
              home: parseInt(pred.home), 
              away: parseInt(pred.away) 
            });
          }
          return acc;
        }, []);

      if (validPredictions.length === 0) { 
        alert("Completa al menos un partido para guardar."); 
        setIsSaving(false); 
        return; 
      }
      
      const res = await fetch("/api/predictions", { 
        method: "POST", 
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session.access_token}` }, 
        body: JSON.stringify({ predictions: validPredictions }) 
      });
      
      if (!res.ok) throw new Error("Error al guardar en servidor");
      
      alert(`¡${currentStep} guardado!`);
    } catch (err: any) { 
      alert(err.message); 
    } finally { 
      setIsSaving(false); 
    }
  };

  if (isLoading) return <div className="p-10 text-center text-emerald-500 font-black animate-pulse">CARGANDO QUINIELA...</div>;
  if (!session) return null;

  return (
    <section className="max-w-4xl mx-auto p-4 space-y-8 text-white pb-32">
      <header className="space-y-6">
        <a href="/" className="inline-block text-sm text-neutral-400 hover:text-emerald-500 transition-colors">
          ← VOLVER AL INICIO
        </a>
        <h1 className="text-4xl font-black text-emerald-500 tracking-tighter">QUINIELA 2026</h1>
        <nav className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide border-b border-white/10">
          {data.steps.map((step, idx) => (
            <button key={step} onClick={() => setStepIndex(idx)} className={`px-5 py-2 rounded-full whitespace-nowrap text-sm font-black transition-all ${stepIndex === idx ? "bg-emerald-500 text-black" : "bg-white/5 text-neutral-400"}`}>
              {step.replace("GROUP ", "G")}
            </button>
          ))}
        </nav>
      </header>

      <main className="min-h-[400px]">
        {currentStep === "CAMPEÓN" ? (
          <ChampionSelector value={championTeam} teams={data.teams} onChange={setChampionTeam} onSave={saveCurrentPhase} />
        ) : (
          <MatchList matches={paginatedMatches} predictions={predictions} onPredChange={handlePredChange} onSave={saveCurrentPhase} phaseName={currentStep} isSaving={isSaving} />
        )}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-4 mt-8">
            <button disabled={page === 0} onClick={() => setPage(p => p - 1)} className="px-6 py-2 bg-white/10 rounded-full font-black">ANTERIOR</button>
            <span className="font-black text-emerald-500">{page + 1} / {totalPages}</span>
            <button disabled={page === totalPages - 1} onClick={() => setPage(p => p + 1)} className="px-6 py-2 bg-white/10 rounded-full font-black">SIGUIENTE</button>
          </div>
        )}
      </main>
    </section>
  );
}