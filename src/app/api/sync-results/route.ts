import { NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { apiFootballGet } from "@/lib/apiFootball";

function isFinishedStatus(status: string) {
  return status === "FINISHED";
}

async function sync(request: Request) {
  const secret = process.env.SYNC_SECRET;
  if (!secret) {
    return NextResponse.json({ message: "Falta SYNC_SECRET en variables de entorno" }, { status: 500 });
  }

  // Obtenemos el secreto desde la URL (ej: /api/sync-results?secret=tu_secreto)
  const url = new URL(request.url);
  const querySecret = url.searchParams.get("secret");
  
  // Validamos el secreto
  if (querySecret !== secret) {
    return NextResponse.json({ message: "No autorizado" }, { status: 401 });
  }

  const supabase = getSupabaseClient();

  try {
    const data = await apiFootballGet("/competitions/WC/matches");
    const matches = data.matches || [];

    const updates = matches
      .filter((m: any) => isFinishedStatus(m.status))
      .filter((m: any) => m.score?.fullTime?.home !== null && m.score?.fullTime?.away !== null)
      .map((m: any) => {
        const updateData: any = {
          source: "football-data",
          external_id: String(m.id),
          home_score: m.score.fullTime.home,
          away_score: m.score.fullTime.away,
        };

        if (m.homeTeam?.crest) updateData.home_logo_url = m.homeTeam.crest;
        if (m.awayTeam?.crest) updateData.away_logo_url = m.awayTeam.crest;

        return updateData;
      });

    if (updates.length === 0) {
      return NextResponse.json({ ok: true, updated: 0, message: "Nada que sincronizar" });
    }

    const { error: upsertError } = await (supabase.from("matches") as any)
      .upsert(updates, { onConflict: "source,external_id" });

    if (upsertError) {
      return NextResponse.json({ message: "Error en Supabase", error: upsertError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, updated: updates.length });
  } catch (err: any) {
    return NextResponse.json({ message: "Error crítico", error: err.message }, { status: 500 });
  }
}

export const GET = sync;
export const POST = sync;