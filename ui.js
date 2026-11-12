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
 window.setTimeout(()=>{if(!window.lakeSceneReady){const p=document.querySelector('#tour-poster');if(p){p.querySelector('span:not(.poster-icon)').textContent='3D-ПРОГУЛКА ДОСТУПНА ОНЛАЙН';p.querySelector('small').textContent='Откройте сайт через интернет или посмотрите генеральный план ниже.';}}},8500);
 document.querySelectorAll('[data-go]').forEach(b=>b.addEventListener('click',()=>{
   document.querySelector('#explore').scrollIntoView({behavior:'smooth'});
   const id=b.dataset.go;
   setTimeout(()=>window.LakeVillageTour?.focus(id),550);
 }));
})();