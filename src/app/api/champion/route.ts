import { NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabaseClient";

// Define la fecha límite: 11 de junio de 2026 a las 12:00 UTC
const DEADLINE = new Date("2026-06-11T12:00:00Z");

// --- MÉTODO POST (Guardar Campeón) ---
export async function POST(request: Request) {
  // 1. Verificación de seguridad: Bloqueo de fecha
  if (new Date() > DEADLINE) {
    return NextResponse.json(
      { message: "Ya no se permiten cambios de campeón. El Mundial ya comenzó." }, 
      { status: 403 }
    );
  }

  const supabase = getSupabaseClient();
  const body = await request.json();
  const auth = request.headers.get("authorization") ?? "";
  const token = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7) : null;

  if (!token) return NextResponse.json({ message: "No autenticado" }, { status: 401 });

  const { data: authData } = await supabase.auth.getUser(token);
  if (!authData.user) return NextResponse.json({ message: "No autenticado" }, { status: 401 });

  const { championTeam } = body;

  const { data: user } = await (supabase
    .from("users")
    .select("id")
    .eq("auth_user_id", authData.user.id)
    .single() as any);

  if (!user) return NextResponse.json({ message: "Usuario no encontrado" }, { status: 404 });

  const { error } = await (supabase.from("tournament_predictions") as any)
    .upsert({ 
      user_id: user.id, 
      champion_team: championTeam 
    }, { onConflict: "user_id" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// --- MÉTODO GET (Recuperar Campeón) ---
export async function GET(request: Request) {
  const supabase = getSupabaseClient();
  const auth = request.headers.get("authorization") ?? "";
  const token = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7) : null;

  if (!token) return NextResponse.json({ message: "No token" }, { status: 401 });

  const { data: authData } = await supabase.auth.getUser(token);
  if (!authData.user) return NextResponse.json({ message: "No user" }, { status: 401 });

  const { data: user } = await (supabase
    .from("users")
    .select("id")
    .eq("auth_user_id", authData.user.id)
    .single() as any);

  if (!user) return NextResponse.json({ championTeam: null });

  const { data: existingPrediction, error } = await (supabase
    .from("tournament_predictions") as any)
    .select("champion_team")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) return NextResponse.json({ championTeam: null });

  return NextResponse.json({
    championTeam: (existingPrediction as any)?.champion_team ?? null,
  });
}