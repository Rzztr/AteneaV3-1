// js/main.js — GhostPrism PWA
// Punto de entrada principal para Botón de Pánico

const app = document.getElementById('app');

// ─────────────────────────────────────────────
// GEOLOCALIZACIÓN ROBUSTA
// Intenta obtener ubicación con dos estrategias antes de rendirse
// ─────────────────────────────────────────────
function obtenerUbicacion() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      console.warn('[Geolocalización] No soportada en este dispositivo');
      resolve(null);
      return;
    }

    // Intento 1: Alta precisión (GPS), espera hasta 12 segundos
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        console.log('[Geolocalización] ✓ GPS obtenido:', pos.coords.latitude, pos.coords.longitude);
        resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      () => {
        console.warn('[Geolocalización] GPS falló, intentando con red/WiFi...');

        // Intento 2: Baja precisión (WiFi/red), espera hasta 10 segundos
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            console.log('[Geolocalización] ✓ Ubicación por red obtenida:', pos.coords.latitude, pos.coords.longitude);
            resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          },
          (e) => {
            // Ambos intentos fallaron
            if (e.code === 1) {
              console.warn('[Geolocalización] Permiso denegado por el usuario');
            } else {
              console.warn('[Geolocalización] No se pudo obtener ubicación tras dos intentos:', e.message);
            }
            resolve(null); // envía la alerta sin ubicación como último recurso
          },
          {
            enableHighAccuracy: false,
            timeout: 10000,
            maximumAge: 30000
          }
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 0 // forzar ubicación fresca
      }
    );
  });
}

// ─────────────────────────────────────────────
// EVENTO DE PÁNICO
// ─────────────────────────────────────────────
window.onload = () => {
  document.getElementById('btn-anon-panic').addEventListener('click', async () => {
    if (confirm('¿Estás seguro de enviar una alerta de PÁNICO?')) {
      const btn = document.getElementById('btn-anon-panic');
      btn.disabled = true;
      btn.textContent = 'Obteniendo ubicación...';
      btn.style.opacity = '0.7';

      try {
        // Espera hasta obtener ubicación antes de enviar
        const ubicacion = await obtenerUbicacion();

        btn.textContent = 'Enviando alerta...';

        const res = await window.saveAnonymousIncident({
          lat: ubicacion?.lat ?? null,
          lng: ubicacion?.lng ?? null
        });

        if (res) {
          alert(ubicacion
            ? '¡Alerta de PÁNICO enviada con ubicación!'
            : '¡Alerta enviada! No se pudo obtener ubicación GPS.'
          );
        } else {
          alert('Hubo un error al enviar la alerta o faltan permisos en el servidor.');
        }

      } catch (err) {
        console.error('[Pánico] Error inesperado:', err);
        alert('Hubo un error inesperado al enviar la alerta.');
      } finally {
        btn.disabled = false;
        btn.textContent = 'PÁNICO';
        btn.style.opacity = '1';
      }
    }
  });
};