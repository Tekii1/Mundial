"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getSupabaseClient } from "@/lib/supabaseClient";

export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const supabase = getSupabaseClient();

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsLoggedIn(!!session);
    };
    checkSession();
  }, [supabase]);

  return (
    <section className="flex flex-1 flex-col justify-center gap-10">
      <div className="max-w-2xl space-y-4">
        <p className="text-sm font-medium uppercase tracking-[0.25em] text-emerald-400">
          Mundial 2026
        </p>
        <h1 className="text-balance text-4xl font-semibold leading-tight sm:text-5xl">
          Bienvenidos a la Quiniela Familiar.
        </h1>
        <p className="text-pretty text-base text-neutral-300 sm:text-lg">
          Crea las predicciones de cada partido y mira el ranking en tiempo real
          a medida que avanza el torneo.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        {/* El botón cambia según si el usuario ha iniciado sesión o no */}
        <Link
          href={isLoggedIn ? "/quiniela" : "/auth"}
          className="inline-flex items-center justify-center rounded-full bg-emerald-500 px-6 py-2.5 text-sm font-semibold text-neutral-950 shadow-lg shadow-emerald-500/25 transition hover:bg-emerald-400"
        >
          {isLoggedIn ? "Ir a mi quiniela" : "Empieza tu quiniela"}
        </Link>
        <Link
          href="/ranking"
          className="inline-flex items-center justify-center rounded-full border border-white/15 px-6 py-2.5 text-sm font-medium text-neutral-100 hover:border-white/35 hover:bg-white/5"
        >
          Ver ranking actual
        </Link>
      </div>

      <div className="mt-6 grid gap-4 text-sm text-neutral-300 sm:grid-cols-3">
        {/* Tus tarjetas se mantienen igual... */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="font-semibold text-neutral-50">Predicciones simples</p>
          <p className="mt-1 text-xs text-neutral-300">Define marcadores para cada partido.</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="font-semibold text-neutral-50">Ranking automático</p>
          <p className="mt-1 text-xs text-neutral-300">Tabla de posiciones en tiempo real.</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="font-semibold text-neutral-50">Pensado para familia</p>
          <p className="mt-1 text-xs text-neutral-300">Interfaz sencilla y rápida.</p>
        </div>
      </div>
    </section>
  );
}