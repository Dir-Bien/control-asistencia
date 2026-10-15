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
let personasManual = [];
let ingresosHoy = new Map();
let manualesHoy = new Map();

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
    if (index === 2) void cargarTablaCompleta();
    if (index === 3 && typeof window.adminHistorialCargar === "function") void window.adminHistorialCargar();
}

nav.forEach(btn => btn.addEventListener("click", () => vista(Number(btn.dataset.vista))));

function bloquearManual(texto) {
    manualDisponible = false;
    manualTab.disabled = true;
    manualTab.title = texto;
    aviso(texto, true);
}

async function rpc(accion, extra = {}) {
    if (!adminActual || !["tjustet","calisaya","zanela","cabello"].includes(adminActual.usuario)) {
        throw new Error("No tenés permisos para cargas manuales.");
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
    if (!adminActual || !["tjustet","calisaya","zanela","cabello"].includes(adminActual.usuario)) {
        bloquearManual("Tu usuario no tiene habilitada la carga manual.");
        return;
    }
    manualTab.title = "Verificando permiso para registrar ingresos...";
    try {
        const data = await rpc("listar");
        manualDisponible = true;
        manualTab.disabled = false;
        manualTab.title = "Administrar ingresos manuales";
        pintarHistorial(data.datos || []);
        void cargarTablaCompleta();
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


function pintarTablaCompleta() {
    const q = input.value.trim().toLocaleLowerCase("es-AR");
    const filtro = document.getElementById("manualEstadoFiltro")?.value || "todos";
    const filas = personasManual.filter(p => {
        const ultimo = ingresosHoy.get(String(p.dni));
        const manual = manualesHoy.get(String(p.dni));
        const entrada = ultimo?.entrada || manual?.entrada;
        const origen = manual ? "MANUAL" : (entrada ? "CELULAR" : null);
        if (q && ![p.dni,p.apellido,p.nombre,p.departamento].some(v => String(v||"").toLocaleLowerCase("es-AR").includes(q))) return false;
        if (filtro === "sin-ingreso" && (entrada || !p.activo)) return false;
        if (filtro === "registrado" && !entrada) return false;
        if (filtro === "manual" && origen !== "MANUAL") return false;
        return true;
    });
    resultados.innerHTML = filas.map(p => {
        const ultimo = ingresosHoy.get(String(p.dni));
        const manual = manualesHoy.get(String(p.dni));
        const entrada = ultimo?.entrada || manual?.entrada;
        const estado = !p.activo ? "INACTIVO" : !entrada ? "SIN INGRESO" :
            manual ? (manual.salida ? "COMPLETO · MANUAL" : "INGRESO MANUAL") :
            ultimo?.estado || "REGISTRADO";
        const clase = !p.activo || !entrada ? "faltante" : "registrado";
        return '<tr><td>'+html(p.grado||"-")+'</td><td><strong>'+html(p.apellido)+', '+html(p.nombre)+
          '</strong></td><td>'+html(p.dni)+'</td><td>'+html(p.departamento||"-")+
          '</td><td><span class="manual-pill '+clase+'">'+html(estado)+'</span></td><td>'+
          html(formatoFecha(entrada))+'</td><td>'+
          (p.activo && !entrada ? '<button type="button" data-crear="'+Number(p.id)+'">Registrar ahora</button>' :
           manual && !manual.salida ? '<button class="btn-secundario" type="button" data-anular="'+Number(manual.id)+'">Anular manual</button>' :
           '<span class="manual-sin-accion">'+(!p.activo?"Inactivo":"Ya registrado")+'</span>')+'</td></tr>';
    }).join("");
    if (!filas.length) resultados.innerHTML = '<tr><td colspan="7">No se encontraron empleados con esos filtros.</td></tr>';
    const total=personasManual.filter(p=>p.activo).length;
    const registrados=personasManual.filter(p=>p.activo && (ingresosHoy.get(String(p.dni))?.entrada || manualesHoy.has(String(p.dni)))).length;
    const suma=document.getElementById("manualResumen");
    if(suma) suma.textContent="Personal activo: "+total+" · Con ingreso hoy: "+registrados+
       " · Sin ingreso: "+(total-registrados)+" · Mostrando: "+filas.length;
}

async function cargarTablaCompleta() {
    if (!manualDisponible) return;
    buscar.disabled = true;
    aviso("Actualizando la tabla de personal...");
    try {
        const hoy = fechaArgentina();
        const base={p_token:obtenerAdminToken(),p_device_id:obtenerDeviceId()};
        const [empleados, reporte, manuales] = await Promise.all([
            sb.rpc("admin_listar_empleados",{...base,p_busqueda:null}),
            sb.rpc("admin_reporte_asistencias",{...base,p_desde:hoy,p_hasta:hoy,p_departamento_id:null,p_grado:null}),
            rpc("listar")
        ]);
        if(empleados.error || !empleados.data?.ok) throw new Error(empleados.data?.error||"No se pudo cargar el personal");
        if(reporte.error || !reporte.data?.ok) throw new Error(reporte.data?.error||"No se pudo cargar el estado de hoy");
        personasManual=empleados.data.datos||[];
        ingresosHoy=new Map((reporte.data.datos||[]).map(row=>[String(row.dni),row]));
        manualesHoy=new Map((manuales.datos||[]).filter(x=>
            String(x.entrada||"").slice(0,10)===hoy ||
            new Date(x.entrada).toLocaleDateString("en-CA",{timeZone:"America/Argentina/Buenos_Aires"})===hoy
        ).map(x=>[String(x.dni),x]));
        pintarHistorial(manuales.datos||[]);
        pintarTablaCompleta();
        aviso("Tabla actualizada. Podés buscar y filtrar sin volver a cargar los datos.");
    } catch(e) { aviso(e.message,true); }
    finally { buscar.disabled=false; }
}
function buscarPersonas() { pintarTablaCompleta(); }
buscar?.addEventListener("click", cargarTablaCompleta);
input?.addEventListener("input", pintarTablaCompleta);
document.getElementById("manualEstadoFiltro")?.addEventListener("change", pintarTablaCompleta);
actualizar?.addEventListener("click", mostrarHistorial);

resultados?.addEventListener("click", async e => {
    const crear = e.target.closest("button[data-crear]");
    const anular = e.target.closest("button[data-anular]");
    if ((!crear && !anular) || !manualDisponible || manualOcupado) return;
    const boton = crear || anular;
    const id = Number(crear ? crear.dataset.crear : anular.dataset.anular);
    if (!Number.isSafeInteger(id) || id<1) return;
    const nombre = boton.closest("tr")?.querySelector("strong")?.textContent || "esta persona";
    const pregunta = crear ? "¿Registrar ahora a "+nombre+" con la hora del servidor?" :
      "¿Anular la llegada MANUAL de "+nombre+"? El historial se conservará.";
    if (!confirm(pregunta)) return;
    manualOcupado=true; boton.disabled=true;
    try {
        const data = await rpc(crear?"crear":"anular", crear?{empleadoId:id}:{asistenciaId:id});
        aviso(crear?"Ingreso registrado: "+formatoFecha(data.entrada):"Ingreso manual anulado y auditado.");
        await cargarTablaCompleta();
        if(typeof cargarReporte==="function")void cargarReporte();
    } catch(err) { aviso(err.message,true); }
    finally { manualOcupado=false; boton.disabled=false; }
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

// admin.js confirma la sesión de manera asíncrona. Esperar ese dato,
// sin suponer que el nombre visible equivale a un permiso de escritura.
const esperaSesion = setInterval(() => {
    if (typeof adminActual === "undefined" || !adminActual?.usuario) return;
    clearInterval(esperaSesion);
    void window.adminManualActualizarPermisos();
}, 250);
setTimeout(() => clearInterval(esperaSesion), 15000);
})();