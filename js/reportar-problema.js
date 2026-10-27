(function () {
"use strict";
const events=[];
const MAX=12;
const redacted=(value)=>String(value||"").slice(0,250)
 .replace(/(Bearer\s+)[\w.-]+/gi,"$1[oculto]")
 .replace(/(token|password|contrase(?:ñ|n)a|apikey|authorization|secret)\s*[=:]\s*[^\s,;&]+/gi,"$1=[oculto]")
 .replace(/https?:\/\/[^\s]*/gi,"[enlace omitido]")
 .replace(/-?\d{2}\.\d{4,}/g,"[número omitido]");
function add(tipo,msg) {
 events.push({hora:new Date().toISOString(),tipo,mensaje:redacted(msg)});
 if(events.length>MAX)events.shift();
}
const originalError=console.error.bind(console);
console.error=function(...args) {
 add("error",args.map(x=>x instanceof Error?x.name+": "+x.message:typeof x==="string"?x:"Error técnico").join(" "));
 return originalError(...args);
};
window.addEventListener("error",e=>add("error-js",e.message||"Error de JavaScript"));
window.addEventListener("unhandledrejection",e=>{
 const reason=e.reason;
 add("promesa",reason instanceof Error?reason.name+": "+reason.message:"Operación interrumpida");
});
window.registrarMensajeProblema=function(msg,esError=false){
 add(esError?"mensaje-error":"mensaje",msg);
};
document.addEventListener("DOMContentLoaded",()=>{
 const abrir=document.getElementById("abrirReporteProblema");
 const dialog=document.getElementById("dialogoReporteProblema");
 const cerrar=document.getElementById("cerrarReporteProblema");
 const form=document.getElementById("formularioReporteProblema");
 const status=document.getElementById("estadoReporteProblema");
 const etapa=form?.querySelector("[name=etapa]");
 const geoBox=document.getElementById("ubicacionReporteBox");
 const geoCheck=document.getElementById("aceptarUbicacionReporte");
 const identidad=document.getElementById("identidadReporte");
 const identidadEstado=document.getElementById("identidadReporteEstado");
 const dniInput=document.getElementById("dniProblema");
 let sesionReporte=null;
 async function actualizarIdentidad() {
   sesionReporte=null;
   if(identidad) identidad.hidden=false;
   if(dniInput){dniInput.readOnly=false;dniInput.required=true;}
   if(identidadEstado) identidadEstado.textContent="Se verificará que el DNI exista en el registro de personal.";
   const token=obtenerTokenSesion?.();
   if(!token)return;
   try {
     const device=obtenerDeviceId();
     const {data,error}=await sb.rpc("mi_estado_seguro",{p_token:token,p_device_id:device});
     if(error||!data?.ok)return;
     sesionReporte={token,device};
     if(dniInput){dniInput.value=String(data.dni||"");dniInput.readOnly=true;dniInput.required=false;}
     if(identidadEstado)identidadEstado.textContent="Identificado por sesión: "+String(data.apellido||"")+", "+String(data.nombre||"")+". El servidor verificará la sesión.";
   }catch(e){ /* Permitir informar DNI manual si la sesión ya no es válida. */ }
 }
 function actualizarGeo(){if(geoBox)geoBox.hidden=false;}
 actualizarGeo();
 if(!abrir||!dialog||!form)return;
 abrir.addEventListener("click",()=>{
  const field=form.querySelector("[name=fecha_problema]");
  if(field && !field.value) {
   const now=new Date(),local=new Date(now.getTime()-now.getTimezoneOffset()*60000);
   field.value=local.toISOString().slice(0,16);
  }
  // Si acaba de fallar el GPS, mostrar directamente la opción de diagnóstico.
  if (etapa && etapa.value === "abrir_app") {
    const reciente=events.slice(-6).some(evt =>
      ["error","mensaje-error"].includes(evt.tipo) &&
      Date.now()-new Date(evt.hora).getTime()<15*60000 &&
      /ubicaci[oó]n|localizaci[oó]n|GPS|radio permitido|precisi[oó]n/i.test(evt.mensaje)
    );
    if (reciente) etapa.value="ubicacion";
  }
  actualizarGeo();
  void actualizarIdentidad();
  if(!dialog.open)dialog.showModal();
 });
 cerrar?.addEventListener("click",()=>dialog.close());
 form.addEventListener("submit",async e=>{
  e.preventDefault();
  const send=form.querySelector("button[type=submit]");
  const data=new FormData(form);
  const formDate=new Date(String(data.get("fecha_problema")));
  if(!Number.isFinite(formDate.getTime())){status.textContent=formatearErrorControl("Elegí cuándo ocurrió el problema.");return;}
  const dniForm=String(data.get("dni")||"").replace(/\D/g,"");
  if(!sesionReporte && !/^\d{7,9}$/.test(dniForm)){
    status.textContent=formatearErrorControl("Ingresá un DNI válido (entre 7 y 9 números) para enviar el reporte.");
    return;
  }
  const payload={
   fecha_problema:formDate.toISOString(),
   etapa:String(data.get("etapa")),
   descripcion:String(data.get("descripcion")).trim(),
   dni:sesionReporte ? "" : dniForm,
   ...(sesionReporte ? {sesion_token:sesionReporte.token,device_id:sesionReporte.device}:{}),
   pagina:location.pathname.endsWith("asistencia.html")?"asistencia":
     location.pathname.endsWith("registro.html")?"registro":
     location.pathname.endsWith("bloqueado.html")?"bloqueado":"login",
   eventos:events.slice(-10)
  };
  if(!geoCheck?.checked){status.textContent=formatearErrorControl("Autorizá el almacenamiento de tu ubicación para enviar el reporte.");return;}
  payload.acepta_ubicacion=true;
  send.disabled=true;status.textContent="Obteniendo ubicación actual...";
  try{
   const position=await new Promise((resolve,reject)=>{
    if(!navigator.geolocation){reject({code:0});return;}
    navigator.geolocation.getCurrentPosition(resolve,reject,{enableHighAccuracy:false,timeout:20000,maximumAge:60000});
   });
   payload.ubicacion={latitud:position.coords.latitude,longitud:position.coords.longitude,precision:position.coords.accuracy,capturada_en:new Date().toISOString()};
   status.textContent="Enviando reporte con ubicación...";
  }catch(error){
   const code=[1,2,3].includes(Number(error?.code))?Number(error.code):0;
   const reason=code===1?"Permiso de ubicación denegado":code===2?"Ubicación no disponible":code===3?"Tiempo de espera agotado":"GPS no disponible";
   payload.diagnostico_gps={codigo:String(code)};
   payload.eventos.push({hora:new Date().toISOString(),tipo:"diagnostico-ubicacion",mensaje:reason+" (código "+code+")."});
   payload.descripcion=("Fallo automático al capturar GPS durante un reporte: "+reason+". Descripción original: "+payload.descripcion).slice(0,1500);
   payload.etapa="ubicacion";
   status.textContent="GPS falló. Enviando diagnóstico técnico automático...";
  }
  try {
   const {data:body,error:envioError}=await sb.rpc("enviar_reporte_web",{p_datos:payload});
   if(envioError||!body?.ok)throw new Error(body?.error||"No se pudo guardar el reporte. Volvé a intentar.");
   const codigoGPS = payload.diagnostico_gps?.codigo === "1" ? 5
     : payload.diagnostico_gps?.codigo === "3" ? 7 : 8;
    status.textContent=body.diagnostico_ubicacion
     ? "Reporte N.º "+body.id+" guardado. Diagnóstico de GPS (Error "+codigoGPS+"): no se pudo obtener la ubicación."
     : "Reporte N.º "+body.id+" guardado con tu ubicación actual.";
    if(body.diagnostico_ubicacion && dniForm==="35117728") {
     status.textContent+="\n\n"+GUIA_GPS_MOTOROLA_35117728;
    }
   form.reset();
   sesionReporte=null;
   actualizarGeo();
  } catch(err) {
   status.textContent=formatearErrorControl(err.message||"No se pudo enviar el reporte.");
  }finally{send.disabled=false;}
 });
});
})();