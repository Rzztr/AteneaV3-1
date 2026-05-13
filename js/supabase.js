const SUPABASE_URL = "https://pltwgpnqggznunmcvtad.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsdHdncG5xZ2d6bnVubWN2dGFkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1Nzg1MDcsImV4cCI6MjA5MDE1NDUwN30.kEBaYIo9NwtXiG7vbNZZ07G3k1Cw48sK4RvsVpxjtDc";
const HEADERS = {
  "Content-Type": "application/json",
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
};
async function sbFetch(endpoint, options = {}) {
  const { extraHeaders: extraHeaders, ...fetchOptions } = options;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${endpoint}`, {
      headers: { ...HEADERS, ...extraHeaders },
      ...fetchOptions,
    });
    if (!res.ok) {
      const errorBody = await res.json().catch(() => ({}));
      console.error(
        `[Supabase] Error ${res.status} en /${endpoint}:`,
        errorBody,
      );
      return { data: null, error: errorBody };
    }
    if (res.status === 204) return { data: null, error: null };
    const data = await res.json();
    return { data: data, error: null };
  } catch (err) {
    console.error("[Supabase] Error de red:", err);
    return { data: null, error: err };
  }
}
async function saveAnonymousIncident(incident) {
  const { data: data, error: error } = await sbFetch("incidencias", {
    method: "POST",
    extraHeaders: { Prefer: "return=representation" },
    body: JSON.stringify({
      tipo: "panic",
      status: "activa",
      lat: incident?.lat ?? null,
      lng: incident?.lng ?? null,
      notas: "Pánico anónimo desde inicio web",
      created_at: new Date().toISOString(),
    }),
  });
  if (error) {
    console.error("[Supabase] saveAnonymousIncident:", error);
    return null;
  }
  console.log("[Supabase] Pánico anónimo guardado:", data);
  return data;
}
window.saveAnonymousIncident = saveAnonymousIncident;

async function updateAnonymousIncidentLocation(id, lat, lng) {
  const { data, error } = await sbFetch(`incidencias?id=eq.${id}`, {
    method: "PATCH",
    extraHeaders: { Prefer: "return=representation" },
    body: JSON.stringify({ lat, lng }),
  });
  if (error) {
    console.error("[Supabase] updateAnonymousIncidentLocation:", error);
    return null;
  }
  return data;
}
window.updateAnonymousIncidentLocation = updateAnonymousIncidentLocation;

async function checkRemoteLock() {
    console.log("[Lock] Verificando bloqueo remoto...");
    const { data, error } = await sbFetch(
        "incidencias?select=status&status=in.(bloqueado,libre)&order=created_at.desc&limit=1"
    );
    if (error) {
        console.error("[Lock] Error al consultar bloqueo:", error);
        return false;
    }
    if (!data || data.length === 0) {
        console.log("[Lock] Sin registros de bloqueo encontrados.");
        return false;
    }
    const isLocked = data[0].status === "bloqueado";
    console.log("[Lock] Resultado:", isLocked ? "BLOQUEADO" : "LIBRE");
    return isLocked;
}
window.checkRemoteLock = checkRemoteLock;
