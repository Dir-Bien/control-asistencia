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
                                    "Tenés que permitir la ubicación."
                                )
                            );

                        } else {

                            reject(
                                new Error(
                                    "No se pudo obtener una ubicación válida."
                                )
                            );

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
