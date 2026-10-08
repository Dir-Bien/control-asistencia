// Recordatorios Web Push: ajustes desde la campanita del panel de asistencia.
// La clave privada VAPID y los secretos permanecen en Supabase.

let pushClavePublica = null;

const botonCampana = document.getElementById("notificacionesBtn");
const puntoCampana = document.getElementById("puntoRecordatorios");
const dialogoRecordatorios = document.getElementById("dialogoRecordatorios");
const cerrarRecordatorios = document.getElementById("cerrarRecordatoriosBtn");
const activarRecordatorios = document.getElementById("confirmarNotificacionesBtn");
const estadoRecordatorios = document.getElementById("estadoRecordatorios");
const guiaAndroid = document.getElementById("guiaAndroid");
const guiaIOS = document.getElementById("guiaIOS");

function pushEsIOS() {
    return /iPhone|iPad|iPod/i.test(navigator.userAgent);
}

function pushEstaInstalada() {
    return window.matchMedia("(display-mode: standalone)").matches ||
        navigator.standalone === true;
}

function pushEsCompatible() {
    return "serviceWorker" in navigator &&
        "PushManager" in window &&
        "Notification" in window;
}

function mostrarEstadoRecordatorios(tipo, texto) {
    const activados = tipo === "activado";
    const bloqueados = ["no-disponible", "bloqueado", "instalar-ios", "comprobando", "en-proceso"].includes(tipo);

    if (estadoRecordatorios) estadoRecordatorios.textContent = texto;
    if (botonCampana) botonCampana.classList.toggle("activada", activados);
    if (puntoCampana) puntoCampana.hidden = activados;
    if (activarRecordatorios) {
        activarRecordatorios.hidden = activados;
        activarRecordatorios.disabled = bloqueados;
        activarRecordatorios.textContent = tipo === "en-proceso"
            ? "Activando..."
            : "Activar notificaciones";
    }
}

async function obtenerClavePublicaPush() {
    if (pushClavePublica) return pushClavePublica;

    const respuesta = await fetch(
        SUPABASE_URL + "/functions/v1/push-public-key",
        { headers: { apikey: SUPABASE_PUBLIC_KEY }, cache: "no-store" }
    );

    const data = await respuesta.json();
    if (!respuesta.ok || !data?.ok || !data.publicKey) {
        throw new Error("No se pudo cargar la configuración de notificaciones.");
    }

    pushClavePublica = data.publicKey;
    return pushClavePublica;
}

function pushClaveUint8(clave) {
    const padding = "=".repeat((4 - clave.length % 4) % 4);
    const base64 = (clave + padding).replace(/-/g, "+").replace(/_/g, "/");
    return Uint8Array.from(atob(base64), c => c.charCodeAt(0));
}

async function guardarSuscripcionPush(suscripcion) {
    const datos = suscripcion.toJSON();

    if (!datos.endpoint || !datos.keys?.p256dh || !datos.keys?.auth) {
        throw new Error("El celular devolvió una suscripción incompleta.");
    }

    const { data, error } = await sb.rpc("guardar_push_suscripcion", {
        p_token: obtenerTokenSesion(),
        p_device_id: obtenerDeviceId(),
        p_endpoint: datos.endpoint,
        p_p256dh: datos.keys.p256dh,
        p_auth: datos.keys.auth
    });

    if (error || !data?.ok) {
        throw new Error(data?.error || "No se pudo registrar el dispositivo para recibir avisos.");
    }
}

async function comprobarRecordatorios() {
    if (!botonCampana) return;

    const ios = pushEsIOS();
    if (guiaIOS) guiaIOS.hidden = !ios;
    if (guiaAndroid) guiaAndroid.hidden = ios;

    if (ios && !pushEstaInstalada()) {
        mostrarEstadoRecordatorios(
            "instalar-ios",
            "Para recibir avisos en iPhone, primero agregá esta web a la pantalla de inicio y abrila desde su ícono."
        );
        return;
    }

    if (!pushEsCompatible()) {
        mostrarEstadoRecordatorios(
            "no-disponible",
            "Este navegador no admite notificaciones Web Push. Probá con Chrome en Android o con la web instalada desde Safari en iPhone."
        );
        return;
    }

    if (Notification.permission === "denied") {
        mostrarEstadoRecordatorios(
            "bloqueado",
            "Las notificaciones están bloqueadas. Habilitalas en la configuración del navegador o del teléfono."
        );
        return;
    }

    mostrarEstadoRecordatorios("comprobando", "Comprobando el estado de las notificaciones...");

    try {
        const registro = await navigator.serviceWorker.register("./sw.js");
        const existente = await registro.pushManager.getSubscription();

        if (Notification.permission === "granted" && existente) {
            // Renueva la asociación con la sesión actual, sin pedir permiso otra vez.
            await guardarSuscripcionPush(existente);
            mostrarEstadoRecordatorios(
                "activado",
                "Notificaciones activadas en este celular. Te avisaremos únicamente si registraste ingreso y todavía falta egreso."
            );
            return;
        }

        mostrarEstadoRecordatorios(
            "pendiente",
            "Todavía no activaste los recordatorios en este dispositivo."
        );
    } catch (error) {
        console.error("Error comprobando Web Push:", error);
        mostrarEstadoRecordatorios(
            "pendiente",
            "No se pudo verificar el estado de las notificaciones. Podés volver a intentar activarlas."
        );
    }
}

// Se invoca al cargar la asistencia. No abre la ventana ni pide permisos.
function prepararRecordatorioPush(estado) {
    if (!estado?.ok) return;
    void comprobarRecordatorios();
}

botonCampana?.addEventListener("click", () => {
    if (!dialogoRecordatorios) return;

    if (!dialogoRecordatorios.open) {
        dialogoRecordatorios.showModal();
    }

    void comprobarRecordatorios();
});

cerrarRecordatorios?.addEventListener("click", () => {
    dialogoRecordatorios?.close();
});

activarRecordatorios?.addEventListener("click", async () => {
    if (pushEsIOS() && !pushEstaInstalada()) {
        mostrarEstadoRecordatorios(
            "instalar-ios",
            "Primero agregá esta página a la pantalla de inicio desde Safari y abrila como aplicación."
        );
        return;
    }

    if (!pushEsCompatible()) {
        mostrarEstadoRecordatorios("no-disponible", "Tu navegador no admite Web Push.");
        return;
    }

    if (Notification.permission === "denied") {
        mostrarEstadoRecordatorios(
            "bloqueado",
            "Habilitá el permiso de notificaciones en los ajustes del teléfono."
        );
        return;
    }

    activarRecordatorios.disabled = true;

    try {
        // El pedido de permiso nace directamente del toque del usuario.
        const permiso = Notification.permission === "granted"
            ? "granted"
            : await Notification.requestPermission();

        if (permiso !== "granted") {
            mostrarEstadoRecordatorios(
                "pendiente",
                "No se concedió permiso. Podés intentarlo nuevamente cuando quieras."
            );
            return;
        }

        mostrarEstadoRecordatorios("en-proceso", "Registrando este celular para recibir recordatorios...");

        const clavePublica = await obtenerClavePublicaPush();
        await navigator.serviceWorker.register("./sw.js");
        const registro = await navigator.serviceWorker.ready;

        let suscripcion = await registro.pushManager.getSubscription();
        if (!suscripcion) {
            suscripcion = await registro.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: pushClaveUint8(clavePublica)
            });
        }

        await guardarSuscripcionPush(suscripcion);
        mostrarEstadoRecordatorios(
            "activado",
            "¡Listo! Los recordatorios están activados. Solo recibirás el aviso cuando exista un ingreso sin egreso."
        );
    } catch (error) {
        console.error("No se pudo activar Web Push:", error);
        mostrarEstadoRecordatorios(
            "pendiente",
            error.message || "No se pudieron activar las notificaciones."
        );
    } finally {
        if (activarRecordatorios && !activarRecordatorios.hidden &&
            Notification.permission !== "denied") {
            activarRecordatorios.disabled = false;
        }
    }
});
