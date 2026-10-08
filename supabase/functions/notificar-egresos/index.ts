import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const projectUrl = Deno.env.get("SUPABASE_URL");
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const vapidPublic = Deno.env.get("VAPID_PUBLIC_KEY");
const vapidPrivate = Deno.env.get("VAPID_PRIVATE_KEY");
const cronSecret = Deno.env.get("CRON_SECRET");

function horaArgentina() {
    const partes = new Intl.DateTimeFormat("en-GB", {
        timeZone: "America/Argentina/Buenos_Aires",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23"
    }).formatToParts(new Date());
    const datos: Record<string, string> = {};
    for (const parte of partes) datos[parte.type] = parte.value;
    return {
        fecha: `${datos.year}-${datos.month}-${datos.day}`,
        hora: Number(datos.hour),
        minuto: Number(datos.minute)
    };
}

Deno.serve(async (request: Request) => {
    if (request.method !== "POST" ||
        !cronSecret ||
        request.headers.get("x-cron-secret") !== cronSecret) {
        return Response.json({ ok: false, error: "No autorizado" }, { status: 401 });
    }

    if (!projectUrl || !serviceKey || !vapidPublic || !vapidPrivate) {
        return Response.json({ ok: false, error: "Configuración de Push incompleta" }, { status: 503 });
    }

    const ahora = horaArgentina();
    if (!((ahora.hora === 13 || ahora.hora === 18) && ahora.minuto <= 15)) {
        return Response.json({ ok: true, enviados: 0, mensaje: "Fuera de horario" });
    }

    const turno = ahora.hora === 13 ? "MANANA" : "TARDE";
    const db = createClient(projectUrl, serviceKey, {
        auth: { persistSession: false }
    });
    webpush.setVapidDetails("https://dir-bien.github.io", vapidPublic, vapidPrivate);

    try {
        const { data: pendientes, error } = await db
            .from("asistencias")
            .select("id,empleado_id")
            .eq("fecha", ahora.fecha)
            .eq("turno", turno)
            .not("entrada", "is", null)
            .is("salida", null)
            .is("notificacion_egreso_en", null);
        if (error) throw error;
        if (!pendientes?.length) return Response.json({ ok: true, enviados: 0 });

        const ids = pendientes.map(item => item.empleado_id);
        const [subs, emps] = await Promise.all([
            db.from("push_suscripciones")
                .select("empleado_id,endpoint,p256dh,auth,device_hash")
                .in("empleado_id", ids),
            db.from("empleados")
                .select("id,activo,device_hash")
                .in("id", ids)
        ]);
        if (subs.error) throw subs.error;
        if (emps.error) throw emps.error;

        const subsMap = new Map((subs.data || []).map(x => [x.empleado_id, x]));
        const empsMap = new Map((emps.data || []).map(x => [x.id, x]));
        let enviados = 0, fallidos = 0;

        for (const pendiente of pendientes) {
            const sub = subsMap.get(pendiente.empleado_id);
            const emp = empsMap.get(pendiente.empleado_id);
            if (!sub || !emp?.activo || !emp.device_hash ||
                sub.device_hash !== emp.device_hash) continue;

            const marca = new Date().toISOString();
            const { data: reservado, error: reservaError } = await db
                .from("asistencias")
                .update({ notificacion_egreso_en: marca })
                .eq("id", pendiente.id)
                .is("salida", null)
                .is("notificacion_egreso_en", null)
                .select("id")
                .maybeSingle();
            if (reservaError || !reservado) continue;

            try {
                await webpush.sendNotification({
                    endpoint: sub.endpoint,
                    keys: { p256dh: sub.p256dh, auth: sub.auth }
                }, JSON.stringify({
                    fecha: ahora.fecha,
                    body: "No olvides registrar egreso."
                }), { TTL: 900 });
                enviados++;
            } catch (err) {
                fallidos++;
                console.error("Error enviando Web Push", err);
                const status = (err as {statusCode?:number}).statusCode;
                if (status === 404 || status === 410) {
                    await db.from("push_suscripciones")
                        .delete().eq("empleado_id", pendiente.empleado_id)
                        .eq("endpoint", sub.endpoint);
                } else {
                    await db.from("asistencias")
                        .update({ notificacion_egreso_en: null })
                        .eq("id", pendiente.id)
                        .eq("notificacion_egreso_en", marca);
                }
            }
        }
        return Response.json({ ok: true, turno, enviados, fallidos });
    } catch (err) {
        console.error("Error enviando recordatorios", err);
        return Response.json({ ok: false, error: "No se pudo procesar el envío." }, { status: 500 });
    }
});
