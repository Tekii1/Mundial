"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabaseClient";

export default function AuthPage() {
  const supabase = getSupabaseClient();
  const router = useRouter();

  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleResetPassword = async () => {
    setMessage(null);
    if (!email) {
      setMessage("Ingresa tu correo para enviar el enlace de recuperación.");
      return;
    }

    try {
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${origin}/auth/callback`,
      });
      if (error) throw error;
      setMessage("Te enviamos un correo con instrucciones para restablecer tu contraseña.");
    } catch (err: any) {
      setMessage(`No se pudo enviar el correo de recuperación: ${err.message}`);
    }
  };

  const handleSubmit = async () => {
    setMessage(null);

    if (!email || !password) {
      setMessage("Por favor ingresa correo y contraseña.");
      return;
    }

    if (mode === "register" && !username.trim()) {
      setMessage("Por favor elige un alias o nombre para mostrar.");
      return;
    }

    try {
      setIsSubmitting(true);

      if (mode === "register") {
        // MODIFICACIÓN: Pasamos el nombre en options.data para que el Trigger lo procese
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { name: username.trim() },
          },
        });

        if (error) throw error;

        setMessage(
          "Registro exitoso. Revisa tu correo si se requiere confirmación y luego inicia sesión."
        );
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        // Éxito al iniciar sesión
        router.push("/");
        router.refresh(); 
      }
    } catch (err: any) {
      setMessage(`Error de autenticación: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="mx-auto flex max-w-md flex-col gap-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">
          {mode === "login" ? "Iniciar sesión" : "Crear cuenta"}
        </h1>
        <p className="text-sm text-neutral-300">
          Usa tu correo para identificar tus quinielas.
        </p>
      </header>

      <div className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-5 text-sm">
        {mode === "register" && (
          <div className="space-y-1">
            <label className="block text-xs font-medium text-neutral-300">
              Alias / nombre para mostrar
            </label>
            <input
              type="text"
              placeholder="Ej. Diego, La Tía Goles..."
              className="w-full rounded-lg border border-white/15 bg-neutral-900 px-3 py-2 text-sm text-neutral-50 outline-none placeholder:text-neutral-500 focus:border-emerald-400"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
        )}

        <div className="space-y-1">
          <label className="block text-xs font-medium text-neutral-300">
            Correo electrónico
          </label>
          <input
            type="email"
            placeholder="tucorreo@ejemplo.com"
            className="w-full rounded-lg border border-white/15 bg-neutral-900 px-3 py-2 text-sm text-neutral-50 outline-none placeholder:text-neutral-500 focus:border-emerald-400"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="space-y-1">
          <label className="block text-xs font-medium text-neutral-300">
            Contraseña
          </label>
          <input
            type="password"
            placeholder="Mínimo 6 caracteres"
            className="w-full rounded-lg border border-white/15 bg-neutral-900 px-3 py-2 text-sm text-neutral-50 outline-none placeholder:text-neutral-500 focus:border-emerald-400"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <button
          type="button"
          disabled={isSubmitting}
          onClick={handleSubmit}
          className="mt-2 inline-flex w-full items-center justify-center rounded-full bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-neutral-950 shadow-lg shadow-emerald-500/25 transition hover:bg-emerald-400 disabled:opacity-60"
        >
          {isSubmitting
            ? mode === "login" ? "Iniciando..." : "Creando cuenta..."
            : mode === "login" ? "Iniciar sesión" : "Crear cuenta"}
        </button>

        {mode === "login" && (
          <button
            type="button"
            onClick={handleResetPassword}
            className="block w-full text-center text-xs text-neutral-400 hover:text-neutral-200"
          >
            ¿Olvidaste tu contraseña?
          </button>
        )}

        {message && <p className="text-xs text-emerald-400 text-center">{message}</p>}
      </div>

      <button
        type="button"
        onClick={() => {
          setMessage(null);
          setMode(mode === "login" ? "register" : "login");
        }}
        className="text-xs text-neutral-400 hover:text-neutral-200"
      >
        {mode === "login"
          ? "¿No tienes cuenta? Crear una nueva"
          : "¿Ya tienes cuenta? Inicia sesión"}
      </button>
    </section>
  );
}