const loginForm = document.getElementById("loginForm");
const registroForm = document.getElementById("registroForm");
const mensaje = document.getElementById("mensaje");

function mostrarMensaje(texto, error = false) {
  mensaje.textContent = texto;
  mensaje.className = error ? "mensaje error" : "mensaje ok";
}

if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const dni = document.getElementById("loginDni").value.replace(/\D/g, "");
    const password = document.getElementById("loginPassword").value;

    mostrarMensaje("Ingresando...");

    const { error } = await sb.auth.signInWithPassword({
      email: emailTecnicoDesdeDni(dni),
      password,
    });

    if (error) {
      mostrarMensaje("DNI o contraseña incorrectos.", true);
      return;
    }

    location.href = "asistencia.html";
  });
}

if (registroForm) {
  registroForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const dni = document.getElementById("registroDni").value.replace(/\D/g, "");
    const claveInicial = document.getElementById("claveInicial").value.trim();
    const password = document.getElementById("registroPassword").value;
    const repetir = document.getElementById("repetirPassword").value;

    if (password !== repetir) {
      mostrarMensaje("Las contraseñas no coinciden.", true);
      return;
    }

    if (password.length < 6) {
      mostrarMensaje("Usá al menos 6 caracteres o números.", true);
      return;
    }

    mostrarMensaje("Creando cuenta...");

    const { data, error } = await sb.functions.invoke("registrar-empleado", {
      body: {
        dni,
        clave_inicial: claveInicial,
        password,
        device_id: obtenerDeviceId(),
      },
    });

    if (error) {
      let texto = "No se pudo crear la cuenta.";
      try {
        const detalle = await error.context.json();
        texto = detalle.error || texto;
      } catch (_) {}
      mostrarMensaje(texto, true);
      return;
    }

    if (!data?.ok) {
      mostrarMensaje(data?.error || "No se pudo crear la cuenta.", true);
      return;
    }

    const login = await sb.auth.signInWithPassword({
      email: emailTecnicoDesdeDni(dni),
      password,
    });

    if (login.error) {
      mostrarMensaje("Cuenta creada. Ahora iniciá sesión.");
      return;
    }

    location.href = "asistencia.html";
  });
}
