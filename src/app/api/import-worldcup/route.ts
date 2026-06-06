import { NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { apiFootballGet } from "@/lib/apiFootball";

function unauthorized() {
  return NextResponse.json({ message: "No autorizado" }, { status: 401 });
}

export async function GET(request: Request) {
  // 1. Validación de Seguridad
  const secret = process.env.SYNC_SECRET;
  const url = new URL(request.url);
  const querySecret = url.searchParams.get("secret");
  const headerSecret = request.headers.get("x-sync-secret");
  const isVercelCron = request.headers.get("auth-action") === "cron-job";

  if (querySecret !== secret && headerSecret !== secret && !isVercelCron) {
    return unauthorized();
  }

  const supabase = getSupabaseClient();

  try {
    // 2. Llamada a la API de Football-Data
    const data = await apiFootballGet("/competitions/WC/matches");
    const matches = data.matches;

    if (!matches || !Array.isArray(matches)) {
      return NextResponse.json({ 
        ok: false, 
        message: "No se encontraron partidos o formato inválido" 
      });
    }

    // 3. Mapeo de datos con protecciones contra nulls
    const rows = matches.map((m: any) => ({
      external_id: String(m.id),
      // Si el nombre es null, usamos "TBD" para evitar violar el NOT NULL de la BD
      home_team: m.homeTeam?.name ?? "TBD",
      away_team: m.awayTeam?.name ?? "TBD",
      home_logo_url: m.homeTeam?.crest ?? null,
      away_logo_url: m.awayTeam?.crest ?? null,
      group_or_phase: m.stage ?? "N/A",
      kickoff_at: m.utcDate,
      home_score: m.score?.fullTime?.home ?? null,
      away_score: m.score?.fullTime?.away ?? null,
      status: m.status ?? "TIMED",
      source: "football-data",
      external_league: "WC",
      external_season: m.season?.startDate ? m.season.startDate.split('-')[0] : "2026",
    }));

    // 4. Upsert masivo en Supabase
    // Nota: Asegúrate de que external_league sea tipo TEXT en Supabase como hablamos antes
    const { error: upsertError } = await (supabase.from("matches") as any)
      .upsert(rows, { 
        onConflict: "source,external_id" 
      });

    if (upsertError) {
      console.error("Error detalle Supabase:", upsertError);
      throw new Error(upsertError.message);
    }

    return NextResponse.json({
      ok: true,
      imported: rows.length,
      message: "Sincronización completada",
      timestamp: new Date().toISOString(),
    });

  } catch (err) {
    console.error("Error crítico en import-worldcup:", err);
    return NextResponse.json(
      {
        message: "Error interno en el servidor",
        error: err instanceof Error ? err.message : "Error desconocido",
      },
      { status: 500 }
    );
  }
}