// src/lib/apiFootball.ts
// src/lib/apiFootball.ts

// 1. Exportamos un tipo vacío o genérico para que no falle el resto del código
export interface ApiFootballFixture {
  [key: string]: any;
}

// 2. Definimos la función de estado para que los otros archivos no fallen
export function isFinishedStatus(status: string) {
  // Football-Data usa "FINISHED"
  return status === "FINISHED";
}

export async function apiFootballGet<T = any>(endpoint: string, params: Record<string, any> = {}): Promise<T> {
  const baseUrl = "https://api.football-data.org/v4";
  const url = new URL(`${baseUrl}${endpoint}`);
  
  Object.keys(params).forEach(key => {
    if (params[key] !== undefined && params[key] !== null) {
      url.searchParams.append(key, String(params[key]));
    }
  });

  const response = await fetch(url.toString(), {
    headers: {
      "X-Auth-Token": process.env.API_FOOTBALL_KEY as string,
    },
    next: { revalidate: 0 }
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error("Error API Football-Data:", errorData);
    throw new Error(`Error en API Football-Data: ${response.statusText}`);
  }
  
  return response.json();
}