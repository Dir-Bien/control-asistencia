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
  if(index===1 && typeof cargarEmpleados==="function") void cargarEmpleados();
}
nav.forEach(btn=>btn.addEventListener("click",()=>cambiar(Number(btn.dataset.vista))));
// La carga manual se habilitará únicamente después de validar permisos en Supabase.
manual.disabled=true;
manual.title="Pendiente de activación segura para tjustet";
cambiar(0);
})();