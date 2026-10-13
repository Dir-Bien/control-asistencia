(function () {
"use strict";

const nav = Array.from(document.querySelectorAll(".admin-nav-btn"));
const track = document.getElementById("adminCarril");
const views = Array.from(document.querySelectorAll(".admin-vista"));
const manualTab = document.getElementById("manualTabBtn");
const input = document.getElementById("manualBusqueda");
const buscar = document.getElementById("manualBuscarBtn");
const mensaje = document.getElementById("manualMensaje");
const resultados = document.getElementById("manualResultados");
const historial = document.getElementById("manualHistorial");
const actualizar = document.getElementById("manualActualizarBtn");

let manualDisponible = false;
let manualOcupado = false;

const html = (v) => String(v ?? "").replace(/[&<>"']/g,
    (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

function formatoFecha(fecha) {
    if (!fecha) return "-";
    const d = new Date(fecha);
    return Number.isFinite(d.getTime())
        ? new Intl.DateTimeFormat("es-AR", {
            timeZone:"America/Argentina/Buenos_Aires",
            day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"
          }).format(d)
        : "-";
}

function aviso(texto, error = false) {
    mensaje.textContent = texto;
    mensaje.className = error ? "mensaje error" : "mensaje ok";
}

function vista(index) {
    if (index === 2 && !manualDisponible) return;
    nav.forEach((b, i) => {
        b.classList.toggle("seleccionado", i === index);
        b.setAttribute("aria-current", i === index ? "page" : "false");
    });
    views.forEach((v, i) => {
        v.setAttribute("aria-hidden", i === index ? "false" : "true");
        v.inert = i !== index;
    });
    track.style.setProperty("--vista-activa", String(index));
    if (index === 1 && typeof cargarEmpleados === "function") void cargarEmpleados();
    if (index === 2) void mostrarHistorial();
}

nav.forEach(btn => btn.addEventListener("click", () => vista(Number(btn.dataset.vista))));

function bloquearManual(texto) {
    manualDisponible = false;
    manualTab.disabled = true;
    manualTab.title = texto;
    aviso(texto, true);
}

async function rpc(accion, extra = {}) {
    if (!adminActual || adminActual.usuario !== "tjustet") {
        throw new Error("Esta función está reservada al administrador autorizado.");
    }
    const {data, error} = await sb.rpc("admin_operar_manual", {
        p_token: obtenerAdminToken(),
        p_device_id: obtenerDeviceId(),
        p_accion: accion,
        p_empleado_id: extra.empleadoId ?? null,
        p_asistencia_id: extra.asistenciaId ?? null,
        p_busqueda: extra.busqueda ?? null
    });
    if (error) {
        console.error("Error de función manual", error);
        throw new Error("La función de ingresos manuales todavía no está disponible en Supabase.");
    }
    if (!data?.ok) throw new Error(data?.error || "Operación manual rechazada.");
    return data;
}

// Solo activa el panel cuando la base confirma el permiso de la sesión.
window.adminManualActualizarPermisos = async function () {
    if (!adminActual || adminActual.usuario !== "tjustet") {
        bloquearManual("Ingresos manuales: acceso exclusivo para tjustet.");
        return;
    }
    manualTab.title = "Verificando permiso para registrar ingresos...";
    try {
        const data = await rpc("listar");
        manualDisponible = true;
        manualTab.disabled = false;
        manualTab.title = "Administrar ingresos manuales";
        pintarHistorial(data.datos || []);
        aviso("Acceso autorizado. Las entradas se registran con la hora del servidor.");
    } catch (e) {
        bloquearManual(e.message);
    }
};

function pintarHistorial(filas) {
    if (!filas.length) {
        historial.innerHTML = '<p class="mensaje">No hay ingresos manuales recientes.</p>';
        return;
    }
    historial.innerHTML = '<table><thead><tr><th>Empleado</th><th>DNI</th><th>Entrada</th><th>Cargado por</th><th>Acción</th></tr></thead><tbody>' +
      filas.map(f => '<tr><td>' + html(f.empleado) + '</td><td>' + html(f.dni) +
        '</td><td>' + html(formatoFecha(f.entrada)) + '</td><td>' + html(f.admin || "-") +
        '</td><td>' + (f.salida
           ? '<span>Egreso realizado</span>'
           : '<button type="button" class="btn-secundario" data-anular="' + Number(f.id) + '">Anular</button>') +
        '</td></tr>').join("") + '</tbody></table>';
}

async function mostrarHistorial() {
    if (!manualDisponible) return;
    try {
        const data = await rpc("listar");
        pintarHistorial(data.datos || []);
    } catch (e) { aviso(e.message, true); }
}

async function buscarPersonas() {
    if (manualOcupado || !manualDisponible) return;
    const busqueda = input.value.trim();
    if (busqueda.length < 2) {
        aviso("Escribí al menos dos caracteres para buscar.", true);
        return;
    }
    buscar.disabled = true;
    try {
        const data = await rpc("buscar", {busqueda});
        const personas = data.datos || [];
        resultados.innerHTML = personas.length
            ? personas.map(p => '<div class="manual-persona"><div><strong>' +
              html(p.apellido) + ', ' + html(p.nombre) +
              '</strong><small>' + html(p.grado || "-") + ' · DNI ' + html(p.dni) +
              '</small>' + (p.entrada ? '<small class="estado-manual">Ya ingresó: ' +
              html(formatoFecha(p.entrada)) + ' (' + html(p.origen || "CELULAR") + ')</small>' : '') +
              '</div><button type="button" data-crear="' + Number(p.id) + '"' +
              (p.entrada ? ' disabled' : '') +
              '>' + (p.entrada ? 'Ya registrado' : 'Registrar ahora') +
              '</button></div>').join("")
            : '<p>No se encontraron empleados activos con esa búsqueda.</p>';
        aviso(personas.length + " coincidencia(s).");
    } catch (e) { aviso(e.message, true); }
    finally { buscar.disabled = false; }
}

buscar?.addEventListener("click", buscarPersonas);
input?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); void buscarPersonas(); }
});
actualizar?.addEventListener("click", mostrarHistorial);

resultados?.addEventListener("click", async e => {
    const btn = e.target.closest("button[data-crear]");
    if (!btn || !manualDisponible || manualOcupado) return;
    const id = Number(btn.dataset.crear);
    if (!Number.isSafeInteger(id) || id < 1) return;
    const contenedor = btn.closest(".manual-persona");
    const nombre = contenedor?.querySelector("strong")?.textContent || "el empleado";
    if (!confirm("¿Registrar el ingreso de " + nombre + " con la hora actual del servidor?")) return;
    manualOcupado = true; btn.disabled = true;
    try {
        const data = await rpc("crear", {empleadoId:id});
        aviso("Ingreso manual guardado: " + formatoFecha(data.entrada) + ". Auditoría registrada.");
        await Promise.all([buscarPersonas(), mostrarHistorial()]);
        if (typeof cargarReporte === "function") void cargarReporte();
    } catch (err) { aviso(err.message, true); }
    finally { manualOcupado = false; btn.disabled = false; }
});

historial?.addEventListener("click", async e => {
    const btn = e.target.closest("button[data-anular]");
    if (!btn || !manualDisponible || manualOcupado) return;
    const id = Number(btn.dataset.anular);
    if (!Number.isSafeInteger(id) || id < 1) return;
    if (!confirm("¿Anular este ingreso MANUAL? No se puede deshacer, pero la auditoría queda guardada.")) return;
    manualOcupado = true; btn.disabled = true;
    try {
        await rpc("anular", {asistenciaId:id});
        aviso("Ingreso manual anulado. La auditoría se conservó.");
        await mostrarHistorial();
        if (input.value.trim().length >= 2) await buscarPersonas();
        if (typeof cargarReporte === "function") void cargarReporte();
    } catch (err) { aviso(err.message, true); }
    finally { manualOcupado = false; btn.disabled = false; }
});

bloquearManual("Verificando permisos del servidor...");
vista(0);
})();