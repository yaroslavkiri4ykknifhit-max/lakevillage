const header=document.querySelector('#header');
function updateHeader() {
  header.classList.toggle('scrolled',window.scrollY>50);
}
updateHeader();
window.addEventListener('scroll',updateHeader,{passive:true});

const menu=document.querySelector('#menu-toggle');
const nav=document.querySelector('#mobile-nav');
function setMenu(open) {
  nav.classList.toggle('open',open);
  menu.setAttribute('aria-expanded',String(open));
  menu.setAttribute('aria-label',open?'Закрыть меню':'Открыть меню');
  menu.textContent=open?'×':'☰';
}
menu.addEventListener('click',()=>setMenu(!nav.classList.contains('open')));
nav.addEventListener('click',event=>{if(event.target.closest('a'))setMenu(false);});
document.addEventListener('keydown',event=>{
  if(event.key==='Escape'&&nav.classList.contains('open')){
    setMenu(false);
    menu.focus();
  }
});

const dialog=document.querySelector('#plan-dialog');
document.querySelector('#open-plan').addEventListener('click',()=>dialog.showModal());
document.querySelector('#close-plan').addEventListener('click',()=>dialog.close());
dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close();});

const shell=document.querySelector('#tour-shell');
const canvas=document.querySelector('#lake-canvas');
const poster=document.querySelector('#tour-poster');
const launch=document.querySelector('#launch-tour');
const status=document.querySelector('#tour-status');
let sceneLoad;

function showFallback(state,message) {
  shell.dataset.architecture=state;
  status.textContent=message;
  poster.classList.remove('is-ready');
  poster.inert=false;
  launch.hidden=true;
}
function loadScene() {
  if(sceneLoad)return sceneLoad;
  shell.dataset.architecture='loading';
  status.textContent='Загружаем 3D-тур…';
  launch.disabled=true;
  sceneLoad=import('./scene.js?v=investor1').catch(error=>{
    const unsupported=error.message==='WebGL 2 unavailable';
    if(!unsupported)console.warn('Lake Village 3D initialization failed',error);
    showFallback(unsupported?'no-webgl':'error','3D-тур недоступен на этом устройстве');
  });
  return sceneLoad;
}
launch.disabled=false;
launch.addEventListener('click',loadScene);
canvas.addEventListener('webglcontextlost',()=>showFallback('error','3D-тур прерван. Обновите страницу для повторного запуска.'));

document.querySelectorAll('[data-go]').forEach(link=>link.addEventListener('click',async event=>{
  if(event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
  await loadScene();
  if(shell.dataset.architecture!=='error')window.LakeVillageTour?.focus(link.dataset.go);
}));
