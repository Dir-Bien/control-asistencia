const formulario =
    document.getElementById("loginForm");

const inputDni =
    document.getElementById("dni");

const inputPassword =
    document.getElementById("password");

const mensajeEl =
    document.getElementById("mensaje");

const boton =
    document.getElementById("loginBtn");


function mostrarMensaje(texto, error = false) {

    mensajeEl.textContent = texto;

    mensajeEl.className =
        error
            ? "mensaje error"
            : "mensaje ok";
}


async function comprobarSesion() {

    try {

        const token =
            obtenerTokenSesion();

        if (!token) {
            return;
        }

        const device =
            obtenerDeviceId();

        const {
            data,
            error
        } = await sb.rpc(
            "mi_estado_seguro",
            {
                p_token: token,
                p_device_id: device
            }
        );


        if (error) {

            console.error(
                "Error comprobando sesión:",
                error
            );

            return;
        }


        if (data?.ok) {

            window.location.replace(
                "asistencia.html"
            );

        }

    } catch (error) {

        console.error(
            "Error comprobando sesión:",
            error
        );

    }

}


formulario.addEventListener(
    "submit",
    async (event) => {

        event.preventDefault();


        // ===============================
        // VALIDAR HTML
        // ===============================

        if (
            !inputDni ||
            !inputPassword
        ) {

            mostrarMensaje(
                "Error interno: no se encontraron los campos del formulario.",
                true
            );

            return;
        }


        // ===============================
        // DNI
        // ===============================

        const dni =
            inputDni.value.replace(
                /\D/g,
                ""
            );


        if (
            dni.length < 7 ||
            dni.length > 9
        ) {

            mostrarMensaje(
                "Ingresá un DNI válido.",
                true
            );

            return;
        }


        // ===============================
        // CONTRASEÑA
        // ===============================

        const password =
            inputPassword.value.trim();


        if (!password) {

            mostrarMensaje(
                "Ingresá tu contraseña.",
                true
            );

            return;
        }


        boton.disabled = true;

        boton.textContent =
            "Verificando...";


        try {

            // ===============================
            // UBICACIÓN
            // ===============================

            mostrarMensaje(
                "Obteniendo ubicación..."
            );


            let ubicacion;


            try {

                ubicacion =
                    await obtenerUbicacion();

            } catch (error) {

                throw new Error(
                    error.message ||
                    "No se pudo obtener tu ubicación."
                );

            }


            if (
                ubicacion.precision > 200
            ) {

                throw new Error(
                    "La ubicación del teléfono no es suficientemente precisa. Probá acercarte a una ventana o activar el GPS."
                );

            }


            // ===============================
            // LOGIN
            // ===============================

            mostrarMensaje(
                "Verificando datos..."
            );


            const {
                data,
                error
            } = await sb.rpc(
                "login_empleado",
                {

                    p_dni:
                        dni,

                    p_password:
                        password,

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


            // ===============================
            // ERROR SUPABASE
            // ===============================

            if (error) {

                console.error(
                    "Error Supabase:",
                    error
                );

                throw new Error(
                    "No se pudo comunicar con el sistema. Intentá nuevamente."
                );

            }


            // ===============================
            // ERROR CONTROLADO POR NOSOTROS
            // ===============================

            if (!data?.ok) {

                throw new Error(
                    data?.error ||
                    "No se pudo iniciar sesión."
                );

            }


            // ===============================
            // LOGIN CORRECTO
            // ===============================

            guardarTokenSesion(
                data.token
            );


            mostrarMensaje(
                "Ingreso correcto."
            );


            window.location.replace(
                "asistencia.html"
            );


        } catch (error) {

            console.error(
                "Error login:",
                error
            );


            mostrarMensaje(
                error.message ||
                "No se pudo iniciar sesión.",
                true
            );


            boton.disabled =
                false;

            boton.textContent =
                "Ingresar";

        }

    }
);


comprobarSesion();
