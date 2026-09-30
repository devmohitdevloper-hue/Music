// Movie-focused appearance preferences. No remote video or music integrations.
const APPEARANCE_DEFAULTS={mode:'dark',reduceMotion:false,reduceBlur:false,glass:false,fullArt:false,mesh:false,artMotion:true};
let appearance={...APPEARANCE_DEFAULTS};
try{const saved=JSON.parse(localStorage.getItem('moviesansar-appearance-v11')||'{}');for(const k of Object.keys(appearance)){if(k==='mode'){if(['system','light','dark'].includes(saved[k]))appearance[k]=saved[k]}else if(typeof saved[k]==='boolean')appearance[k]=saved[k]}}catch(e){}
const systemDark=matchMedia('(prefers-color-scheme: dark)'),systemMotion=matchMedia('(prefers-reduced-motion: reduce)');
function allowArtworkMotion(){return appearance.artMotion&&!appearance.reduceMotion&&!systemMotion.matches}
function appearanceHTML(){return `<div class="theme-section-title">APPEARANCE</div><div class="appearance-card"><div class="appearance-mode"><b>Theme</b><div class="mode-options" role="group" aria-label="Color mode">${['system','light','dark'].map(m=>`<button type="button" data-mode="${m}" aria-pressed="false">${m[0].toUpperCase()+m.slice(1)}</button>`).join('')}</div></div>${[
 ['reduceMotion','Reduce animation','Stops moving gradients, transitions and automatic artwork rotation.'],
 ['reduceBlur','Reduce dynamic blur','Uses solid surfaces across the app. Keeps the rounded glass layout.'],
 ['glass','Liquid Glass','Rounded translucent navigation with backdrop blur and highlighted edges.'],
 ['fullArt','Full-screen cover art','Expands featured artwork to the page edges.'],
 ['mesh','Legacy mesh gradient','Adds drifting accent colors behind the page.'],
 ['artMotion','Animated cover art','Automatically rotates featured movie and series artwork; no video downloads.']
].map(([key,title,note])=>`<label class="appearance-row"><span><b>${title}</b><small>${note}</small></span><input type="checkbox" role="switch" data-appearance="${key}" aria-label="${title}"><span class="setting-switch" aria-hidden="true"></span></label>`).join('')}</div><button type="button" class="appearance-reset" id="appearanceReset">Reset appearance</button>`}
function applyAppearance(){
 const root=document.documentElement,light=appearance.mode==='light'||(appearance.mode==='system'&&!systemDark.matches);
 root.dataset.colorMode=light?'light':'dark';root.dataset.glass=String(appearance.glass);root.dataset.reduceBlur=String(appearance.reduceBlur);root.dataset.reduceMotion=String(appearance.reduceMotion||systemMotion.matches);root.dataset.fullArt=String(appearance.fullArt);root.dataset.mesh=String(appearance.mesh);
 const current=THEMES[root.dataset.theme]||THEMES.aurora;
 const colors=light?{bg:'#f4f5f9',panel:'#ffffff',panel2:'#e9ecf3',text:'#171c29',muted:'#525e72',line:'rgba(20,30,50,.16)'}:current;
 for(const k of ['bg','panel','panel2','text','muted','line'])root.style.setProperty('--'+k,colors[k]);
 document.querySelector('meta[name="theme-color"]')?.setAttribute('content',colors.bg);
 document.querySelectorAll('[data-appearance]').forEach(e=>e.checked=appearance[e.dataset.appearance]);
 document.querySelectorAll('[data-mode]').forEach(e=>e.setAttribute('aria-pressed',String(e.dataset.mode===appearance.mode)));
 window.dispatchEvent(new CustomEvent('moviesansar:appearance'));
}
function saveAppearance(){try{localStorage.setItem('moviesansar-appearance-v11',JSON.stringify(appearance))}catch(e){}applyAppearance()}
let appearanceInitialized=false;
function initAppearance(){if(appearanceInitialized)return;appearanceInitialized=true;applyAppearance();
 const nav=document.querySelector('.bottom-nav');if(nav&&!document.getElementById('navSearch')){const b=document.createElement('button');b.id='navSearch';b.className='nav-search';b.type='button';b.setAttribute('aria-label','Search movies and series');b.innerHTML=icon('search');nav.after(b);b.onclick=()=>{window.MovieSansarUI?.closeSidebar();if(location.pathname.endsWith('/search.html')){document.getElementById('catalogSearch')?.focus()}else location.href='search.html'};if(location.pathname.endsWith('/search.html'))b.setAttribute('aria-current','page')}
 let lastScroll=scrollY,scrollPending=false;
 window.addEventListener('scroll',()=>{if(scrollPending)return;scrollPending=true;requestAnimationFrame(()=>{const y=scrollY,delta=y-lastScroll;if(y<80||delta< -5)document.documentElement.classList.remove('nav-compact');else if(delta>8&&appearance.glass&&!appearance.reduceMotion&&!systemMotion.matches&&!location.pathname.endsWith('/search.html'))document.documentElement.classList.add('nav-compact');lastScroll=y;scrollPending=false})},{passive:true});
 nav?.addEventListener('click',e=>{if(document.documentElement.classList.contains('nav-compact')){e.preventDefault();e.stopPropagation();document.documentElement.classList.remove('nav-compact')}},true);
 nav?.addEventListener('focusin',()=>document.documentElement.classList.remove('nav-compact'));
 window.addEventListener('moviesansar:appearance',()=>document.documentElement.classList.remove('nav-compact'));

 document.addEventListener('change',e=>{const key=e.target.dataset?.appearance;if(key in APPEARANCE_DEFAULTS){appearance[key]=e.target.checked;saveAppearance()}});
 document.addEventListener('click',e=>{const mode=e.target.closest('[data-mode]');if(mode){appearance.mode=mode.dataset.mode;saveAppearance()}if(e.target.closest('#appearanceReset')){appearance={...APPEARANCE_DEFAULTS};saveAppearance()}});
 systemDark.addEventListener('change',applyAppearance);systemMotion.addEventListener('change',applyAppearance);
}
