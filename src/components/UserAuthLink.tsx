"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getSupabaseClient } from "@/lib/supabaseClient";

export function UserAuthLink() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const supabase = getSupabaseClient();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsLoggedIn(!!session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setIsLoggedIn(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (isLoggedIn === null) return null;

  return isLoggedIn ? (
    <button 
      onClick={() => supabase.auth.signOut()} 
      className="rounded-full bg-white/10 px-4 py-1.5 font-medium text-neutral-100 hover:bg-white/20 transition-colors"
    >
      Cerrar sesión
    </button>
  ) : (
    <Link 
      href="/auth" 
      className="rounded-full bg-white/10 px-4 py-1.5 font-medium text-neutral-100 hover:bg-white/20 transition-colors"
    >
      Iniciar sesión
    </Link>
  );
}