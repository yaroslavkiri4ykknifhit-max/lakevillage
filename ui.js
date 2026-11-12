(function(){
 const header=document.querySelector('#header');
 function onScroll(){header.classList.toggle('scrolled',window.scrollY>50)}
 onScroll();window.addEventListener('scroll',onScroll,{passive:true});
 const menu=document.querySelector('#menu-toggle'),nav=document.querySelector('#mobile-nav');
 menu.addEventListener('click',()=>{const open=nav.classList.toggle('open');menu.setAttribute('aria-expanded',String(open));menu.textContent=open?'×':'☰'});
 nav.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{nav.classList.remove('open');menu.textContent='☰';menu.setAttribute('aria-expanded','false')}));
 const dialog=document.querySelector('#plan-dialog');
 document.querySelector('#open-plan').addEventListener('click',()=>dialog.showModal());
 document.querySelector('#close-plan').addEventListener('click',()=>dialog.close());
 dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close()});
 let sceneLoad;
 const loadScene=()=>sceneLoad??=import('./scene.js').catch(error=>{
   if(error.message!=='WebGL 2 unavailable')console.warn('Lake Village 3D initialization failed',error);
   const poster=document.querySelector('#tour-poster');
   poster.querySelector('span:not(.poster-icon)').textContent='3D-ПРОГУЛКА НЕДОСТУПНА';
   poster.querySelector('small').textContent='Генеральный план можно открыть кнопкой ниже.';
   const shell=document.querySelector('#tour-shell');
   shell.dataset.architecture='no-webgl';
   shell.querySelectorAll('button:not(#plan-mode)').forEach(button=>{button.disabled=true;});
   shell.querySelector('#plan-mode').addEventListener('click',()=>dialog.showModal());
 });
 const explore=document.querySelector('#explore');
 const observer=new IntersectionObserver(([entry])=>{
   if(entry.isIntersecting){observer.disconnect();void loadScene();}
 },{rootMargin:'450px'});
 observer.observe(explore);
 document.querySelectorAll('[data-go]').forEach(b=>b.addEventListener('click',async()=>{
   document.querySelector('#explore').scrollIntoView({behavior:'smooth'});
   const id=b.dataset.go;
   await loadScene();
   if(window.LakeVillageTour)window.LakeVillageTour.focus(id);
   else if(!dialog.open)dialog.showModal();
 }));
})();