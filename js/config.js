const SUPABASE_URL = "https://TU-PROYECTO.supabase.co";
const SUPABASE_PUBLIC_KEY = "TU_PUBLISHABLE_O_ANON_KEY";

const sb = supabase.createClient(SUPABASE_URL, SUPABASE_PUBLIC_KEY);

function emailTecnicoDesdeDni(dni) {
  return `${String(dni).replace(/\D/g, "")}@asistencia.local`;
}

function obtenerDeviceId() {
  let id = localStorage.getItem("asistencia_device_id");

  if (!id) {
    id = crypto.randomUUID() + "-" + crypto.randomUUID();
    localStorage.setItem("asistencia_device_id", id);
  }

  return id;
}

async function obtenerUbicacion() {
  if (!navigator.geolocation) {
    throw new Error("Este dispositivo no permite geolocalización.");
  }

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({
        latitud: pos.coords.latitude,
        longitud: pos.coords.longitude,
        precision: pos.coords.accuracy,
      }),
      (err) => {
        if (err.code === 1) {
          reject(new Error("Tenés que permitir el acceso a la ubicación."));
        } else {
          reject(new Error("No se pudo obtener una ubicación válida."));
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  });
}
