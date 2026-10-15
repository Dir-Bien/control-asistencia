(() => {
"use strict";
const $=id=>document.getElementById(id);
const action=$("auditoriaFiltroAccion"), admin=$("auditoriaFiltroAdmin"), person=$("auditoriaFiltroEmpleado");
const table=$("auditoriaResultados"), status=$("auditoriaMensaje"), refresh=$("actualizarAuditoriaBtn");
const esc=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
let entries=[];
const date=x=>{const d=new Date(x);return Number.isFinite(d.getTime())?new Intl.DateTimeFormat("es-AR",{dateStyle:"short",timeStyle:"short",timeZone:"America/Argentina/Buenos_Aires"}).format(d):"-";};
const readable=x=>String(x||"").replaceAll("_"," ").toLowerCase().replace(/^./,a=>a.toUpperCase());
const summary=x=>Object.entries(x||{}).filter(([k])=>!/(contrasena|contraseña|password|token|device_hash)/i.test(k)).map(([k,v])=>esc(k)+": "+esc(v)).join(" · ")||"Sin datos";
function render(){
 const q=person.value.trim().toLocaleLowerCase("es-AR");
 const filtered=entries.filter(r=>(!action.value||r.accion===action.value)&&(!admin.value||r.usuario===admin.value)&&(!q||[r.empleado_id,r.empleado_nombre,r.empleado_dni,r.empleado_grado,r.anterior?.apellido,r.anterior?.nombre,r.anterior?.dni,r.nuevo?.apellido,r.nuevo?.nombre,r.nuevo?.dni].some(x=>String(x??"").toLocaleLowerCase("es-AR").includes(q))));
 table.innerHTML=filtered.length?'<table><thead><tr><th>Fecha del movimiento</th><th>Administrador</th><th>Acción</th><th>Personal afectado</th><th>Hora del ingreso</th><th>Detalle</th></tr></thead><tbody>'+filtered.map(r=>{
 const nombre=r.empleado_nombre||[r.nuevo?.apellido||r.anterior?.apellido,r.nuevo?.nombre||r.anterior?.nombre].filter(Boolean).join(" ");
 const grado=r.empleado_grado||r.nuevo?.grado||r.anterior?.grado||"-";
 const dni=r.empleado_dni||r.nuevo?.dni||r.anterior?.dni||"-";
 const hora=r.ingreso||r.nuevo?.entrada||r.anterior?.entrada;
 return '<tr><td>'+esc(date(r.fecha))+'</td><td><strong>'+esc(r.usuario)+'</strong></td><td>'+esc(readable(r.accion))+'</td><td><strong>'+esc([grado,nombre].filter(Boolean).join(" "))+'</strong><small style="display:block;color:#667085">DNI '+esc(dni)+' · ID '+esc(r.empleado_id)+'</small></td><td>'+esc(hora?date(hora):"-")+'</td><td><details><summary>Ver cambios</summary><p><strong>Antes:</strong> '+summary(r.anterior)+'</p><p><strong>Después:</strong> '+summary(r.nuevo)+'</p></details></td></tr>';
 }).join("")+'</tbody></table>':'<p>No hay movimientos que coincidan con los filtros.</p>';
 status.textContent="Mostrando "+filtered.length+" de "+entries.length+" movimientos.";
}
function choices(el,items,label){const keep=el.value;el.innerHTML='<option value="">'+label+'</option>'+[...new Set(items.filter(Boolean))].sort().map(v=>'<option value="'+esc(v)+'">'+esc(readable(v))+'</option>').join("");el.value=keep;}
async function load(){
 if(typeof adminActual==="undefined"||!adminActual?.usuario)return;
 refresh.disabled=true;status.textContent="Cargando movimientos...";
 try{
  const {data,error}=await sb.rpc("admin_historial_auditoria",{p_token:obtenerAdminToken(),p_device_id:obtenerDeviceId()});
  if(error||!data?.ok)throw new Error(data?.error||"No se pudo consultar el historial.");
  entries=Array.isArray(data.datos)?data.datos:[];
  choices(action,entries.map(x=>x.accion),"Todas las acciones");
  choices(admin,entries.map(x=>x.usuario),"Todos los administradores");
  render();
 }catch(e){status.textContent=String(e.message||"Error al cargar historial.");}
 finally{refresh.disabled=false;}
}
window.adminHistorialCargar=load;
refresh.addEventListener("click",load);
action.addEventListener("change",render);admin.addEventListener("change",render);person.addEventListener("input",render);
$("auditoriaLimpiar").addEventListener("click",()=>{action.value="";admin.value="";person.value="";render();});
})();