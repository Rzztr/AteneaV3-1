const app = document.getElementById("app");
function obtenerUbicacion() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      console.warn("[Geolocalización] No soportada en este dispositivo");
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        console.log(
          "[Geolocalización] ✓ GPS obtenido:",
          pos.coords.latitude,
          pos.coords.longitude,
        );
        resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      () => {
        console.warn("[Geolocalización] GPS falló, intentando con red/WiFi...");
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            console.log(
              "[Geolocalización] ✓ Ubicación por red obtenida:",
              pos.coords.latitude,
              pos.coords.longitude,
            );
            resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          },
          (e) => {
            if (e.code === 1) {
              console.warn("[Geolocalización] Permiso denegado por el usuario");
            } else {
              console.warn(
                "[Geolocalización] No se pudo obtener ubicación tras dos intentos:",
                e.message,
              );
            }
            resolve(null);
          },
          { enableHighAccuracy: false, timeout: 1e4, maximumAge: 3e4 },
        );
      },
      { enableHighAccuracy: true, timeout: 12e3, maximumAge: 0 },
    );
  });
}
function updateOnlineStatus() {
  const banner = document.getElementById("offline-banner");
  if (navigator.onLine) {
    if (banner) banner.style.display = "none";
    console.log("[Network] Conexión recuperada. Sincronizando pendientes...");
    syncPendingIncidents();
  } else {
    if (banner) banner.style.display = "block";
    console.log("[Network] Sin conexión. Trabajando offline.");
  }
}
async function syncPendingIncidents() {
  if (!window.db || !window.saveAnonymousIncident) return;
  const pending = await window.db.getPendingIncidents();
  for (const incident of pending) {
    console.log("[Sync] Enviando incidente pendiente...", incident);
    const res = await window.saveAnonymousIncident({
      lat: incident.lat,
      lng: incident.lng,
    });
    if (res) {
      await window.db.removePendingIncident(incident.id);
      console.log(
        "[Sync] Incidente sincronizado y eliminado localmente",
        incident.id,
      );
    } else {
      console.error("[Sync] Error al sincronizar incidente", incident.id);
    }
  }
}
window.addEventListener("online", updateOnlineStatus);
window.addEventListener("offline", updateOnlineStatus);
window.onload = async () => {
  if (window.db) await window.db.init();
  updateOnlineStatus();
  const btnPanic = document.getElementById("btn-anon-panic");
  const btnStopPanic = document.getElementById("btn-stop-panic");
  let trackingIntervalId = null;
  let watchPositionId = null;

  if (btnStopPanic) {
    btnStopPanic.addEventListener("click", () => {
      if (trackingIntervalId) {
        clearInterval(trackingIntervalId);
        trackingIntervalId = null;
      }
      if (watchPositionId !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchPositionId);
        watchPositionId = null;
      }
      
      btnStopPanic.style.display = "none";
      if (btnPanic) {
        btnPanic.disabled = false;
        btnPanic.textContent = "PÁNICO";
        btnPanic.style.opacity = "1";
      }
    });
  }

  if (btnPanic) {
    btnPanic.addEventListener("click", async () => {
      if (confirm("¿Estás seguro de enviar una alerta de PÁNICO?")) {
        btnPanic.disabled = true;
        btnPanic.textContent = "Obteniendo ubicación...";
        btnPanic.style.opacity = "0.7";
        try {
          const ubicacion = await obtenerUbicacion();
          const incidentData = {
            lat: ubicacion?.lat ?? null,
            lng: ubicacion?.lng ?? null,
          };
          if (!navigator.onLine) {
            if (window.db) {
              await window.db.savePendingIncident(incidentData);
              alert(
                "Sin conexión. Alerta guardada localmente. Se enviará de forma automática al reconectar.",
              );
            } else {
              alert(
                "Sin conexión y no se pudo acceder al almacenamiento local.",
              );
            }
          } else {
            btnPanic.textContent = "Enviando alerta...";
            const res = await window.saveAnonymousIncident(incidentData);
            if (res) {
              alert(
                ubicacion
                  ? "¡Alerta de PÁNICO enviada con ubicación!"
                  : "¡Alerta enviada! No se pudo obtener ubicación GPS.",
              );
              if (res && res.length > 0 && navigator.geolocation) {
                const incidentId = res[0].id;
                let currentLat = null;
                let currentLng = null;

                watchPositionId = navigator.geolocation.watchPosition(
                  (pos) => {
                    currentLat = pos.coords.latitude;
                    currentLng = pos.coords.longitude;
                  },
                  (err) => console.warn("[Geolocalización] Error actualizando:", err),
                  { enableHighAccuracy: true, maximumAge: 0 }
                );

                trackingIntervalId = setInterval(async () => {
                  if (currentLat !== null && currentLng !== null) {
                    await window.updateAnonymousIncidentLocation(
                      incidentId,
                      currentLat,
                      currentLng
                    );
                  }
                }, 500);

                btnPanic.textContent = "Enviando en tiempo real...";
                if (btnStopPanic) {
                  btnStopPanic.style.display = "inline-block";
                }
              }
            } else {
              if (window.db) {
                await window.db.savePendingIncident(incidentData);
                alert(
                  "Hubo un error con el servidor. Alerta guardada localmente para reintento.",
                );
              } else {
                alert(
                  "Hubo un error al enviar la alerta o faltan permisos en el servidor.",
                );
              }
            }
          }
        } catch (err) {
          console.error("[Pánico] Error inesperado:", err);
          alert("Hubo un error inesperado al procesar la alerta.");
        } finally {
          if (!trackingIntervalId) {
            btnPanic.disabled = false;
            btnPanic.textContent = "PÁNICO";
            btnPanic.style.opacity = "1";
          }
        }
      }
    });
  }
};
