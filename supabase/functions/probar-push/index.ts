import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const cors = {
  "Access-Control-Allow-Origin": "https://dir-bien.github.io",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type, apikey",
  "Content-Type": "application/json"
};

const json = (obj: unknown, status = 200) =>
  Response.json(obj, {status,headers:cors});

async function sha256(value: string) {
  const buf = await crypto.subtle.digest(
    "SHA-256", new TextEncoder().encode(value)
  );
  return Array.from(new Uint8Array(buf), b => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async request => {
  if (request.method === "OPTIONS") return new Response(null, {status:204,headers:cors});
  if (request.method !== "POST" ||
      request.headers.get("origin") !== "https://dir-bien.github.io") {
    return json({ok:false,error:"No autorizado."}, 403);
  }

  const url = Deno.env.get("SUPABASE_URL");
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const vapidPublic = Deno.env.get("VAPID_PUBLIC_KEY");
  const vapidPrivate = Deno.env.get("VAPID_PRIVATE_KEY");
  if (!url || !service || !vapidPublic || !vapidPrivate) {
    return json({ok:false,error:"Servicio no configurado."},503);
  }

  try {
    const body = await request.json();
    const token = String(body.token || "");
    const device = String(body.device_id || "");
    if (!/^[0-9a-f]{64}$/.test(token) || !/^[0-9a-f]{64}$/.test(device)) {
      return json({ok:false,error:"Sesión inválida."},401);
    }

    const db = createClient(url, service, {auth:{persistSession:false}});
    const tokenHash = await sha256(token);
    const deviceHash = await sha256(device);

    const {data:sesion,error:sesError} = await db.from("sesiones")
      .select("empleado_id,device_hash")
      .eq("token_hash", tokenHash)
      .eq("activa",true)
      .maybeSingle();

    if (sesError || !sesion || sesion.device_hash !== deviceHash) {
      return json({ok:false,error:"Sesión o dispositivo inválido."},401);
    }

    const {data:empleado,error:empError} = await db.from("empleados")
      .select("activo,device_hash")
      .eq("id",sesion.empleado_id)
      .maybeSingle();

    if (empError || !empleado?.activo || empleado.device_hash !== deviceHash) {
      return json({ok:false,error:"Dispositivo no autorizado."},401);
    }

    const {data:sub,error:subError} = await db.from("push_suscripciones")
      .select("endpoint,p256dh,auth,device_hash,ultimo_test_en")
      .eq("empleado_id",sesion.empleado_id)
      .maybeSingle();

    if (subError || !sub || sub.device_hash !== deviceHash) {
      return json({ok:false,error:"Primero activá los recordatorios en el celular."},400);
    }

    const ultima = sub.ultimo_test_en ? Date.parse(sub.ultimo_test_en) : 0;
    const ahora = Date.now();
    if (ahora - ultima < 120000) {
      return json({ok:false,error:"Esperá 2 minutos antes de repetir la prueba."},429);
    }

    const {error:rateError} = await db.from("push_suscripciones")
      .update({ultimo_test_en: new Date(ahora).toISOString()})
      .eq("empleado_id",sesion.empleado_id);
    if (rateError) throw rateError;

    webpush.setVapidDetails("https://dir-bien.github.io",vapidPublic,vapidPrivate);

    await webpush.sendNotification({
      endpoint: sub.endpoint,
      keys: {p256dh:sub.p256dh,auth:sub.auth}
    },JSON.stringify({
      body:"Prueba correcta: las notificaciones están activadas.",
      fecha:"prueba"
    }),{TTL:90});

    return json({ok:true,mensaje:"Enviamos la notificación de prueba al teléfono."});
  } catch (error) {
    console.error("Error en prueba Push:",error);
    return json({ok:false,error:"No se pudo enviar el Push de prueba. Consultá a Informática."},500);
  }
});
