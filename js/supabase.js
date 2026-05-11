// Configuración de conexión
const SUPABASE_URL = "https://pltwgpnqggznunmcvtad.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_7W0hgCVN_CIU0MrKdXhB0w_moW0BS_S";

// Inicializar el cliente oficial de Supabase
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Crea una nueva incidencia de pánico
 */
async function saveAnonymousIncident(incident) {
    try {
        const { data, error } = await _supabase
            .from('incidencias')
            .insert([
                {
                    tipo: "panic",
                    status: "activa",
                    lat: incident?.lat ?? null,
                    lng: incident?.lng ?? null,
                    notas: "Pánico anónimo - Modo Sigilo Activado",
                    created_at: new Date().toISOString()
                }
            ])
            .select();

        if (error) {
            console.error("[Supabase] Error al crear incidencia:", error);
            return null;
        }

        console.log("[Supabase] Alerta inicial enviada:", data);
        return data;
    } catch (err) {
        console.error("[Supabase] Error crítico:", err);
        return null;
    }
}

/**
 * Actualiza la ubicación en tiempo real mientras el rastreo sigue activo
 */
async function updateAnonymousIncidentLocation(id, lat, lng) {
    const { data, error } = await _supabase
        .from('incidencias')
        .update({ lat, lng })
        .eq('id', id);

    if (error) {
        console.error("[Supabase] Error actualizando ubicación:", error);
        return null;
    }
    return data;
}

/**
 * ESCUCHA EN TIEMPO REAL: Esta función detecta cuando el operador libera el equipo
 */
function escucharLiberacion(incidentId, callback) {
    console.log(`[Realtime] Escuchando liberación para ID: ${incidentId}`);

    _supabase
        .channel('atenea-control')
        .on(
            'postgres_changes',
            {
                event: 'UPDATE',
                schema: 'public',
                table: 'incidencias',
                filter: `id=eq.${incidentId}`
            },
            (payload) => {
                console.log("[Realtime] Cambio detectado:", payload.new.status);
                
                // Si el operador cambia el status a 'resuelta' o 'liberada'
                if (payload.new.status === 'resuelta' || payload.new.status === 'liberada') {
                    callback();
                }
            }
        )
        .subscribe();
}

// Exponer funciones globalmente para main.js
window.saveAnonymousIncident = saveAnonymousIncident;
window.updateAnonymousIncidentLocation = updateAnonymousIncidentLocation;
window.escucharLiberacion = escucharLiberacion;