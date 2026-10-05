const {
    startRegistration,
    startAuthentication,
    browserSupportsWebAuthn
} = SimpleWebAuthnBrowser;


const nombreEl =
    document.getElementById("nombre");

const gradoEl =
    document.getElementById("grado");

const departamentoEl =
    document.getElementById("departamento");

const fechaEl =
    document.getElementById("fecha");

const turnoEl =
    document.getElementById("turno");

const entradaEl =
    document.getElementById("entrada");

const salidaEl =
    document.getElementById("salida");

const seguridadBox =
    document.getElementById("seguridadBox");

const seguridadTexto =
    document.getElementById("seguridadTexto");

const seguridadBtn =
    document.getElementById("seguridadBtn");

const egresoBtn =
    document.getElementById("egresoBtn");

const mensajeEl =
    document.getElementById("mensaje");

const notificacionesBtn =
    document.getElementById(
        "notificacionesBtn"
    );

let intervaloRecordatorio = null;


let estadoActual = null;


function mensaje(
    texto,
    error = false
) {

    mensajeEl.textContent =
        texto;

    mensajeEl.className =
        error
            ? "mensaje error"
            : "mensaje ok";

}


function horaArgentina(
    fecha
) {

    if (!fecha) {
        return "-";
    }


    return new Intl.DateTimeFormat(
        "es-AR",
        {

            hour:
                "2-digit",

            minute:
                "2-digit",

            second:
                "2-digit",

            timeZone:
                "America/Argentina/Buenos_Aires"

        }
    ).format(
        new Date(fecha)
    );

}


async function obtenerEstado() {

    const token =
        obtenerTokenSesion();


    if (!token) {

        window.location.replace(
            "index.html"
        );

        return null;

    }


    const {
        data,
        error
    } =
        await sb.rpc(
            "mi_estado_seguro",
            {

                p_token:
                    token,

                p_device_id:
                    obtenerDeviceId()

            }
        );


    if (error) {

        console.error(error);

        throw new Error(
            "No se pudo consultar tu información."
        );

    }


    if (!data?.ok) {

        throw new Error(
            data?.error
            ||
            "Sesión inválida."
        );

    }


    return data;

}


function mostrarEstado(
    data
) {

    estadoActual = data;


    nombreEl.textContent =
        `${data.apellido}, ${data.nombre}`;


    gradoEl.textContent =
        data.grado || "-";


    departamentoEl.textContent =
        data.departamento
        || "Sin asignar";


    fechaEl.textContent =
        data.fecha || "-";


    turnoEl.textContent =
        !data.turno
            ? "-"
            : data.turno === "MANANA"
                ? "Mañana"
                : "Tarde";


    entradaEl.textContent =
        horaArgentina(
            data.entrada
        );


    salidaEl.textContent =
        horaArgentina(
            data.salida
        );


    seguridadBox.hidden =
        true;


    egresoBtn.hidden =
        true;


    // ==========================================
    // TODAVÍA NO CONFIGURÓ WEBAUTHN
    // ==========================================

    if (
        !data.webauthn_configurado
    ) {

        seguridadBox.hidden =
            false;


        seguridadTexto.textContent =
            "Para continuar debe configurar la seguridad de este dispositivo utilizando huella, reconocimiento facial o PIN.";


        seguridadBtn.textContent =
            "Configurar seguridad";


        seguridadBtn.onclick =
            configurarWebAuthn;


        mensaje("");


        return;

    }


    // ==========================================
    // TODAVÍA NO REGISTRÓ INGRESO
    // ==========================================

    if (!data.entrada) {

        seguridadBox.hidden =
            false;


        seguridadTexto.textContent =
            "Verifique su identidad para registrar automáticamente el ingreso de hoy.";


        seguridadBtn.textContent =
            "Verificar identidad";


        seguridadBtn.onclick =
            verificarYRegistrarIngreso;


        mensaje("");


        return;

    }


    // ==========================================
    // YA TIENE INGRESO Y EGRESO
    // ==========================================

    if (data.salida) {

        mensaje(
            "La jornada de hoy ya está registrada."
        );


        // Frenamos cualquier recordatorio
        if (
            intervaloRecordatorio
        ) {

            clearInterval(
                intervaloRecordatorio
            );


            intervaloRecordatorio =
                null;

        }


        return;

    }


    // ==========================================
    // YA TIENE INGRESO
    // TODAVÍA NO TIENE EGRESO
    // ==========================================

    egresoBtn.hidden =
        false;


    egresoBtn.disabled =
        false;


    mensaje(
        `Ingreso registrado a las ${horaArgentina(data.entrada)}.`
    );


    // Recordatorio 13:00 / 18:00
    programarRecordatorioEgreso();

}


// ==========================================================
// LLAMAR EDGE FUNCTION
// ==========================================================

async function webauthn(
    action,
    extra = {}
) {

    const {
        data,
        error
    } =
        await sb.functions.invoke(
            "webauthn",
            {

                body: {

                    action,

                    token:
                        obtenerTokenSesion(),

                    device_id:
                        obtenerDeviceId(),

                    ...extra

                }

            }
        );


    if (error) {

        console.error(
            "Edge Function:",
            error
        );


        let texto =
            "No se pudo realizar la verificación de seguridad.";


        try {

            const detalle =
                await error.context.json();

            texto =
                detalle.error
                || texto;

        } catch (_) {}


        throw new Error(texto);

    }


    if (!data?.ok) {

        throw new Error(
            data?.error
            ||
            "No se pudo realizar la verificación de seguridad."
        );

    }


    return data;

}


// ==========================================================
// PRIMERA CONFIGURACIÓN
// ==========================================================

async function configurarWebAuthn() {

    seguridadBtn.disabled =
        true;


    mensaje(
        "Configurando seguridad..."
    );


    try {

        if (
            !browserSupportsWebAuthn()
        ) {

            throw new Error(
                "Este navegador no soporta la verificación segura requerida."
            );

        }


        const inicio =
            await webauthn(
                "register-options"
            );


        const respuesta =
            await startRegistration({

                optionsJSON:
                    inicio.options

            });


        await webauthn(
            "register-verify",
            {

                response:
                    respuesta

            }
        );


        mensaje(
            "Seguridad configurada correctamente."
        );


        const estado =
            await obtenerEstado();


        mostrarEstado(
            estado
        );


        // La propia configuración acaba
        // de verificar al usuario.
        // Si todavía no ingresó, registramos ahora.

        if (!estado.entrada) {

            await registrarIngreso();

        }


    } catch (error) {

        console.error(error);


        let texto =
            error.message
            ||
            "No se pudo configurar la seguridad.";


        if (
            error.name ===
            "NotAllowedError"
        ) {

            texto =
                "La verificación fue cancelada.";

        }


        mensaje(
            texto,
            true
        );


        seguridadBtn.disabled =
            false;

    }

}


// ==========================================================
// VERIFICAR WEBAUTHN
// ==========================================================

async function verificarWebAuthn() {

    if (
        !browserSupportsWebAuthn()
    ) {

        throw new Error(
            "Este navegador no soporta WebAuthn."
        );

    }


    const inicio =
        await webauthn(
            "auth-options"
        );


    const respuesta =
        await startAuthentication({

            optionsJSON:
                inicio.options

        });


    await webauthn(
        "auth-verify",
        {

            response:
                respuesta

        }
    );

}


// ==========================================================
// INGRESO
// ==========================================================

async function verificarYRegistrarIngreso() {

    seguridadBtn.disabled =
        true;


    try {

        mensaje(
            "Verificando identidad..."
        );


        await verificarWebAuthn();


        await registrarIngreso();


    } catch (error) {

        console.error(error);


        mensaje(
            error.name === "NotAllowedError"
                ? "La verificación fue cancelada."
                : error.message,
            true
        );


        seguridadBtn.disabled =
            false;

    }

}


async function registrarIngreso() {

    mensaje(
        "Verificando ubicación..."
    );


    const ubicacion =
        await obtenerUbicacion();


    mensaje(
        "Registrando ingreso..."
    );


    const {
        data,
        error
    } =
        await sb.rpc(
            "registrar_entrada_automatica_segura",
            {

                p_token:
                    obtenerTokenSesion(),

                p_device_id:
                    obtenerDeviceId(),

                p_latitud:
                    ubicacion.latitud,

                p_longitud:
                    ubicacion.longitud,

                p_precision:
                    ubicacion.precision

            }
        );


    if (error) {

        console.error(error);

        throw new Error(
            "No se pudo registrar el ingreso."
        );

    }


    if (!data?.ok) {

        throw new Error(
            data?.error
            ||
            "No se pudo registrar el ingreso."
        );

    }


    const estado =
        await obtenerEstado();
    
    
    mostrarEstado(
        estado
    );

}


// ==========================================================
// EGRESO
// ==========================================================

egresoBtn.addEventListener(
    "click",

    async () => {

        egresoBtn.disabled =
            true;


        try {

            mensaje(
                "Verificando identidad..."
            );


            await verificarWebAuthn();


            mensaje(
                "Registrando egreso..."
            );


            const {
                data,
                error
            } =
                await sb.rpc(
                    "registrar_salida_segura",
                    {

                        p_token:
                            obtenerTokenSesion(),

                        p_device_id:
                            obtenerDeviceId()

                    }
                );


            if (error) {

                console.error(error);

                throw new Error(
                    "No se pudo registrar el egreso."
                );

            }


            if (!data?.ok) {

                throw new Error(
                    data?.error
                    ||
                    "No se pudo registrar el egreso."
                );

            }


            mensaje(
                "Egreso registrado correctamente."
            );


            const estado =
                await obtenerEstado();


            mostrarEstado(
                estado
            );


        } catch (error) {

            console.error(error);


            mensaje(
                error.name === "NotAllowedError"
                    ? "La verificación fue cancelada."
                    : error.message,
                true
            );


            egresoBtn.disabled =
                false;

        }

    }
);

// ==========================================================
// NOTIFICACIONES
// ==========================================================

async function activarNotificaciones() {

    if (
        !("Notification" in window)
    ) {

        mensaje(
            "Este navegador no admite notificaciones.",
            true
        );

        return false;
    }


    if (
        Notification.permission === "granted"
    ) {

        notificacionesBtn.hidden = true;

        return true;
    }


    if (
        Notification.permission === "denied"
    ) {

        mensaje(
            "Las notificaciones están bloqueadas. Tenés que habilitarlas desde los permisos del navegador.",
            true
        );

        return false;
    }


    const permiso =
        await Notification.requestPermission();


    if (
        permiso === "granted"
    ) {

        notificacionesBtn.hidden =
            true;


        mensaje(
            "Recordatorios activados."
        );


        return true;
    }


    return false;
}


// ==========================================================
// MOSTRAR BOTÓN SI FALTA PERMISO
// ==========================================================

function comprobarPermisoNotificaciones() {

    if (
        !("Notification" in window)
    ) {

        return;
    }


    if (
        Notification.permission !== "granted"
        &&
        estadoActual?.entrada
        &&
        !estadoActual?.salida
    ) {

        notificacionesBtn.hidden =
            false;

    } else {

        notificacionesBtn.hidden =
            true;

    }

}


// ==========================================================
// HORA ARGENTINA
// ==========================================================

function obtenerHoraArgentina() {

    const partes =
        new Intl.DateTimeFormat(
            "en-US",
            {
                timeZone:
                    "America/Argentina/Buenos_Aires",

                hour:
                    "2-digit",

                minute:
                    "2-digit",

                hour12:
                    false
            }
        )
        .formatToParts(
            new Date()
        );


    return {

        hora:
            Number(
                partes.find(
                    p =>
                        p.type === "hour"
                )?.value
            ),

        minuto:
            Number(
                partes.find(
                    p =>
                        p.type === "minute"
                )?.value
            )

    };

}


// ==========================================================
// PROGRAMAR RECORDATORIO
// ==========================================================

function programarRecordatorioEgreso() {

    if (
        intervaloRecordatorio
    ) {

        clearInterval(
            intervaloRecordatorio
        );

    }


    if (
        !estadoActual?.entrada
        ||
        estadoActual?.salida
        ||
        !estadoActual?.turno
    ) {

        return;

    }


    comprobarPermisoNotificaciones();


    intervaloRecordatorio =
        setInterval(
            revisarRecordatorioEgreso,
            30000
        );


    revisarRecordatorioEgreso();

}


// ==========================================================
// REVISAR SI HAY QUE NOTIFICAR
// ==========================================================

async function revisarRecordatorioEgreso() {

    if (
        !estadoActual?.entrada
        ||
        estadoActual?.salida
    ) {

        return;

    }


    const {
        hora,
        minuto
    } =
        obtenerHoraArgentina();


    const horaObjetivo =
        estadoActual.turno === "MANANA"
            ? 13
            : 18;


    // Permitimos una ventana de 10 minutos.
    // Esto ayuda si el navegador ralentiza timers.
    if (
        hora !== horaObjetivo
        ||
        minuto > 10
    ) {

        return;

    }


    const clave =
        `recordatorio-egreso-${estadoActual.fecha}`;


    // Ya notificamos hoy.
    if (
        localStorage.getItem(
            clave
        )
    ) {

        return;

    }


    try {

        // Volvemos a consultar Supabase antes
        // de notificar por si ya registró egreso.

        const estadoNuevo =
            await obtenerEstado();


        if (
            !estadoNuevo?.entrada
            ||
            estadoNuevo?.salida
        ) {

            return;

        }


        if (
            Notification.permission
            === "granted"
        ) {

            new Notification(
                "Control de asistencia",
                {
                    body:
                        "No olvides registrar egreso."
                }
            );


            localStorage.setItem(
                clave,
                "1"
            );


            mensaje(
                "No olvides registrar egreso."
            );

        }

    } catch (
        error
    ) {

        console.error(
            "Error comprobando recordatorio:",
            error
        );

    }

}


// ==========================================================
// BOTÓN ACTIVAR NOTIFICACIONES
// ==========================================================

notificacionesBtn
    .addEventListener(
        "click",
        async () => {

            await activarNotificaciones();

            programarRecordatorioEgreso();

        }
    );


// ==========================================================
// INICIO
// ==========================================================

async function iniciar() {

    try {

        const estado =
            await obtenerEstado();


        if (!estado) {
            return;
        }


        mostrarEstado(
            estado
        );


    } catch (error) {

        console.error(error);


        mensaje(
            error.message,
            true
        );

    }

}


iniciar();
