self.addEventListener("push", (event) => {
    let payload = {};
    try {
        payload = event.data?.json() || {};
    } catch {
        payload = {};
    }
    const fecha = typeof payload.fecha === "string" ? payload.fecha : "hoy";
    event.waitUntil(
        self.registration.showNotification("Control de asistencia", {
            body: "No olvides registrar egreso.",
            tag: "recordatorio-egreso-" + fecha,
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
