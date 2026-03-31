// Conexión a Supabase usando fetch() nativo
// Tabla: incidencias

const SUPABASE_URL = 'https://pltwgpnqggznunmcvtad.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_7W0hgCVN_CIU0MrKdXhB0w_moW0BS_S';

const HEADERS = {
  'Content-Type': 'application/json',
  'apikey': SUPABASE_ANON_KEY,
  'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
};
 
// ─────────────────────────────────────────────
// HELPER INTERNO
// Centraliza fetch + manejo de errores
// ─────────────────────────────────────────────
async function sbFetch(endpoint, options = {}) {
  const { extraHeaders, ...fetchOptions } = options;
 
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${endpoint}`, {
      headers: { ...HEADERS, ...extraHeaders },
      ...fetchOptions
    });
 
    if (!res.ok) {
      const errorBody = await res.json().catch(() => ({}));
      console.error(`[Supabase] Error ${res.status} en /${endpoint}:`, errorBody);
      return { data: null, error: errorBody };
    }
 
    if (res.status === 204) return { data: null, error: null };
 
    const data = await res.json();
    return { data, error: null };
 
  } catch (err) {
    console.error('[Supabase] Error de red:', err);
    return { data: null, error: err };
  }
}
 
// ─────────────────────────────────────────────
// PÁNICO ANÓNIMO (Web)
// ─────────────────────────────────────────────
async function saveAnonymousIncident(incident) {
  const { data, error } = await sbFetch('incidencias', {
    method: 'POST',
    extraHeaders: { 'Prefer': 'return=representation' },
    body: JSON.stringify({
      tipo:       'panic',
      status:     'activa',
      lat:        incident?.lat ?? null,
      lng:        incident?.lng ?? null,
      notas:      'Pánico anónimo desde inicio web',
      created_at: new Date().toISOString()
    })
  });
 
  if (error) { console.error('[Supabase] saveAnonymousIncident:', error); return null; }
  console.log('[Supabase] Pánico anónimo guardado:', data);
  return data;
}
 
// ─────────────────────────────────────────────
// EXPONER AL SCOPE GLOBAL
// ─────────────────────────────────────────────
window.saveAnonymousIncident = saveAnonymousIncident;