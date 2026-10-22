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

const mostrarPasswordBtn = document.getElementById("mostrarPasswordBtn");
mostrarPasswordBtn?.addEventListener("click", () => {
    const visible = inputPassword.type === "password";
    inputPassword.type = visible ? "text" : "password";
    mostrarPasswordBtn.textContent = visible ? "Ocultar contraseña" : "Mostrar contraseña";
    mostrarPasswordBtn.setAttribute("aria-pressed", String(visible));
});


function mostrarMensaje(texto, error = false) {

    mensajeEl.textContent = texto;
    window.registrarMensajeProblema?.(texto, error);

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
            return;

        }

        // El token guardado puede haber expirado o haberse invalidado
        // por un nuevo inicio de sesión o un cambio de dispositivo.
        if (data?.ok === false) {
            localStorage.removeItem("asistencia_session");
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


        // Evita vincular teléfonos a navegadores internos que no soportan
        // correctamente Face ID/WebAuthn y requieren después un reseteo.
        if (navegadorIntegradoProblematico()) {
            mostrarMensaje(
                "Abrí esta página directamente en Safari, no dentro de la aplicación de Google. Si ya vinculaste tu DNI en Google, pedí a administración que restablezca el dispositivo antes de entrar desde Safari.",
                true
            );
            return;
        }

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

                const servidor=String(data?.error||"");
                if (/vinculado a otro dispositivo/i.test(servidor)) {
                    const ios=/iPhone|iPad|iPod/i.test(navigator.userAgent||"");
                    throw new Error(
                        "Tu cuenta sigue vinculada a un identificador de dispositivo anterior. " +
                        "Eso también puede ocurrir en el mismo celular si abriste otro navegador, " +
                        "una pestaña privada, la web instalada en la pantalla de inicio o se borraron los datos del sitio. " +
                        (ios ? "Probá abrirla exactamente desde el mismo lugar que usaste la primera vez (Safari o el ícono instalado). " :
                            "Abrí el mismo navegador y perfil que usaste al registrarte. ") +
                        "Si ya no podés acceder por ese medio, pedí a Personal que restablezca tu dispositivo. " +
                        "No es necesario dar de baja tu usuario ni borrar asistencias."
                    );
                }
                throw new Error(servidor||"No se pudo iniciar sesión.");

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
                explicarErrorUbicacion(error),
                true
            );


            boton.disabled =
                false;

            boton.textContent =
                "Ingresar";

        }

    }
);


if (new URLSearchParams(window.location.search).get("sesion") === "expirada") {
    mostrarMensaje("Tu sesión venció o fue invalidada. Si aparece un error de dispositivo, abrí el mismo navegador o acceso instalado que usaste al vincularte. Si no funciona, pedí a Personal que restablezca la vinculación.", true);
}

if (navegadorIntegradoProblematico()) {
    mostrarMensaje("Para registrar asistencia en iPhone, abrí este enlace directamente en Safari. La aplicación de Google puede impedir Face ID.", true);
}

comprobarSesion();
