const nombreEl = document.getElementById("nombre");
const gradoEl = document.getElementById("grado");
const turnoActualEl = document.getElementById("turnoActual");
const entradaEl = document.getElementById("entrada");
const salidaEl = document.getElementById("salida");
const bloqueTurno = document.getElementById("bloqueTurno");
const selectorTurno = document.getElementById("selectorTurno");
const accionBtn = document.getElementById("accionBtn");
const logoutBtn = document.getElementById("logoutBtn");
const estadoMsg = document.getElementById("estadoMsg");

let estadoActual = null;
let recordatorioTimer = null;
let ultimaNotificacion = "";

function mostrarEstado(texto, error = false) {
  estadoMsg.textContent = texto;
  estadoMsg.className = error ? "mensaje error" : "mensaje ok";
}

function horaArgentina(fechaIso) {
  if (!fechaIso) return "-";

  return new Intl.DateTimeFormat("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(new Date(fechaIso));
}

async function verificarSesion() {
  const { data } = await sb.auth.getSession();

  if (!data.session) {
    location.href = "index.html";
    return false;
  }

  return true;
}

async function cargarEstado() {
  if (!(await verificarSesion())) return;

  const { data, error } = await sb.rpc("mi_estado");

  if (error) {
    mostrarEstado(error.message, true);
    return;
  }

  estadoActual = data;

  nombreEl.textContent = `${data.apellido} ${data.nombre}`;
  gradoEl.textContent = data.grado || "-";

  if (!data.entrada) {
    bloqueTurno.hidden = false;
    turnoActualEl.textContent = "Elegir al registrar";
    entradaEl.textContent = "-";
    salidaEl.textContent = "-";
    accionBtn.textContent = "Registrar entrada";
    accionBtn.disabled = false;
  } else {
    bloqueTurno.hidden = true;
    turnoActualEl.textContent = data.turno === "MANANA" ? "Mañana" : "Tarde";
    entradaEl.textContent = horaArgentina(data.entrada);
    salidaEl.textContent = horaArgentina(data.salida);

    if (!data.salida) {
      accionBtn.textContent = "Registrar salida";
      accionBtn.disabled = false;
    } else {
      accionBtn.textContent = "Jornada registrada";
      accionBtn.disabled = true;
    }
  }

  programarRecordatorio();
}

async function registrarEntrada() {
  const turno = selectorTurno.value;

  if (!turno) {
    mostrarEstado("Seleccioná el turno de hoy.", true);
    return;
  }

  accionBtn.disabled = true;
  mostrarEstado("Obteniendo ubicación...");

  try {
    const geo = await obtenerUbicacion();

    const { error } = await sb.rpc("registrar_entrada", {
      p_turno: turno,
      p_latitud: geo.latitud,
      p_longitud: geo.longitud,
      p_precision: geo.precision,
      p_device_id: obtenerDeviceId(),
    });

    if (error) throw error;

    mostrarEstado("Entrada registrada correctamente.");
    await cargarEstado();
  } catch (e) {
    mostrarEstado(e.message || "No se pudo registrar la entrada.", true);
    accionBtn.disabled = false;
  }
}

async function registrarSalida() {
  accionBtn.disabled = true;
  mostrarEstado("Obteniendo ubicación...");

  try {
    const geo = await obtenerUbicacion();

    const { error } = await sb.rpc("registrar_salida", {
      p_latitud: geo.latitud,
      p_longitud: geo.longitud,
      p_precision: geo.precision,
      p_device_id: obtenerDeviceId(),
    });

    if (error) throw error;

    mostrarEstado("Salida registrada correctamente.");
    await cargarEstado();
  } catch (e) {
    mostrarEstado(e.message || "No se pudo registrar la salida.", true);
    accionBtn.disabled = false;
  }
}

accionBtn.addEventListener("click", async () => {
  if (!estadoActual?.entrada) {
    await registrarEntrada();
  } else if (!estadoActual?.salida) {
    await registrarSalida();
  }
});

logoutBtn.addEventListener("click", async () => {
  await sb.auth.signOut();
  location.href = "index.html";
});

async function pedirPermisoNotificaciones() {
  if (!("Notification" in window)) return;

  if (Notification.permission === "default") {
    await Notification.requestPermission();
  }
}

function horaMinutoArgentina() {
  const parts = new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "America/Argentina/Buenos_Aires",
  }).formatToParts(new Date());

  return {
    hora: Number(parts.find(p => p.type === "hour")?.value ?? 0),
    minuto: Number(parts.find(p => p.type === "minute")?.value ?? 0),
  };
}

function programarRecordatorio() {
  if (recordatorioTimer) clearInterval(recordatorioTimer);

  if (!estadoActual?.entrada || estadoActual?.salida || !estadoActual?.turno) return;

  recordatorioTimer = setInterval(() => {
    const { hora, minuto } = horaMinutoArgentina();
    const objetivo = estadoActual.turno === "MANANA" ? 13 : 18;
    const clave = `${estadoActual.fecha}-${objetivo}`;

    if (hora === objetivo && minuto <= 10 && ultimaNotificacion !== clave) {
      ultimaNotificacion = clave;

      if ("Notification" in window && Notification.permission === "granted") {
        new Notification("Registrar salida", {
          body: "Recordá registrar tu salida antes de retirarte.",
        });
      }

      mostrarEstado("Recordatorio: ya podés registrar tu salida.");
    }
  }, 60000);
}

pedirPermisoNotificaciones();
cargarEstado();
