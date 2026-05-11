const app = document.getElementById("app");
const overlay = document.getElementById("fake-off-overlay");
const statusMsg = document.getElementById("status-msg"); // Asegúrate de tener este ID en un <span> o <p>

function vibrar(ms) {
  if (navigator.vibrate) navigator.vibrate(ms);
}

function obtenerUbicacion() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) resolve(null);
    
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
          () => resolve(null),
          { enableHighAccuracy: false, timeout: 8000 }
        );
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });
}

// ... mantener updateOnlineStatus y syncPendingIncidents igual ...

window.onload = async () => {
  if (window.db) await window.db.init();
  
  const btnPanic = document.getElementById("btn-anon-panic");
  let trackingIntervalId = null;
  let watchPositionId = null;

  if (btnPanic) {
    btnPanic.addEventListener("click", async () => {
      vibrar([100, 50, 100]); // Vibración de advertencia
      
      if (confirm("¿ACTIVAR PROTOCOLO DE EMERGENCIA?")) {
        vibrar(500); // Confirmación física
        btnPanic.disabled = true;
        btnPanic.textContent = "S.O.S";
        if(statusMsg) statusMsg.textContent = "CONECTANDO CON ATENEA...";

        try {
          const ubicacion = await obtenerUbicacion();
          const incidentData = { lat: ubicacion?.lat ?? null, lng: ubicacion?.lng ?? null };

          if (!navigator.onLine) {
            if (window.db) {
              await window.db.savePendingIncident(incidentData);
              alert("MODO OFFLINE ACTIVADO: Alerta guardada localmente.");
            }
          } else {
            const res = await window.saveAnonymousIncident(incidentData);

            if (res && res.length > 0) {
              const incidentId = res[0].id;

              // --- ENTRAR EN MODO SIGILO ---
              if (overlay) {
                overlay.style.display = "block";
                document.documentElement.requestFullscreen().catch(() => {});
              }

              let currentLat = ubicacion?.lat || null;
              let currentLng = ubicacion?.lng || null;

              watchPositionId = navigator.geolocation.watchPosition(
                (pos) => {
                  currentLat = pos.coords.latitude;
                  currentLng = pos.coords.longitude;
                },
                null,
                { enableHighAccuracy: true }
              );

              trackingIntervalId = setInterval(async () => {
                if (currentLat && currentLng) {
                  await window.updateAnonymousIncidentLocation(incidentId, currentLat, currentLng);
                }
              }, 1500); // 1.5s para balancear batería y precisión

              window.escucharLiberacion(incidentId, () => {
                if (trackingIntervalId) clearInterval(trackingIntervalId);
                if (watchPositionId) navigator.geolocation.clearWatch(watchPositionId);
                
                overlay.style.display = "none";
                vibrar([200, 100, 200]);
                alert("SISTEMA LIBERADO POR CONTROL CENTRAL.");
                location.reload(); 
              });

            }
          }
        } catch (err) {
          btnPanic.disabled = false;
          btnPanic.textContent = "PÁNICO";
        }
      }
    });
  }
};