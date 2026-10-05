const formulario =
    document.getElementById(
        "adminLoginForm"
    );

const usuarioInput =
    document.getElementById(
        "usuario"
    );

const passwordInput =
    document.getElementById(
        "password"
    );

const boton =
    document.getElementById(
        "loginBtn"
    );

const mensajeEl =
    document.getElementById(
        "mensaje"
    );


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


function obtenerAdminToken() {

    return localStorage.getItem(
        "admin_session"
    );

}


function guardarAdminToken(
    token
) {

    localStorage.setItem(
        "admin_session",
        token
    );

}


// Si ya tiene sesión admin
async function comprobarAdmin() {

    const token =
        obtenerAdminToken();


    if (!token) {
        return;
    }


    const {
        data
    } =
        await sb.rpc(
            "admin_estado",
            {

                p_token:
                    token,

                p_device_id:
                    obtenerDeviceId()

            }
        );


    if (data?.ok) {

        window.location.replace(
            "admin.html"
        );

    }

}


formulario.addEventListener(
    "submit",

    async event => {

        event.preventDefault();


        boton.disabled =
            true;


        mensaje(
            "Verificando..."
        );


        try {

            const {
                data,
                error
            } =
                await sb.rpc(
                    "login_admin",
                    {

                        p_usuario:
                            usuarioInput
                                .value
                                .trim(),

                        p_password:
                            passwordInput
                                .value,

                        p_device_id:
                            obtenerDeviceId()

                    }
                );


            if (error) {

                console.error(error);

                throw new Error(
                    "No se pudo iniciar sesión."
                );

            }


            if (!data?.ok) {

                throw new Error(
                    data?.error
                    ||
                    "Usuario o contraseña incorrectos."
                );

            }


            guardarAdminToken(
                data.token
            );


            window.location.replace(
                "admin.html"
            );


        } catch (error) {

            mensaje(
                error.message,
                true
            );


            boton.disabled =
                false;

        }

    }
);


comprobarAdmin();
