const {
    startRegistration,
    startAuthentication,
    browserSupportsWebAuthn
} = window.SimpleWebAuthnBrowser || {};


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
const reintentarCargaBtn=document.getElementById("reintentarCargaBtn");


function mensaje(
    texto,
    error = false
) {

    mensajeEl.textContent =
        texto;
    window.registrarMensajeProblema?.(texto, error);

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
                "America/Argentina/Buenos_Aires",
            hourCycle: "h23"

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


    if (data?.ok === false) {
        // Nunca mantener un token rechazado: evitar quedar en una pantalla
        // de asistencia que sólo muestra "Sesión inválida".
        localStorage.removeItem("asistencia_session");
        window.location.replace("index.html?sesion=expirada");
        return null;
    }

    if (!data?.ok) {
        throw new Error("No se pudo validar la sesión. Intentá nuevamente.");
    }

    return data;

}


function mostrarEstado(
    data
) {

    estadoActual = data;

    // Consultar recordatorios al abrir el registro, incluso antes del ingreso.
    prepararRecordatorioPush(data);


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

    seguridadBtn.hidden = false;

    // El navegador integrado de la aplicación Google en iOS devuelve
    // NotAllowedError antes de que aparezca Face ID. No intentar fichar.
    if (navegadorIntegradoProblematico() && !data.salida) {
        seguridadBox.hidden = false;
        seguridadBtn.hidden = true;
        seguridadTexto.textContent =
            "Abrí Control de Asistencia desde Safari. El navegador interno de Google impide completar Face ID o el código. Si esta cuenta se vinculó desde Google, administración debe restablecer el dispositivo para asociarla a Safari.";
        mensaje("Este navegador no permite completar la verificación de seguridad.", true);
        return;
    }


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

}


// ==========================================================
// LLAMAR EDGE FUNCTION
// ==========================================================

async function webauthn(
    action,
    extra = {}
) {

    const respuesta =
        await fetch(
            `${SUPABASE_URL}/functions/v1/webauthn`,
            {

                method:
                    "POST",

                headers: {

                    "Content-Type":
                        "application/json",

                    "apikey":
                        SUPABASE_PUBLIC_KEY

                },

                body:
                    JSON.stringify({

                        action,

                        token:
                            obtenerTokenSesion(),

                        device_id:
                            obtenerDeviceId(),

                        ...extra

                    })

            }
        );


    let data = null;


    try {

        data =
            await respuesta.json();

    } catch (_) {

        throw new Error(
            "La respuesta del servidor no es válida."
        );

    }


    if (
        !respuesta.ok
        ||
        !data?.ok
    ) {

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


    let etapa="biometria";
    try {

        if (
            !browserSupportsWebAuthn || !browserSupportsWebAuthn()
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

        if (!estado) return;

        mostrarEstado(
            estado
        );


        // La propia configuración acaba
        // de verificar al usuario.
        // Si todavía no ingresó, registramos ahora.

        if (!estado.entrada) {

            etapa="ubicacion";
            await registrarIngreso();

        }


    } catch (error) {

        console.error(error);


        const texto = etapa==="biometria" ? explicarErrorWebAuthn(error) : explicarErrorUbicacion(error);

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
        !browserSupportsWebAuthn || !browserSupportsWebAuthn()
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


async function ubicacionParaFichaje() {
    mensaje("Comprobando ubicación precisa...");
    const ubicacion=await obtenerUbicacion();
    if (!Number.isFinite(ubicacion?.latitud)||!Number.isFinite(ubicacion?.longitud)
        ||!Number.isFinite(ubicacion?.precision)||ubicacion.precision<=0
        ||ubicacion.precision>200) {
        throw new Error("El GPS devolvió una ubicación poco precisa. Activá Ubicación precisa, acercate a una ventana y volvé a intentar.");
    }
    return ubicacion;
}

// ==========================================================
// INGRESO
// ==========================================================

async function verificarYRegistrarIngreso() {
    if (seguridadBtn.disabled) return;
    seguridadBtn.disabled=true;
    let etapa="ubicacion";
    try {
        // No abrir la biometría cuando el teléfono todavía no obtuvo GPS.
        const ubicacion=await ubicacionParaFichaje();
        etapa="biometria";
        mensaje("Verificando identidad...");
        await verificarWebAuthn();
        etapa="registro";
        await registrarIngreso(ubicacion);
    } catch (error) {
        console.error(error);
        mensaje(etapa==="biometria"?explicarErrorWebAuthn(error):explicarErrorUbicacion(error),true);
        seguridadBtn.disabled=false;
    }
}

async function registrarIngreso(ubicacionPrevia=null) {

    const ubicacion=ubicacionPrevia||await ubicacionParaFichaje();


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

    if (!estado) return;

    mostrarEstado(
        estado
    );

}


// ==========================================================
// EGRESO: el personal AC requiere geolocalización en cualquiera de las dos sedes.
// La validación final siempre está del lado de Supabase.
// ==========================================================

egresoBtn.addEventListener("click", async () => {
    if (egresoBtn.disabled) return;
    egresoBtn.disabled=true;
    let etapa="ubicacion";
    try {
        let latitud=null,longitud=null,precision=null;
        // Solo AC requiere GPS para egreso. SV mantiene su regla actual.
        if (String(estadoActual?.grado||"").trim().toUpperCase()==="AC") {
            const ubicacion=await ubicacionParaFichaje();
            latitud=ubicacion.latitud;
            longitud=ubicacion.longitud;
            precision=ubicacion.precision;
        }
        etapa="biometria";
        mensaje("Verificando identidad...");
        await verificarWebAuthn();
        etapa="registro";
        mensaje("Registrando egreso...");
        const {data,error}=await sb.rpc("registrar_salida_segura",{
            p_token:obtenerTokenSesion(),p_device_id:obtenerDeviceId(),
            p_latitud:latitud,p_longitud:longitud,p_precision:precision
        });
        if(error||!data?.ok){
            if(error)console.error(error);
            throw new Error(data?.error||"No se pudo registrar el egreso.");
        }
        const estado=await obtenerEstado();
        if (!estado) return;
        mostrarEstado(estado);
    } catch(error) {
        console.error(error);
        mensaje(etapa==="biometria"?explicarErrorWebAuthn(error):explicarErrorUbicacion(error),true);
        egresoBtn.disabled=false;
    }
});

// ==========================================================
// INICIO
// ==========================================================

async function iniciar() {
    if(reintentarCargaBtn){
        reintentarCargaBtn.hidden=true;
        reintentarCargaBtn.disabled=true;
    }
    try {
        const estado=await obtenerEstado();
        if (!estado) return;
        mostrarEstado(estado);
    } catch(error){
        console.error(error);
        nombreEl.textContent=estadoActual
            ? nombreEl.textContent
            : "No se pudo cargar la asistencia";
        mensaje(error?.message||"No se pudo conectar con el sistema. Volvé a intentar.",true);
        if(reintentarCargaBtn){
            reintentarCargaBtn.hidden=false;
            reintentarCargaBtn.disabled=false;
        }
    }
}
reintentarCargaBtn?.addEventListener("click",()=>void iniciar());

iniciar();
