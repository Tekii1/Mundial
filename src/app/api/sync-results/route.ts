import { NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { apiFootballGet } from "@/lib/apiFootball";

// Football-Data usa estados como: "FINISHED", "IN_PLAY", "PAUSED", "TIMED"
function isFinishedStatus(status: string) {
  return status === "FINISHED";
}

function unauthorized() {
  return NextResponse.json({ message: "No autorizado" }, { status: 401 });
}

export async function GET(request: Request) {
  return sync(request);
}

export async function POST(request: Request) {
  return sync(request);
}

async function sync(request: Request) {
  const secret = process.env.SYNC_SECRET;
  if (!secret) {
    return NextResponse.json({ message: "Falta SYNC_SECRET" }, { status: 500 });
  }

  const url = new URL(request.url);
  const querySecret = url.searchParams.get("secret");
  const headerSecret = request.headers.get("x-sync-secret");

  if (querySecret !== secret && headerSecret !== secret) {
    return unauthorized();
  }

  const supabase = getSupabaseClient();

  // 1. Obtenemos los partidos del Mundial (WC) directamente de la API
  // Football-Data devuelve todos los partidos de la competencia
  try {
    const data = await apiFootballGet("/competitions/WC/matches");
    const matches = data.matches || [];

    // 2. Filtramos solo los terminados y mapeamos al formato de tu base de datos
    const updates = matches
      .filter((m: any) => isFinishedStatus(m.status))
      .filter((m: any) => m.score?.fullTime?.home !== null && m.score?.fullTime?.away !== null)
      .map((m: any) => ({
        source: "football-data", // Cambiamos la fuente para distinguirlo
        external_id: String(m.id),
        home_score: m.score.fullTime.home,
        away_score: m.score.fullTime.away,
        home_logo_url: m.homeTeam.crest ?? null,
        away_logo_url: m.awayTeam.crest ?? null,
      }));

    if (updates.length === 0) {
      return NextResponse.json({ ok: true, updated: 0, message: "Nada que sincronizar" });
    }

    // 3. Upsert en Supabase
    const { error: upsertError } = await (supabase.from("matches") as any)
      .upsert(updates, { onConflict: "source,external_id" });

    if (upsertError) {
      return NextResponse.json(
        { message: "Error actualizando resultados", error: upsertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, updated: updates.length });
  } catch (err) {
    console.error("Error en sync:", err);
    return NextResponse.json({ message: "Error en la sincronización" }, { status: 500 });
  }
}