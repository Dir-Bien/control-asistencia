// Se reemplaza por la clave VAPID pública al desplegar el servicio en Supabase.
// Nunca publicar la clave VAPID privada.
const PUSH_VAPID_PUBLIC_KEY = "PENDIENTE_CONFIGURAR_VAPID_PUBLICA";

const botonRecordatorios = document.getElementById("notificacionesBtn");
const instructivoPush = document.getElementById("instructivoPush");
const pasosPush = document.getElementById("pasosPush");

function actualizarInstructivoPush() {
    if (!instructivoPush || !pasosPush) return;
    const ios = pushEsIOS();
    pasosPush.textContent = ios
        ? "iPhone: 1) Abrí este sitio en Safari. 2) Tocá Compartir → Agregar a pantalla de inicio. 3) Abrí el ícono instalado. 4) Tocá Activar recordatorios y aceptá el permiso."
        : "Android: 1) Tocá Activar recordatorios. 2) Aceptá el permiso de notificaciones. 3) Mantené habilitadas las notificaciones de Chrome o del navegador."; 
}


function pushEsIOS() {
    return /iPhone|iPad|iPod/i.test(navigator.userAgent);
}

function pushEsStandalone() {
    return matchMedia("(display-mode: standalone)").matches ||
        navigator.standalone === true;
}

function pushCompatible() {
    return "serviceWorker" in navigator &&
        "PushManager" in window &&
        "Notification" in window;
}

function pushClaveConfigurada() {
    return PUSH_VAPID_PUBLIC_KEY !== "PENDIENTE_CONFIGURAR_VAPID_PUBLICA";
}

function pushClaveUint8(clave) {
    const padding = "=".repeat((4 - clave.length % 4) % 4);
    const b64 = (clave + padding).replace(/-/g, "+").replace(/_/g, "/");
    return Uint8Array.from(atob(b64), c => c.charCodeAt(0));
}

async function pushGuardarSuscripcion(suscripcion) {
    const sus = suscripcion.toJSON();
    if (!sus.endpoint || !sus.keys?.p256dh || !sus.keys?.auth) {
        throw new Error("El dispositivo devolvió una suscripción incompleta.");
    }

    const { data, error } = await sb.rpc("guardar_push_suscripcion", {
        p_token: obtenerTokenSesion(),
        p_device_id: obtenerDeviceId(),
        p_endpoint: sus.endpoint,
        p_p256dh: sus.keys.p256dh,
        p_auth: sus.keys.auth
    });

    if (error || !data?.ok) {
        throw new Error(data?.error || "No se pudo guardar la suscripción Push.");
    }
}

async function prepararRecordatorioPush(estado) {
    if (!botonRecordatorios) return;
    botonRecordatorios.hidden = true;
    if (instructivoPush) instructivoPush.hidden = true;
    if (!estado?.entrada || estado?.salida) return;
    actualizarInstructivoPush();
    if (instructivoPush) instructivoPush.hidden = false;

    if (pushEsIOS() && !pushEsStandalone()) {
        botonRecordatorios.textContent = "Activar recordatorios en iPhone";
        botonRecordatorios.hidden = false;
        return;
    }

    if (!pushCompatible()) return;

    botonRecordatorios.textContent = "Activar recordatorios";
    if (!pushClaveConfigurada()) {
        console.warn("Recordatorios Push pendientes de configuración en Supabase.");
        return;
    }

    try {
        const registro = await navigator.serviceWorker.register("./sw.js");
        const existente = await registro.pushManager.getSubscription();

        if (Notification.permission === "granted" && existente) {
            await pushGuardarSuscripcion(existente);
            botonRecordatorios.hidden = true;
            if (instructivoPush) instructivoPush.hidden = true;
        } else {
            botonRecordatorios.hidden = false;
        }
    } catch (error) {
        console.error("Error verificando recordatorios Push:", error);
        botonRecordatorios.hidden = false;
    }
}

botonRecordatorios?.addEventListener("click", async () => {
    if (pushEsIOS() && !pushEsStandalone()) {
        alert("En iPhone: abrí Safari, tocá Compartir → Agregar a pantalla de inicio y abrí la aplicación desde el ícono. Después activá los recordatorios.");
        return;
    }

    if (!pushCompatible()) {
        alert("Este navegador no permite notificaciones Push.");
        return;
    }

    if (!pushClaveConfigurada()) {
        alert("Los recordatorios todavía no están habilitados en el servidor.");
        return;
    }

    botonRecordatorios.disabled = true;
    try {
        if (Notification.permission === "denied") {
            throw new Error("Habilitá las notificaciones desde los permisos del navegador.");
        }

        const permiso = await Notification.requestPermission();
        if (permiso !== "granted") return;

        const registro = await navigator.serviceWorker.register("./sw.js");
        const listo = await navigator.serviceWorker.ready;
        let suscripcion = await listo.pushManager.getSubscription();

        if (!suscripcion) {
            suscripcion = await listo.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: pushClaveUint8(PUSH_VAPID_PUBLIC_KEY)
            });
        }

        await pushGuardarSuscripcion(suscripcion);
        botonRecordatorios.hidden = true;
        if (instructivoPush) instructivoPush.hidden = true;
        alert("Recordatorios activados correctamente.");
    } catch (error) {
        console.error("Error activando Push:", error);
        alert(error.message || "No se pudieron activar los recordatorios.");
    } finally {
        botonRecordatorios.disabled = false;
    }
});
