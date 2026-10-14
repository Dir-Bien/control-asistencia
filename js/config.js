const SUPABASE_URL = "https://ecfybvfytikyiqfszmvu.supabase.co";
const SUPABASE_PUBLIC_KEY = "sb_publishable_LgMWqvFwpJGqGe66c27Ufg_EXKhOVaZ";

const sb =
    supabase.createClient(
        SUPABASE_URL,
        SUPABASE_PUBLIC_KEY,

        {
            auth: {
                persistSession: false
            }
        }
    );


// ==========================================================
// DISPOSITIVO
// ==========================================================

function generarTokenSeguro() {

    const bytes =
        new Uint8Array(32);

    crypto.getRandomValues(
        bytes
    );

    return Array
        .from(bytes)
        .map(
            b =>
                b
                    .toString(16)
                    .padStart(2, "0")
        )
        .join("");

}


function obtenerDeviceId() {

    let device =
        localStorage.getItem(
            "asistencia_device"
        );


    if (!device) {

        device =
            generarTokenSeguro();

        localStorage.setItem(
            "asistencia_device",
            device
        );

    }


    return device;

}


// ==========================================================
// SESIÓN
// ==========================================================

function obtenerTokenSesion() {

    return localStorage.getItem(
        "asistencia_session"
    );

}


function guardarTokenSesion(
    token
) {

    localStorage.setItem(
        "asistencia_session",
        token
    );

}


// ==========================================================
// UBICACIÓN
// ==========================================================

function obtenerUbicacion() {

    return new Promise(
        (
            resolve,
            reject
        ) => {


            if (
                !navigator.geolocation
            ) {

                reject(
                    new Error(
                        "Este dispositivo no permite obtener ubicación."
                    )
                );

                return;

            }


            navigator.geolocation
                .getCurrentPosition(

                    position => {

                        resolve({

                            latitud:
                                position
                                    .coords
                                    .latitude,

                            longitud:
                                position
                                    .coords
                                    .longitude,

                            precision:
                                position
                                    .coords
                                    .accuracy

                        });

                    },


                    error => {

                        if (
                            error.code === 1
                        ) {

                            reject(
                                new Error(
                                    "La ubicación está bloqueada. En iPhone, abrí Ajustes → Privacidad y seguridad → Localización, activala para Safari y habilitá Ubicación precisa. Volvé a abrir esta página."
                                )
                            );

                        } else if (error.code === 3) {

                            reject(new Error(
                                "El GPS tardó demasiado en responder. Activá la ubicación precisa, acercate a una ventana y volvé a intentar."
                            ));

                        } else {

                            reject(new Error(
                                "No se pudo determinar tu ubicación. Comprobá que la localización esté activada, tengas señal y volvé a intentar."
                            ));

                        }

                    },


                    {
                        enableHighAccuracy:
                            true,

                        timeout:
                            20000,

                        maximumAge:
                            0
                    }

                );

        }
    );

}
function esCelular() {

    if (
        navigator.userAgentData
        &&
        typeof navigator.userAgentData.mobile
            === "boolean"
    ) {

        return navigator
            .userAgentData
            .mobile;

    }


    const userAgent =
        navigator.userAgent
        || "";


    return /Android|iPhone|iPod|Mobile/i
        .test(
            userAgent
        );

}


function bloquearPC() {

    if (!esCelular()) {

        window.location.replace(
            "bloqueado.html"
        );

        return true;

    }


    return false;

}


// El navegador integrado de Google en iOS puede impedir WebAuthn.
// No usarlo para vincular un dispositivo al sistema de asistencia.
function navegadorIntegradoProblematico() {
    const agente = navigator.userAgent || "";
    return /\bGSA\//i.test(agente) && /iPhone|iPad|iPod/i.test(agente);
}

function explicarErrorWebAuthn(error) {
    if (navegadorIntegradoProblematico()) {
        return "La verificación falló dentro de la aplicación de Google. Abrí el enlace directamente en Safari. Si ya vinculaste tu cuenta en Google, pedí al administrador restablecer el dispositivo para vincularla en Safari.";
    }
    if (error?.name === "NotAllowedError") {
        const iphone = /iPhone|iPad|iPod/i.test(navigator.userAgent || "");
        return iphone
            ? "El teléfono no autorizó Face ID o la verificación segura. Si cancelaste, volvé a intentarlo. Abrí la página directamente en Safari y comprobá que Face ID o el código estén configurados."
            : "El teléfono no autorizó la verificación biométrica o el PIN. Si cancelaste, volvé a intentarlo. Comprobá que la seguridad de pantalla esté activada y abrí la página directamente en tu navegador.";
    }
    return String(error?.message || "No se pudo completar la verificación de identidad.");
}

function explicarErrorUbicacion(error) {
    const mensaje = String(error?.message || "No se pudo comprobar la ubicación.");
    if (/fuera del radio permitido/i.test(mensaje)) {
        return mensaje + " Si estás en el establecimiento, activá Ubicación precisa, acercate a una ventana y volvé a intentar. Si continúa, reportá el problema.";
    }
    return mensaje;
}
