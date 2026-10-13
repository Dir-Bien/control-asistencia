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
 if(!abrir||!dialog||!form)return;
 abrir.addEventListener("click",()=>{
  const field=form.querySelector("[name=fecha_problema]");
  if(field && !field.value) {
   const now=new Date(),local=new Date(now.getTime()-now.getTimezoneOffset()*60000);
   field.value=local.toISOString().slice(0,16);
  }
  if(!dialog.open)dialog.showModal();
 });
 cerrar?.addEventListener("click",()=>dialog.close());
 form.addEventListener("submit",async e=>{
  e.preventDefault();
  const send=form.querySelector("button[type=submit]");
  const data=new FormData(form);
  const formDate=new Date(String(data.get("fecha_problema")));
  if(!Number.isFinite(formDate.getTime())){status.textContent="Elegí cuándo ocurrió el problema.";return;}
  const payload={
   fecha_problema:formDate.toISOString(),
   etapa:String(data.get("etapa")),
   descripcion:String(data.get("descripcion")).trim(),
   dni:String(data.get("dni")||"").replace(/\D/g,""),
   pagina:location.pathname.endsWith("asistencia.html")?"asistencia":
     location.pathname.endsWith("registro.html")?"registro":
     location.pathname.endsWith("bloqueado.html")?"bloqueado":"login",
   eventos:events.slice()
  };
  send.disabled=true;status.textContent="Enviando reporte...";
  try {
   const res=await fetch(SUPABASE_URL+"/functions/v1/reportar-problema",{
    method:"POST",headers:{"Content-Type":"application/json","apikey":SUPABASE_PUBLIC_KEY},
    body:JSON.stringify(payload)
   });
   const body=await res.json();
   if(!res.ok||!body?.ok)throw new Error(body?.error||"No se pudo registrar el problema.");
   status.textContent="Reporte guardado correctamente. Número: "+body.id;
   form.reset();
  } catch(err) {
   status.textContent=err.message||"No se pudo enviar el reporte.";
  }finally{send.disabled=false;}
 });
});
})();