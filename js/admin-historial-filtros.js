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

const labels={departamento_id:"Departamento",dni:"DNI",grado:"Grado",apellido:"Apellido",nombre:"Nombre",activo:"Estado",entrada:"Hora de ingreso",salida:"Hora de egreso",turno:"Turno",asistencia_id:"N.º de asistencia"};
const actions={CREAR_INGRESO_MANUAL:"Registró un ingreso manual",ANULAR_INGRESO_MANUAL:"Anuló un ingreso manual",CREAR_PERSONAL:"Dio de alta a un empleado",EDITAR_PERSONAL:"Modificó los datos de un empleado",DESACTIVAR_PERSONAL:"Desactivó a un empleado",RESETEAR_DISPOSITIVO:"Restableció el dispositivo"};
function department(id){
 if(id===null||id===undefined||id==="")return "Sin departamento";
 const all=Array.isArray(adminActual?.departamentos)?adminActual.departamentos:[];
 return all.find(d=>String(d.id)===String(id))?.nombre||"Departamento no disponible (ID "+id+")";
}
function value(k,v){
 if(v===null||v===undefined||v==="")return "Sin dato";
 if(k==="departamento_id")return department(v);
 if(k==="activo")return v===true||v==="true"?"Activo":"Inactivo";
 if(k==="turno")return v==="MANANA"?"Mañana":v==="TARDE"?"Tarde":String(v);
 if(k==="entrada"||k==="salida")return date(v);
 return typeof v==="object"?JSON.stringify(v):String(v);
}
function changedRow(k,oldV,newV,created){
 return '<div class="audit-cambio"><span class="audit-campo">'+esc(labels[k]||readable(k))+'</span>'+
 (created?'':'<span class="audit-anterior">'+esc(value(k,oldV))+'</span><span class="audit-flecha">→</span>')+
 '<strong class="audit-nuevo">'+esc(value(k,newV))+'</strong></div>';
}
function details(r){
 const before=r.anterior&&typeof r.anterior==="object"?r.anterior:{};
 const after=r.nuevo&&typeof r.nuevo==="object"?r.nuevo:{};
 const title=actions[r.accion]||readable(r.accion);
 const head='<div class="audit-accion"><strong>'+esc(title)+'</strong><span>Administrador: '+esc(r.usuario||"-")+' · '+esc(date(r.fecha))+'</span></div>'+
 '<p class="audit-persona">Personal: <strong>'+esc([r.empleado_grado,r.empleado_nombre].filter(Boolean).join(" ")||"ID "+r.empleado_id)+'</strong> · DNI '+esc(r.empleado_dni||"-")+'</p>';
 if(r.accion==="CREAR_INGRESO_MANUAL"||r.accion==="ANULAR_INGRESO_MANUAL"){
   const m=r.accion==="CREAR_INGRESO_MANUAL"?after:before;
   return head+'<div class="audit-lista">'+
      changedRow("entrada",null,m.entrada||r.ingreso,true)+
      changedRow("turno",null,m.turno||r.turno,true)+
      (m.asistencia_id?changedRow("asistencia_id",null,m.asistencia_id,true):"")+'</div>';
 }
 const isNew=r.accion==="CREAR_PERSONAL";
 const keys=[...new Set([...Object.keys(before),...Object.keys(after)])]
   .filter(k=>!/(password|contrasena|contraseña|token|secret|device_hash)/i.test(k)&&k!=="id");
 const modified=keys.filter(k=>isNew?Object.hasOwn(after,k):JSON.stringify(before[k]??null)!==JSON.stringify(after[k]??null));
 return head+'<p class="audit-cantidad">'+(isNew?"Datos del alta":"Campos modificados: "+modified.length)+'</p><div class="audit-lista">'+
   (modified.length?modified.map(k=>changedRow(k,before[k],after[k],isNew)).join(""):"<p>No se registraron diferencias entre los valores auditados.</p>")+'</div>';
}

function render(){
 const q=person.value.trim().toLocaleLowerCase("es-AR");
 const filtered=entries.filter(r=>(!action.value||r.accion===action.value)&&(!admin.value||r.usuario===admin.value)&&(!q||[r.empleado_id,r.empleado_nombre,r.empleado_dni,r.empleado_grado,r.anterior?.apellido,r.anterior?.nombre,r.anterior?.dni,r.nuevo?.apellido,r.nuevo?.nombre,r.nuevo?.dni].some(x=>String(x??"").toLocaleLowerCase("es-AR").includes(q))));
 table.innerHTML=filtered.length?'<table><thead><tr><th>Fecha del movimiento</th><th>Administrador</th><th>Acción</th><th>Personal afectado</th><th>Hora del ingreso</th><th>Detalle</th></tr></thead><tbody>'+filtered.map(r=>{
 const nombre=r.empleado_nombre||[r.nuevo?.apellido||r.anterior?.apellido,r.nuevo?.nombre||r.anterior?.nombre].filter(Boolean).join(" ");
 const grado=r.empleado_grado||r.nuevo?.grado||r.anterior?.grado||"-";
 const dni=r.empleado_dni||r.nuevo?.dni||r.anterior?.dni||"-";
 const hora=r.ingreso||r.nuevo?.entrada||r.anterior?.entrada;
 return '<tr><td>'+esc(date(r.fecha))+'</td><td><strong>'+esc(r.usuario)+'</strong></td><td>'+esc(readable(r.accion))+'</td><td><strong>'+esc([grado,nombre].filter(Boolean).join(" "))+'</strong><small style="display:block;color:#667085">DNI '+esc(dni)+' · ID '+esc(r.empleado_id)+'</small></td><td>'+esc(hora?date(hora):"-")+'</td><td><details class="audit-detalle"><summary>Ver cambios</summary>'+details(r)+'</details></td></tr>';
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