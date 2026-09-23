import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function sha256(text: string) {
  const bytes = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function normalizarApellido(apellido: string) {
  return apellido
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toUpperCase()
    .replace(/[^A-Z]/g, "");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Método no permitido" }, 405);
  }

  try {
    const { dni, clave_inicial, password, device_id } = await req.json();

    const dniLimpio = String(dni ?? "").replace(/\D/g, "");
    const claveInicial = String(clave_inicial ?? "").trim().toUpperCase();
    const passwordFinal = String(password ?? "");
    const deviceId = String(device_id ?? "").trim();

    if (!/^\d{7,9}$/.test(dniLimpio)) {
      return json({ error: "DNI inválido" }, 400);
    }

    if (passwordFinal.length < 6) {
      return json({ error: "La contraseña/PIN debe tener al menos 6 caracteres" }, 400);
    }

    if (deviceId.length < 20) {
      return json({ error: "Dispositivo inválido" }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { data: empleado, error: empError } = await admin
      .from("empleados")
      .select("id,dni,nombre,apellido,grado,activo,auth_user_id")
      .eq("dni", dniLimpio)
      .maybeSingle();

    if (empError) {
      console.error(empError);
      return json({ error: "No se pudo validar el empleado" }, 500);
    }

    if (!empleado || !empleado.activo) {
      return json({ error: "DNI no autorizado" }, 403);
    }

    if (empleado.auth_user_id) {
      return json({ error: "Este DNI ya fue registrado" }, 409);
    }

    const apellidoNorm = normalizarApellido(empleado.apellido);
    const claveEsperada =
      apellidoNorm.slice(0, 3) + dniLimpio.slice(-3);

    if (claveInicial !== claveEsperada) {
      return json({ error: "Clave inicial incorrecta" }, 403);
    }

    const deviceHash = await sha256(deviceId);

    // Email técnico interno. No se muestra al empleado.
    const emailTecnico = `${dniLimpio}@asistencia.local`;

    const { data: authData, error: authError } =
      await admin.auth.admin.createUser({
        email: emailTecnico,
        password: passwordFinal,
        email_confirm: true,
        user_metadata: {
          dni: dniLimpio,
          nombre: empleado.nombre,
          apellido: empleado.apellido,
          grado: empleado.grado,
        },
      });

    if (authError || !authData.user) {
      console.error(authError);
      return json({ error: "No se pudo crear la cuenta" }, 500);
    }

    const userId = authData.user.id;

    const { error: updateError } = await admin
      .from("empleados")
      .update({
        auth_user_id: userId,
        device_hash: deviceHash,
        actualizado_en: new Date().toISOString(),
      })
      .eq("id", empleado.id)
      .is("auth_user_id", null);

    if (updateError) {
      console.error(updateError);
      await admin.auth.admin.deleteUser(userId);
      return json({ error: "No se pudo vincular el empleado" }, 500);
    }

    return json({
      ok: true,
      nombre: empleado.nombre,
      mensaje: "Cuenta creada correctamente",
    });
  } catch (e) {
    console.error(e);
    return json({ error: "Error interno" }, 500);
  }
});
