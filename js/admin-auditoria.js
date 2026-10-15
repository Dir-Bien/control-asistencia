(function () {
"use strict";
const button=document.getElementById("actualizarAuditoriaBtn");
const openBtn=document.getElementById("abrirHistorialBtn");
const closeBtn=document.getElementById("cerrarHistorialBtn");
const dialog=document.getElementById("dialogoHistorialAdmin");
const autorizado=()=>typeof adminActual!=="undefined" && Boolean(adminActual?.usuario);
const watcher=setInterval(()=>{
 if(typeof adminActual==="undefined"||!adminActual?.usuario)return;
 clearInterval(watcher);
 if(openBtn)openBtn.hidden=!autorizado();
},250);
setTimeout(()=>clearInterval(watcher),15000);
const status=document.getElementById("auditoriaMensaje");
const destination=document.getElementById("auditoriaResultados");
const filtroAccion=document.getElementById("auditoriaFiltroAccion");
const filtroAdmin=document.getElementById("auditoriaFiltroAdmin");
const filtroEmpleado=document.getElementById("auditoriaFiltroEmpleado");
let historialFilas=[];
const escapeHTML=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function when(v){try{return new Intl.DateTimeFormat("es-AR",{timeZone:"America/Argentina/Buenos_Aires",dateStyle:"short",timeStyle:"short"}).format(new Date(v))}catch{return "-"}}
function resumen(v) {
 if(!v)return "-";
 const obj={...v};
 delete obj.contrasena_hash;delete obj.password;delete obj.token;delete obj.device_hash;
 return Object.entries(obj).map(([k,val])=>k+": "+String(val??"-")).join(" · ");
}
async function cargar(){
 if(!autorizado())return;
 button.disabled=true;status.textContent="Cargando movimientos...";
 try{
  const {data,error}=await sb.rpc("admin_historial_auditoria",{p_token:obtenerAdminToken(),p_device_id:obtenerDeviceId()});
  if(error||!data?.ok)throw new Error(data?.error||"Historial aún no habilitado en Supabase.");
  const rows=data.datos||[];
  historialFilas=rows;
  const opciones=(el,lista,titulo)=>{el.innerHTML='<option value="">'+titulo+'</option>'+[...new Set(lista.filter(Boolean))].sort().map(v=>'<option value="'+escapeHTML(v)+'">'+escapeHTML(v)+'</option>').join("");};
  opciones(filtroAccion,rows.map(r=>r.accion),"Todas las acciones");
  opciones(filtroAdmin,rows.map(r=>r.usuario),"Todos los administradores");
  destination.innerHTML=rows.length
   ? '<table><thead><tr><th>Fecha</th><th>Administrador</th><th>Acción</th><th>Empleado ID</th><th>Cambios</th></tr></thead><tbody>'+
    rows.map(r=>'<tr><td>'+escapeHTML(when(r.fecha))+'</td><td>'+escapeHTML(r.usuario)+'</td><td>'+escapeHTML(r.accion)+'</td><td>'+escapeHTML(r.empleado_id)+'</td><td><details><summary>Ver detalles</summary><small>Antes: '+escapeHTML(resumen(r.anterior))+'</small><hr><small>Después: '+escapeHTML(resumen(r.nuevo))+'</small></details></td></tr>').join("")+'</tbody></table>'
   : '<p>No hay movimientos registrados todavía.</p>';
  status.textContent=rows.length+" movimiento(s) registrados.";
  aplicarFiltros();
 }catch(e){status.textContent=e.message||"No se pudo cargar el historial."}
 finally{button.disabled=false}
}
button?.addEventListener("click",cargar);
openBtn?.addEventListener("click",()=>{
 if(!autorizado()||!dialog)return;
 dialog.showModal();
 void cargar();
});
closeBtn?.addEventListener("click",()=>dialog?.close());
})();