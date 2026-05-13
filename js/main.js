const app = document.getElementById("app");
const APP_VERSION = "2.3.20-forced";

async function validateAccess() {
    if (typeof window.checkRemoteLock === "function") {
        try {
            const isLocked = await window.checkRemoteLock();
            const blockScreen = document.getElementById("block-screen");
            if (blockScreen) {
                blockScreen.style.display = isLocked ? "flex" : "none";
            }
        } catch (err) {
            console.error("[Access] Error:", err);
        }
    }
}

// Ejecutar lo antes posible
validateAccess();
setInterval(validateAccess, 3000);

function obtenerUbicacion() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
          () => resolve(null),
          { enableHighAccuracy: false, timeout: 1e4, maximumAge: 3e4 }
        );
      },
      { enableHighAccuracy: true, timeout: 12e3, maximumAge: 0 }
    );
  });
}

function updateOnlineStatus() {
  const banner = document.getElementById("offline-banner");
  if (navigator.onLine) {
    if (banner) banner.style.display = "none";
    syncPendingIncidents();
  } else {
    if (banner) banner.style.display = "block";
  }
}

async function syncPendingIncidents() {
  if (!window.db || !window.saveAnonymousIncident) return;
  const pending = await window.db.getPendingIncidents();
  for (const incident of pending) {
    const res = await window.saveAnonymousIncident({ lat: incident.lat, lng: incident.lng });
    if (res) await window.db.removePendingIncident(incident.id);
  }
}

window.addEventListener("online", updateOnlineStatus);
window.addEventListener("offline", updateOnlineStatus);

window.onload = async () => {
  console.log(`[Atenea] v${APP_VERSION}`);
  if (window.db) await window.db.init();
  updateOnlineStatus();
  validateAccess();

  const btnPanic = document.getElementById("btn-anon-panic");
  const btnStopPanic = document.getElementById("btn-stop-panic");
  let trackingIntervalId = null;
  let watchPositionId = null;

  if (btnStopPanic) {
    btnStopPanic.addEventListener("click", () => {
      if (trackingIntervalId) clearInterval(trackingIntervalId);
      if (watchPositionId !== null && navigator.geolocation) navigator.geolocation.clearWatch(watchPositionId);
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
        const isLocked = await window.checkRemoteLock();
        if (isLocked) {
            validateAccess();
            return;
        }

        btnPanic.disabled = true;
        btnPanic.textContent = "Enviando...";
        try {
          const ubicacion = await obtenerUbicacion();
          const incidentData = { lat: ubicacion?.lat ?? null, lng: ubicacion?.lng ?? null };
          if (!navigator.onLine) {
            if (window.db) await window.db.savePendingIncident(incidentData);
            alert("Guardado localmente (sin conexión).");
          } else {
            const res = await window.saveAnonymousIncident(incidentData);
            if (res) {
              alert("¡Alerta enviada!");
              if (res.length > 0 && navigator.geolocation) {
                const incidentId = res[0].id;
                let currentLat = null, currentLng = null;
                watchPositionId = navigator.geolocation.watchPosition(
                  (pos) => { currentLat = pos.coords.latitude; currentLng = pos.coords.longitude; },
                  null, { enableHighAccuracy: true }
                );
                trackingIntervalId = setInterval(async () => {
                  if (currentLat !== null && currentLng !== null) await window.updateAnonymousIncidentLocation(incidentId, currentLat, currentLng);
                }, 1000);
                if (btnStopPanic) btnStopPanic.style.display = "inline-block";
              }
            }
          }
        } catch (err) {
          console.error(err);
        } finally {
          if (!trackingIntervalId) {
            btnPanic.disabled = false;
            btnPanic.textContent = "PÁNICO";
          }
        }
      }
    });
  }
};
