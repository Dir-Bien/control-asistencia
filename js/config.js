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
        guardarRespaldoDeviceId(device);

    }


    return device;

}


// Respaldo del identificador del mismo navegador (no sincroniza dispositivos).
// Si Safari/Chrome pierde solo localStorage, IndexedDB puede permitir recuperarlo.
// Nunca se crea ni se cambia una vinculación en el servidor con este procedimiento.
function respaldoDeviceId() {
    return new Promise(resolve => {
        if (!("indexedDB" in window)) { resolve(null); return; }
        let completado=false;
        const terminar=valor=>{if(!completado){completado=true;resolve(valor);}};
        try {
            const open=indexedDB.open("asistencia_dispositivo_local",1);
            open.onupgradeneeded=()=>{if(!open.result.objectStoreNames.contains("datos"))open.result.createObjectStore("datos");};
            open.onerror=()=>terminar(null);
            open.onblocked=()=>terminar(null);
            open.onsuccess=()=>{
                const db=open.result;
                try {
                    const tx=db.transaction("datos","readonly");
                    const req=tx.objectStore("datos").get("id");
                    req.onsuccess=()=>{const v=req.result;db.close();terminar(typeof v==="string"&&/^[a-f0-9]{64}$/.test(v)?v:null);};
                    req.onerror=()=>{db.close();terminar(null);};
                }catch(_){db.close();terminar(null);}
            };
        }catch(_){terminar(null);}
    });
}
function guardarRespaldoDeviceId(device) {
    if (!/^[a-f0-9]{64}$/.test(device)||!("indexedDB" in window)) return;
    try {
        const open=indexedDB.open("asistencia_dispositivo_local",1);
        open.onupgradeneeded=()=>{if(!open.result.objectStoreNames.contains("datos"))open.result.createObjectStore("datos");};
        open.onsuccess=()=>{
            const db=open.result;
            try {
                const tx=db.transaction("datos","readwrite");
                tx.objectStore("datos").put(device,"id");
                tx.oncomplete=()=>db.close();
                tx.onerror=()=>db.close();
            }catch(_){db.close();}
        };
    }catch(_){}
}
async function prepararDeviceId() {
    const actual=localStorage.getItem("asistencia_device");
    if (actual && /^[a-f0-9]{64}$/.test(actual)) {
        guardarRespaldoDeviceId(actual);
        return actual;
    }
    const recuperado=await respaldoDeviceId();
    if (recuperado) {
        localStorage.setItem("asistencia_device",recuperado);
        return recuperado;
    }
    return obtenerDeviceId();
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
                                    ( /Android/i.test(navigator.userAgent || "")
                                        ? (/MiuiBrowser|XiaoMi\/MiuiBrowser/i.test(navigator.userAgent || "")
                                            ? "Mi Browser bloqueó la ubicación. Revisá dos permisos: 1) Xiaomi → Ajustes → Ubicación → Permisos de aplicaciones → Mi Browser: elegí Permitir mientras se usa (no Solo esta vez) y Ubicación precisa. 2) Mi Browser → Perfil → Ajustes → Protección de privacidad → Acceder a la ubicación: Preguntar o Permitir. Autorizá este sitio y volvé a intentar. Los nombres pueden variar según MIUI."
                                            : "La ubicación está bloqueada. En Android, abrí Ajustes → Ubicación → Permisos de aplicaciones → tu navegador, permití la ubicación precisa mientras se usa. Revisá también los permisos de ubicación de este sitio dentro del navegador.")
                                        : /iPhone|iPad|iPod/i.test(navigator.userAgent || "")
                                            ? "La ubicación está bloqueada. En iPhone, abrí Ajustes → Privacidad y seguridad → Localización, habilitá el permiso de Safari y Ubicación precisa. Volvé a intentar."
                                            : "La ubicación está bloqueada. Activá el permiso de ubicación para este sitio en los ajustes del navegador y volvé a intentar." )
                                )
                            );

                        } else if (error.code === 3) {

                            reject(new Error(
                                "El GPS tardó demasiado en responder. Activá la ubicación precisa, acercate a una ventana y volvé a intentar."
                            ));

                        } else {

                            reject(new Error(
                                "No se pudo determinar tu ubicación. Comprobá que la localización esté activada, tengas señal y volvé a intentar."
                            ));

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
function esCelular() {

    if (
        navigator.userAgentData
        &&
        typeof navigator.userAgentData.mobile
            === "boolean"
    ) {

        return navigator
            .userAgentData
            .mobile;

    }


    const userAgent =
        navigator.userAgent
        || "";


    return /Android|iPhone|iPod|Mobile/i
        .test(
            userAgent
        );

}


function bloquearPC() {

    if (!esCelular()) {

        window.location.replace(
            "bloqueado.html"
        );

        return true;

    }


    return false;

}


// El navegador integrado de Google en iOS puede impedir WebAuthn.
// No usarlo para vincular un dispositivo al sistema de asistencia.
function navegadorIntegradoProblematico() {
    const agente = navigator.userAgent || "";
    return /\bGSA\//i.test(agente) && /iPhone|iPad|iPod/i.test(agente);
}

function explicarErrorWebAuthn(error) {
    if (navegadorIntegradoProblematico()) {
        return "La verificación falló dentro de la aplicación de Google. Abrí el enlace directamente en Safari. Si ya vinculaste tu cuenta en Google, pedí al administrador restablecer el dispositivo para vincularla en Safari.";
    }
    if (error?.name === "NotAllowedError") {
        const iphone = /iPhone|iPad|iPod/i.test(navigator.userAgent || "");
        return iphone
            ? "El teléfono no autorizó Face ID o la verificación segura. Si cancelaste, volvé a intentarlo. Abrí la página directamente en Safari y comprobá que Face ID o el código estén configurados."
            : "El teléfono no autorizó la verificación biométrica o el PIN. Si cancelaste, volvé a intentarlo. Comprobá que la seguridad de pantalla esté activada y abrí la página directamente en tu navegador.";
    }
    return String(error?.message || "No se pudo completar la verificación de identidad.");
}

function explicarErrorUbicacion(error) {
    const mensaje = String(error?.message || "No se pudo comprobar la ubicación.");
    if (/fuera (?:del radio permitido|de las zonas permitidas)|dentro de una zona permitida/i.test(mensaje)) {
        return mensaje + " Si estás en una de las dos sedes, activá Ubicación precisa, esperá unos segundos al aire libre o cerca de una ventana y volvé a intentar. El GPS puede mostrarte fuera del radio aunque estés físicamente adentro.";
    }
    return mensaje;
}
