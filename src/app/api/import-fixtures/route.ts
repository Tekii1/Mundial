import { NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { apiFootballGet } from "@/lib/apiFootball";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const competition = url.searchParams.get("competition") ?? "WC"; // Default a WC

  const supabase = getSupabaseClient();

  try {
    // Football-Data usa el endpoint /competitions/{code}/matches
    const data = await apiFootballGet(`/competitions/${competition}/matches`);
    const matches = data.matches ?? [];

    const rows = matches.map((m: any) => ({
      home_team: m.homeTeam.name,
      away_team: m.awayTeam.name,
      group_or_phase: m.stage ?? "N/A",
      kickoff_at: m.utcDate,
      home_score: m.score?.fullTime?.home ?? null,
      away_score: m.score?.fullTime?.away ?? null,
      home_logo_url: m.homeTeam.crest ?? null,
      away_logo_url: m.awayTeam.crest ?? null,
      
      // Campos extra
      source: "football-data",
      external_id: String(m.id),
      external_league: competition,
      external_season: m.season?.startDate?.split('-')[0] ?? "2026",
    }));

    if (rows.length === 0) {
      return NextResponse.json({ ok: true, imported: 0, message: "No se encontraron partidos" });
    }

    const { error } = await (supabase.from("matches") as any)
      .upsert(rows, { onConflict: "source,external_id" });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, imported: rows.length });

  } catch (err: any) {
    console.error("Error en import-fixtures:", err);
    return NextResponse.json(
      { error: err.message || "Error interno del servidor" },
      { status: 500 }
    );
  }
}