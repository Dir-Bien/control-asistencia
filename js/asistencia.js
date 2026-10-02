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
    // LE FALTA CONFIGURAR WEBAUTHN
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


        return;

    }


    // ==========================================
    // YA TERMINÓ
    // ==========================================

    if (data.salida) {

        mensaje(
            "La jornada de hoy ya está registrada."
        );

        return;

    }


    // ==========================================
    // PUEDE REGISTRAR EGRESO
    // ==========================================

    egresoBtn.hidden =
        false;

    egresoBtn.disabled =
        false;

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


    mensaje(
        "Ingreso registrado correctamente."
    );


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
