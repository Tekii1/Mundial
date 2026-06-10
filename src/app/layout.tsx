import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { UserAuthLink } from "@/components/UserAuthLink";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Quiniela Familiar Mundial",
  description: "Crea y consulta las predicciones del Mundial en familia.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body
        className={`${geistSans.variable} ${geistMono.variable} bg-neutral-950 text-neutral-100 antialiased`}
      >
        <div className="min-h-screen bg-gradient-to-b from-neutral-950 via-neutral-900 to-neutral-950">
          {/* Cabecera con navegación */}
          <header className="border-b border-white/10 bg-neutral-950/70 backdrop-blur">
            <nav className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
              {/* Usamos <a> para forzar recarga limpia y liberar memoria de la SPA */}
              <a href="/" className="text-lg font-semibold tracking-tight hover:text-emerald-500 transition-colors">
                Quiniela Mundial
              </a>
              
              <div className="flex gap-3 text-sm items-center">
                <a
                  href="/ranking"
                  className="rounded-full bg-emerald-500 px-4 py-1.5 font-medium text-neutral-950 hover:bg-emerald-400 transition-colors"
                >
                  Ver ranking
                </a>
                <UserAuthLink />
              </div>
            </nav>
          </header>

          {/* Contenido principal */}
          <main className="mx-auto flex max-w-5xl flex-1 flex-col px-6 py-10">
            {children}
          </main>

          {/* Pie de página */}
          <footer className="border-t border-white/10 bg-neutral-950/70 py-4 text-center text-xs text-neutral-400">
            Hecho en familia para el Mundial.
          </footer>
        </div>
      </body>
    </html>
  );
}