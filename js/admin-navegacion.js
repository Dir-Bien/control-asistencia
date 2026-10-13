(function(){
"use strict";
const nav=[...document.querySelectorAll(".admin-nav-btn")];
const track=document.getElementById("adminCarril");
const views=[...document.querySelectorAll(".admin-vista")];
const manual=document.getElementById("manualTabBtn");
function cambiar(index){
  if(index===2 && manual.disabled)return;
  nav.forEach((b,i)=>{b.classList.toggle("seleccionado",i===index);b.setAttribute("aria-current",i===index?"page":"false");});
  views.forEach((v,i)=>{v.setAttribute("aria-hidden",i===index?"false":"true");v.inert=i!==index;});
  track.style.setProperty("--vista-activa",String(index));
}
nav.forEach(btn=>btn.addEventListener("click",()=>cambiar(Number(btn.dataset.vista))));
const permiso=setInterval(()=>{
  if(typeof adminActual==="undefined"||!adminActual)return;
  clearInterval(permiso);
  // La sección queda bloqueada hasta que el servidor confirme los permisos.
  manual.disabled=true;
  manual.title="Carga manual temporalmente deshabilitada hasta validar permisos en Supabase";
},200);
setTimeout(()=>clearInterval(permiso),15000);
cambiar(0);
})();