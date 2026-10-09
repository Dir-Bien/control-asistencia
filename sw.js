self.addEventListener("push", (event) => {
    let payload = {};
    try {
        payload = event.data?.json() || {};
    } catch {
        payload = {};
    }
    const fecha = typeof payload.fecha === "string" ? payload.fecha : "hoy";
    const esPrueba = fecha === "prueba";
    const texto = typeof payload.body === "string" ? payload.body.slice(0, 180) : "No olvides registrar egreso.";
    event.waitUntil(
        self.registration.showNotification("Control de asistencia", {
            body: texto,
            tag: esPrueba ? "prueba-egreso-" + Date.now() : "recordatorio-egreso-" + fecha,
            renotify: esPrueba,
            data: { url: new URL("./asistencia.html", self.registration.scope).href }
        })
    );
});

self.addEventListener("notificationclick", (event) => {
    event.notification.close();
    const destino = event.notification.data?.url ||
        new URL("./asistencia.html", self.registration.scope).href;

    event.waitUntil(
        clients.matchAll({ type: "window", includeUncontrolled: true })
            .then((ventanas) => {
                const abierta = ventanas.find((ventana) => ventana.url === destino);
                if (abierta) return abierta.focus();
                return clients.openWindow(destino);
            })
    );
});
