const menuButton = document.querySelector('.menu-toggle');
const mobileNav = document.querySelector('#mobile-nav');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const closeMenu = () => {menuButton.setAttribute('aria-expanded', 'false');menuButton.setAttribute('aria-label','Abrir menu');mobileNav.hidden=true;};
menuButton.addEventListener('click',()=>{const open=menuButton.getAttribute('aria-expanded')!=='true';menuButton.setAttribute('aria-expanded',String(open));menuButton.setAttribute('aria-label',open?'Fechar menu':'Abrir menu');mobileNav.hidden=!open;});
mobileNav.querySelectorAll('a').forEach(link=>link.addEventListener('click',closeMenu));
document.addEventListener('keydown',event=>{if(event.key==='Escape')closeMenu();});
window.matchMedia('(min-width:621px)').addEventListener('change',event=>{if(event.matches)closeMenu();});
document.addEventListener('click',event=>{if(!event.target.closest('.header'))closeMenu();});

if('IntersectionObserver' in window){
  const links=[...document.querySelectorAll('.desktop-nav a')];
  const sections=links.map(link=>document.querySelector(link.getAttribute('href'))).filter(Boolean);
  const navigationObserver=new IntersectionObserver(entries=>{for(const entry of entries){if(entry.isIntersecting){links.forEach(link=>{const active=link.getAttribute('href')==='#'+entry.target.id;link.classList.toggle('active',active);if(active)link.setAttribute('aria-current','location');else link.removeAttribute('aria-current');});}}},{rootMargin:'-12% 0px -58% 0px',threshold:0});
  sections.forEach(section=>navigationObserver.observe(section));
  if(!reduceMotion.matches){
    const observer=new IntersectionObserver(entries=>{for(const entry of entries){if(entry.isIntersecting){entry.target.classList.add('visible');observer.unobserve(entry.target);}}},{rootMargin:'0px 0px 35px 0px',threshold:0.06});
    document.querySelectorAll('[data-reveal]').forEach(element=>observer.observe(element));
    document.documentElement.classList.add('js-motion');
    reduceMotion.addEventListener('change',event=>{if(event.matches){document.documentElement.classList.remove('js-motion');observer.disconnect();}});
  }
}
const progress=document.querySelector('.reading-progress');
let framePending=false;
function updateProgress(){const available=document.documentElement.scrollHeight-window.innerHeight;progress.style.width=(available>0?window.scrollY/available*100:0)+'%';framePending=false;}
window.addEventListener('scroll',()=>{if(!framePending){framePending=true;requestAnimationFrame(updateProgress);}},{passive:true});
window.addEventListener('resize',updateProgress);updateProgress();

const shelf=document.querySelector('.bookshelf');
const track=document.querySelector('#book-track');
const previous=document.querySelector('#books-prev');
const next=document.querySelector('#books-next');
const toggle=document.querySelector('#show-all-books');
const position=document.querySelector('.shelf-position');
const bookCount=track.querySelectorAll('.book').length;
function updateShelf(){
  const card=track.querySelector('.book');
  const step=card.getBoundingClientRect().width+parseFloat(getComputedStyle(track).columnGap||0);
  const index=Math.max(1,Math.min(bookCount,Math.round(track.scrollLeft/step)+1));
  position.textContent=String(index).padStart(2,'0')+' / '+String(bookCount).padStart(2,'0');
  previous.disabled=track.scrollLeft<3;
  next.disabled=track.scrollLeft+track.clientWidth>=track.scrollWidth-3;
}
function moveShelf(direction){track.scrollBy({left:direction*track.clientWidth*.82,behavior:reduceMotion.matches?'instant':'smooth'});}
previous.addEventListener('click',()=>moveShelf(-1));
next.addEventListener('click',()=>moveShelf(1));
track.addEventListener('scroll',updateShelf,{passive:true});
track.addEventListener('keydown',event=>{if(event.target===track&&(event.key==='ArrowRight'||event.key==='ArrowLeft')){event.preventDefault();moveShelf(event.key==='ArrowRight'?1:-1);}});
toggle.addEventListener('click',()=>{const expanded=!shelf.classList.contains('expanded');shelf.classList.toggle('expanded',expanded);toggle.setAttribute('aria-expanded',String(expanded));toggle.textContent=expanded?'Voltar à estante ↗':'Ver os 9 livros ↗';track.scrollLeft=0;updateShelf();updateProgress();});
window.addEventListener('resize',updateShelf);updateShelf();

let toastTimer;
function showToast(message){const toast=document.querySelector('#toast');toast.textContent=message;toast.classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.classList.remove('visible'),3500);}
document.querySelector('#copy-email').addEventListener('click',async()=>{try{await navigator.clipboard.writeText('thiagotomita17@gmail.com');showToast('E-mail copiado!');}catch{showToast('Meu e-mail: thiagotomita17@gmail.com');}});
document.querySelector('#year').textContent=new Date().getFullYear();
