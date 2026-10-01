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

const egresoBtn =
    document.getElementById("egresoBtn");

const mensajeEl =
    document.getElementById("mensaje");


let estadoActual = null;

let intervaloNotificacion = null;


// ==========================================================
// MENSAJES
// ==========================================================

function mostrarMensaje(
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


// ==========================================================
// FORMATO HORA
// ==========================================================

function horaArgentina(fecha) {

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


// ==========================================================
// CARGAR ESTADO
// ==========================================================

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

        console.error(
            error
        );

        throw new Error(
            "No se pudo obtener tu información."
        );

    }


    if (!data?.ok) {

        throw new Error(
            data?.error ||
            "La sesión no es válida."
        );

    }


    return data;

}


// ==========================================================
// REGISTRAR ENTRADA AUTOMÁTICAMENTE
// ==========================================================

async function registrarEntradaAutomatica() {

    mostrarMensaje(
        "Verificando ubicación..."
    );


    const ubicacion =
        await obtenerUbicacion();


    mostrarMensaje(
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

        console.error(
            error
        );

        throw new Error(
            "No se pudo registrar el ingreso."
        );

    }


    if (!data?.ok) {

        throw new Error(
            data?.error ||
            "No se pudo registrar el ingreso."
        );

    }


    return data;

}


// ==========================================================
// MOSTRAR ESTADO
// ==========================================================

function mostrarEstado(data) {

    estadoActual =
        data;


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
        data.turno === "MANANA"
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


    // ======================================================
    // YA EGRESÓ
    // ======================================================

    if (data.salida) {

        egresoBtn.textContent =
            "Jornada registrada";

        egresoBtn.disabled =
            true;

        mostrarMensaje(
            "Ingreso y egreso registrados."
        );

        return;

    }


    // ======================================================
    // PUEDE REGISTRAR EGRESO
    // ======================================================

    egresoBtn.textContent =
        "Registrar egreso";

    egresoBtn.disabled =
        false;


    programarRecordatorio();

}


// ==========================================================
// INICIO
// ==========================================================

async function iniciar() {

    egresoBtn.disabled =
        true;

    egresoBtn.textContent =
        "Cargando...";


    try {

        let estado =
            await obtenerEstado();


        if (!estado) {

            return;

        }


        // Si todavía no tiene entrada de hoy,
        // se registra automáticamente.

        if (!estado.entrada) {

            await registrarEntradaAutomatica();


            estado =
                await obtenerEstado();


            mostrarMensaje(
                "Ingreso registrado correctamente."
            );

        }


        mostrarEstado(
            estado
        );


        await solicitarNotificaciones();


    } catch (error) {

        console.error(
            error
        );


        mostrarMensaje(
            error.message,
            true
        );


        egresoBtn.textContent =
            "No se registró el ingreso";

        egresoBtn.disabled =
            true;

    }

}


// ==========================================================
// REGISTRAR EGRESO
// ==========================================================

egresoBtn.addEventListener(
    "click",
    async () => {

        if (
            !estadoActual
            ||
            estadoActual.salida
        ) {

            return;

        }


        egresoBtn.disabled =
            true;


        mostrarMensaje(
            "Registrando egreso..."
        );


        try {

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

                console.error(
                    error
                );

                throw new Error(
                    "No se pudo registrar el egreso."
                );

            }


            if (!data?.ok) {

                throw new Error(
                    data?.error ||
                    "No se pudo registrar el egreso."
                );

            }


            mostrarMensaje(
                "Egreso registrado correctamente."
            );


            const estado =
                await obtenerEstado();


            mostrarEstado(
                estado
            );


        } catch (error) {

            console.error(
                error
            );


            mostrarMensaje(
                error.message,
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

async function solicitarNotificaciones() {

    if (
        !("Notification" in window)
    ) {

        return;

    }


    if (
        Notification.permission
        === "default"
    ) {

        try {

            await Notification
                .requestPermission();

        } catch (error) {

            console.log(
                error
            );

        }

    }

}


// ==========================================================
// RECORDATORIO DE EGRESO
// ==========================================================

function programarRecordatorio() {

    if (
        intervaloNotificacion
    ) {

        clearInterval(
            intervaloNotificacion
        );

    }


    if (
        !estadoActual?.entrada
        ||
        estadoActual?.salida
    ) {

        return;

    }


    intervaloNotificacion =
        setInterval(
            revisarRecordatorio,
            30000
        );


    revisarRecordatorio();

}


function revisarRecordatorio() {

    if (
        !estadoActual
        ||
        estadoActual.salida
    ) {

        return;

    }


    const partes =
        new Intl.DateTimeFormat(
            "en-US",
            {

                hour:
                    "2-digit",

                minute:
                    "2-digit",

                hour12:
                    false,

                timeZone:
                    "America/Argentina/Buenos_Aires"

            }
        ).formatToParts(
            new Date()
        );


    const hora =
        Number(
            partes.find(
                p =>
                    p.type === "hour"
            )?.value
        );


    const minuto =
        Number(
            partes.find(
                p =>
                    p.type === "minute"
            )?.value
        );


    const objetivo =
        estadoActual.turno === "MANANA"
            ? 13
            : 18;


    if (
        hora !== objetivo
        ||
        minuto > 5
    ) {

        return;

    }


    const clave =
        `notificacion-${estadoActual.fecha}-${objetivo}`;


    if (
        localStorage.getItem(
            clave
        )
    ) {

        return;

    }


    localStorage.setItem(
        clave,
        "1"
    );


    mostrarMensaje(
        "No olvides registrar egreso."
    );


    if (
        "Notification" in window
        &&
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

    }

}


// ==========================================================
// INICIAR
// ==========================================================

iniciar();
