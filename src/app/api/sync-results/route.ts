import { NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { apiFootballGet } from "@/lib/apiFootball";

// Estados válidos para considerar el partido terminado
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

  try {
    // 1. Obtener partidos de la API
    const data = await apiFootballGet("/competitions/WC/matches");
    const matches = data.matches || [];

    // 2. Mapear y filtrar solo los terminados
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

        // Solo incluir logos si existen, para no sobreescribir con nulls
        if (m.homeTeam?.crest) updateData.home_logo_url = m.homeTeam.crest;
        if (m.awayTeam?.crest) updateData.away_logo_url = m.awayTeam.crest;

        return updateData;
      });

    if (updates.length === 0) {
      return NextResponse.json({ ok: true, updated: 0, message: "Nada que sincronizar" });
    }

    // 3. Upsert en Supabase
    // Al usar onConflict, Supabase actualizará solo los campos proporcionados
    const { error: upsertError } = await (supabase.from("matches") as any)
      .upsert(updates, { onConflict: "source,external_id" });

    if (upsertError) {
      console.error("Error en Upsert de Sync:", upsertError);
      return NextResponse.json(
        { message: "Error actualizando resultados", error: upsertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      ok: true, 
      updated: updates.length,
      message: "Sincronización exitosa. El trigger de puntos se ejecutó automáticamente." 
    });
  } catch (err: any) {
    console.error("Error crítico en sync:", err);
    return NextResponse.json({ message: "Error en la sincronización", error: err.message }, { status: 500 });
  }
}