const TMDB_KEY="3d1ec95df82b55db5309fd1ba31f7ded";
const REGION="IN", LANGUAGE="en-US";
const PRIMARY_WORKER_PROXY=url=>`https://summer-lab-c5bb.ramkummar4455.workers.dev/?url=${encodeURIComponent(url)}`;
const BACKUP_PROXIES=[
 u=>`https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
 u=>`https://api.codetabs.com/v1/proxy/?quest=${encodeURIComponent(u)}`
];
// One cached request per URL, bounded storage, first successful fallback wins.
const apiPending=new Map(), API_CACHE="moviesansar-api-v7";
function readApiCache(){try{return JSON.parse(localStorage.getItem(API_CACHE)||"{}")}catch(e){return {}}}
const apiCache=readApiCache();
async function fetchJSON(url,ms=5500){
 if(apiPending.has(url))return apiPending.get(url);
 const cached=apiCache[url];
 if(cached&&Date.now()-cached.at<10*60*1000)return cached.data;
 const job=(async()=>{
  const controllers=[],timers=[];let finished=false;
  const attempt=async target=>{
   if(finished)throw Error("Request completed");
   const c=new AbortController();controllers.push(c);
   const timer=setTimeout(()=>c.abort(),ms);timers.push(timer);
   try{const r=await fetch(target,{signal:c.signal,headers:{Accept:"application/json"}});
    if(!r.ok)throw Error("HTTP "+r.status);
    const d=await r.json();if(d.success===false||d.status_code)throw Error(d.status_message||"API error");return d;
   }finally{clearTimeout(timer)}
  };
  try{
   // Direct starts immediately; a single proxy is hedged after 900ms.
   // Additional proxies start only if that proxy fails.
   const fallback=new Promise((resolve,reject)=>{
    const t=setTimeout(()=>attempt(PRIMARY_WORKER_PROXY(url)).catch(()=>Promise.any(BACKUP_PROXIES.map(fn=>attempt(fn(url))))).then(resolve,reject),900);
    timers.push(t);
   });
   const data=await Promise.any([attempt(url),fallback]);
   apiCache[url]={at:Date.now(),data};
   const keys=Object.keys(apiCache).sort((a,b)=>apiCache[b].at-apiCache[a].at);
   keys.slice(80).forEach(k=>delete apiCache[k]);
   try{localStorage.setItem(API_CACHE,JSON.stringify(apiCache))}catch(e){}
   return data;
  }catch(e){if(cached&&Date.now()-cached.at<86400000)return cached.data;throw e}
  finally{finished=true;timers.forEach(clearTimeout);controllers.forEach(c=>c.abort())}
 })();
 apiPending.set(url,job);try{return await job}finally{apiPending.delete(url)}
}
async function resilientFetch(url){return fetchJSON(url)}
const INDIAN_LANGS=new Set(["hi","ta","te","ml","kn","bn","mr","pa","gu","as","or"]);
function indiaScore(x){
  const country=Array.isArray(x.origin_country)?x.origin_country.includes("IN"):x.origin_country==="IN";
  const lang=INDIAN_LANGS.has(x.original_language);
  return country||lang?1:0;
}
function mergeIndiaFirst(india,global,limit=24){
  const seen=new Set(),out=[];
  for(const item of [...india,...global]){
    if(!item||seen.has(item.id))continue;
    seen.add(item.id); item._india=indiaScore(item)===1 || india.includes(item); out.push(item);
    if(out.length>=limit)break;
  }
  return out;
}
const FALLBACK_CATALOG={movies:[],series:[]};

const TMDB={
 base:"https://api.themoviedb.org/3",poster:"https://image.tmdb.org/t/p/w342",backdrop:"https://image.tmdb.org/t/p/w780",
 async get(path,params={}){const p=new URLSearchParams({api_key:TMDB_KEY,language:LANGUAGE,...params});
   return await resilientFetch(`${this.base}${path}?${p}`)},
 movies(category,q="",page=1){const g={Action:28,Comedy:35,Drama:18,Thriller:53,Romance:10749,"Sci-Fi":878,Animation:16,Adventure:12,Horror:27};
  const fallback=FALLBACK_CATALOG.movies; const local=()=>{let r=fallback.slice();if(q){const z=q.toLowerCase();r=r.filter(x=>(x.title||"").toLowerCase().includes(z))}return r};
  if(q)return this.get("/search/movie",{query:q,page,include_adult:"false",region:REGION}).then(x=>({items:(x.results||[]).sort((a,b)=>indiaScore(b)-indiaScore(a)),page:x.page||page,totalPages:x.total_pages||1})).catch(()=>({items:page===1?local():[],page,totalPages:1}));
  const base={page,sort_by:"vote_average.desc","vote_count.gte":150,include_adult:"false",region:REGION};if(g[category])base.with_genres=g[category];
  const india={...base,with_origin_country:"IN"};const quality=list=>list.filter(x=>(x.vote_average||0)>=6.5&&(x.vote_count||0)>=150);
  return Promise.allSettled([this.get("/discover/movie",india),this.get("/discover/movie",base)]).then(([a,b])=>({items:mergeIndiaFirst(quality(a.status==="fulfilled"?(a.value.results||[]):[]),quality(b.status==="fulfilled"?(b.value.results||[]):[]),24),page,totalPages:Math.max(a.status==="fulfilled"?a.value.total_pages||1:1,b.status==="fulfilled"?b.value.total_pages||1:1)})).then(x=>x.items.length?x:{items:local(),page,totalPages:1}).catch(()=>({items:local(),page,totalPages:1}))},
 trendingMovies(page=1){return this.get("/trending/movie/week",{page,include_adult:"false"}).then(x=>({items:x.results||[],page:x.page||page,totalPages:x.total_pages||1})).catch(()=>({items:[],page,totalPages:1}))},
 topRatedMovies(page=1){return this.get("/movie/top_rated",{page,region:REGION,include_adult:"false"}).then(x=>({items:x.results||[],page:x.page||page,totalPages:x.total_pages||1})).catch(()=>({items:[],page,totalPages:1}))},
 series(category,q="",page=1){const g={Drama:18,Comedy:35,Crime:80,Mystery:9648,"Sci-Fi":10765,Documentary:99,Fantasy:10765};const fallback=FALLBACK_CATALOG.series;const local=()=>{let r=fallback.slice();if(q){const z=q.toLowerCase();r=r.filter(x=>(x.name||"").toLowerCase().includes(z))}return r};
  if(q)return this.get("/search/tv",{query:q,page,include_adult:"false",watch_region:REGION}).then(x=>({items:(x.results||[]).sort((a,b)=>indiaScore(b)-indiaScore(a)),page:x.page||page,totalPages:x.total_pages||1})).catch(()=>({items:page===1?local():[],page,totalPages:1}));
  const base={page,sort_by:"vote_average.desc","vote_count.gte":100,include_adult:"false",watch_region:REGION};if(g[category])base.with_genres=g[category];const hindi={...base,with_origin_country:"IN",with_original_language:"hi"};const hollywood={...base,with_origin_country:"US"};const quality=list=>list.filter(x=>(x.vote_average||0)>=6.5&&(x.vote_count||0)>=100);
  return Promise.allSettled([this.get("/discover/tv",hindi),this.get("/discover/tv",hollywood)]).then(([a,b])=>({items:mergeIndiaFirst(quality(a.status==="fulfilled"?(a.value.results||[]):[]),quality(b.status==="fulfilled"?(b.value.results||[]):[]),24),page,totalPages:Math.max(a.status==="fulfilled"?a.value.total_pages||1:1,b.status==="fulfilled"?b.value.total_pages||1:1)})).then(x=>x.items.length?x:{items:local(),page,totalPages:1}).catch(()=>({items:local(),page,totalPages:1}))},
 trendingSeries(page=1){return this.get("/trending/tv/week",{page,include_adult:"false"}).then(x=>({items:x.results||[],page:x.page||page,totalPages:x.total_pages||1})).catch(()=>({items:[],page,totalPages:1}))},
 topRatedSeries(page=1){return this.get("/tv/top_rated",{page,watch_region:REGION,include_adult:"false"}).then(x=>({items:x.results||[],page:x.page||page,totalPages:x.total_pages||1})).catch(()=>({items:[],page,totalPages:1}))},
 movieDetails:id=>TMDB.get(`/movie/${id}`,{}),tvDetails:id=>TMDB.get(`/tv/${id}`,{}),
 season:(id,s)=>TMDB.get(`/tv/${id}/season/${s}`,{}),
 similarMovies:id=>TMDB.get(`/movie/${id}/similar`,{}).then(x=>x.results||[]),
 similarSeries:id=>TMDB.get(`/tv/${id}/similar`,{}).then(x=>x.results||[])
};

function playerAccent(){let key='aurora';try{key=localStorage.getItem('moviesansar-theme')||key}catch(e){}return (THEMES[key]||THEMES.aurora).accent}
const STREAM_SERVERS={
 server1:{label:"Server 1",sandbox:"allow-scripts allow-same-origin allow-forms allow-presentation allow-orientation-lock",
  buildUrl:(type,id,s,e)=>type==="movie"?`https://screenscape.me/embed?tmdb=${id}&type=movie`:`https://screenscape.me/embed?tmdb=${id}&type=tv&s=${s}&e=${e}`},
 server2:{label:"Server 2",sandbox:"allow-scripts allow-same-origin allow-forms allow-presentation allow-orientation-lock",
  buildUrl:(type,id,s,e)=>type==="movie"?`https://nxsha.space/embed/movie/${id}?disable_app_ad=true&disable_dl_button=true&color=${encodeURIComponent(playerAccent())}`:`https://nxsha.space/embed/tv/${id}/${s}/${e}?disable_app_ad=true&disable_dl_button=true&color=${encodeURIComponent(playerAccent())}`},
 test_vidzee:{label:"Test 1 • VidZee",experimental:true,referrerPolicy:"strict-origin-when-cross-origin",
  buildUrl:(type,id,s,e)=>type==="movie"?`https://player.vidzee.wtf/embed/movie/${id}`:`https://player.vidzee.wtf/embed/tv/${id}/${s}/${e}`},
 test_nhd:{label:"Test 2 • NHD",experimental:true,referrerPolicy:"strict-origin-when-cross-origin",note:"Source availability varies; movies and episodes may fail.",
  buildUrl:(type,id,s,e)=>type==="movie"?`https://nhdapi.st/movie/${id}`:`https://nhdapi.st/tv/${id}/${s}/${e}`},
 server3:{label:"Server 3 • Owner CDN",sandbox:"allow-scripts allow-same-origin allow-forms allow-presentation allow-orientation-lock",
  buildUrl:(type,id,s,e)=>{
    if(!AUTHORIZED_STREAM_BASE)return "about:blank";
    const base=AUTHORIZED_STREAM_BASE.replace(/\/$/,"");
    return type==="movie"?`${base}/movie/${encodeURIComponent(id)}`:`${base}/tv/${encodeURIComponent(id)}/s${s}/e${e}`;
  },
  downloadUrl:(type,id,s,e)=>{
    if(!AUTHORIZED_STREAM_BASE)return null;
    const base=AUTHORIZED_STREAM_BASE.replace(/\/$/,"");
    const q=encodeURIComponent(localStorage.getItem("moviesansar-quality")||"720p"); return type==="movie"?`${base}/movie/${encodeURIComponent(id)}/download?quality=${q}`:`${base}/tv/${encodeURIComponent(id)}/s${s}/e${e}/download?quality=${q}`;
  }}
};
const SERVER_ORDER=["server1","server2"];
const EXPERIMENTAL_SERVER_ORDER=["test_vidzee","test_nhd"];
const AVAILABLE_SERVERS=[...SERVER_ORDER,...EXPERIMENTAL_SERVER_ORDER];
// Optional owner-controlled CDN slot. Leave empty unless you have an authorized source.
const AUTHORIZED_STREAM_BASE="";
function esc(v){return String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
function goWatch(type,id){location.href=`watch.html?type=${type}&id=${encodeURIComponent(id)}`}
function wireNav(active){
  initTheme();
  const m=document.getElementById("menu"),s=document.getElementById("sidebar"),o=document.getElementById("overlay"),c=document.getElementById("sideClose");
  const setOpen=open=>{
    if(!s)return;
    s.classList.toggle("open",!!open);
    o?.classList.toggle("show",!!open);
    document.documentElement.classList.toggle("sidebar-open",!!open);
    document.body.classList.toggle("sidebar-open",!!open);
    m?.setAttribute("aria-expanded",String(!!open));
    s.setAttribute("aria-hidden",String(!open));
    s.inert=!open;
    document.querySelector(".main")?.toggleAttribute("inert",!!open);
    document.querySelector(".bottom-nav")?.toggleAttribute("inert",!!open);
    if(open)c?.focus();else if(s.contains(document.activeElement))m?.focus();
  };
  setOpen(false);
  window.MovieSansarUI={setSidebar:setOpen,openSidebar:()=>setOpen(true),closeSidebar:()=>setOpen(false)};
  if(m)m.onclick=e=>{e.preventDefault();e.stopPropagation();setOpen(!s.classList.contains("open"))};
  if(c)c.onclick=e=>{e.preventDefault();setOpen(false)};
  if(o)o.onclick=()=>setOpen(false);
  document.addEventListener("keydown",e=>{if(e.key==="Escape"){setOpen(false);closeDownloads();closeThemePanel();closeLibrary()}},{passive:true});
  document.addEventListener("click",e=>{
    const a=e.target.closest?.("[data-page]");
    if(a){const page=a.dataset.page;if(page){e.preventDefault();setOpen(false);location.href=page;return}}
    const lib=e.target.closest?.("[data-action='library']");
    if(lib){e.preventDefault();setOpen(false);openLibrary();return}
    const recent=e.target.closest?.("[data-action='recent']");
    if(recent){e.preventDefault();setOpen(false);document.getElementById("content")?.scrollIntoView({behavior:"smooth",block:"start"});return}
  },{passive:false});
  initDownloadCenter();
  markActiveNav(active);
}
function markActiveNav(active){
 document.querySelectorAll("[data-section-nav]").forEach(a=>a.classList.toggle("active",a.dataset.sectionNav===active));
}

/* ===================== Inline SVG icon system ===================== */
const ICONS={
 menu:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/></svg>`,
 search:`<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/></svg>`,
 arrow:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h13M13 6l6 6-6 6"/></svg>`,
 movie:`<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="6" width="18" height="12" rx="2"/><path d="m8 6 3 5-3 5M16 6l3 5-3 5"/></svg>`,
 series:`<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M8 3v4M16 3v4M8 19v2M16 19v2"/></svg>`,
 library:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.5S4 16 4 9.5A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 8 2.5C20 16 12 20.5 12 20.5Z"/></svg>`,
 recent:`<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3 2"/></svg>`,
 download:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v11M7 11l5 5 5-5M5 20h14"/></svg>`,
 theme:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1"/><circle cx="12" cy="12" r="3.5"/></svg>`,
 close:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>`,
 back:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12H5M11 6l-6 6 6 6"/></svg>`,
 play:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 9 6-9 6V6Z"/></svg>`,
 refresh:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11a8 8 0 0 0-14-4L4 9M4 9V4M4 9h5M4 13a8 8 0 0 0 14 4l2-2M20 15v5M20 15h-5"/></svg>`,
 heart:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 8.5c0 5.5-8 10-8 10s-8-4.5-8-10A4.5 4.5 0 0 1 12 6a4.5 4.5 0 0 1 8 2.5Z"/></svg>`,
 check:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg>`,
 spark:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5L12 3Z"/></svg>`,
 flag:`<svg viewBox="0 0 24 16" aria-hidden="true"><path fill="#f58220" d="M0 0h24v5.33H0z"/><path fill="#fff" d="M0 5.33h24v5.34H0z"/><path fill="#138808" d="M0 10.67h24V16H0z"/><circle cx="12" cy="8" r="2" fill="none" stroke="#1a5dab" stroke-width=".7"/></svg>`
};
function brandMark(){return `<svg class="kud-mark" viewBox="0 0 108 108" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path class="kud-stem" d="M30 28V80M32 54L65 28" fill="none" stroke="#35e0ca" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/><path class="kud-tail" d="M34 53L66 80" fill="none" stroke="#9b7aff" stroke-width="11" stroke-linecap="round"/><path class="kud-play" d="M70 43L87 54L70 65Z" fill="#ffffff" stroke-linejoin="round"/></svg>`}
function icon(name,cls=""){return `<span class="svg-icon ${cls}" aria-hidden="true">${ICONS[name]||ICONS.spark}</span>`}

/* ===================== Global Theme System ===================== */
const THEMES={
  aurora:{name:"Aurora",icon:"spark",accent:"#8b6cff",accent2:"#36d7c5",bg:"#07090e",panel:"#10141d",panel2:"#151a24",text:"#f7f8fb",muted:"#8e97aa",line:"rgba(255,255,255,.075)",glow:"rgba(139,108,255,.18)"},
  ocean:{name:"Ocean",icon:"spark",accent:"#3b82f6",accent2:"#22d3ee",bg:"#061018",panel:"#0c1722",panel2:"#122231",text:"#f4fbff",muted:"#91a8bb",line:"rgba(125,211,252,.12)",glow:"rgba(59,130,246,.20)"},
  emerald:{name:"Emerald",icon:"spark",accent:"#10b981",accent2:"#84cc16",bg:"#06100c",panel:"#0d1914",panel2:"#13251c",text:"#f3fff8",muted:"#91aa9e",line:"rgba(134,239,172,.12)",glow:"rgba(16,185,129,.20)"},
  sunset:{name:"Sunset",icon:"spark",accent:"#f97316",accent2:"#facc15",bg:"#110a06",panel:"#1b110c",panel2:"#251810",text:"#fff9f2",muted:"#b9a08c",line:"rgba(251,146,60,.14)",glow:"rgba(249,115,22,.20)"},
  crimson:{name:"Crimson",icon:"heart",accent:"#ef4444",accent2:"#ec4899",bg:"#100609",panel:"#1b0d12",panel2:"#27121a",text:"#fff5f7",muted:"#b99aa3",line:"rgba(248,113,113,.13)",glow:"rgba(239,68,68,.20)"},
  violet:{name:"Violet",icon:"spark",accent:"#a855f7",accent2:"#6366f1",bg:"#0b0712",panel:"#150e20",panel2:"#1d1530",text:"#fbf8ff",muted:"#a89bb8",line:"rgba(216,180,254,.13)",glow:"rgba(168,85,247,.20)"},
  rose:{name:"Rose",icon:"spark",accent:"#f43f5e",accent2:"#fb7185",bg:"#10070b",panel:"#1b0e13",panel2:"#25131a",text:"#fff7f9",muted:"#bda0a9",line:"rgba(251,113,133,.13)",glow:"rgba(244,63,94,.20)"},
  graphite:{name:"Graphite",icon:"spark",accent:"#94a3b8",accent2:"#e2e8f0",bg:"#080a0d",panel:"#11151a",panel2:"#191e25",text:"#f8fafc",muted:"#929aa7",line:"rgba(226,232,240,.10)",glow:"rgba(148,163,184,.15)"}
};
function applyTheme(key){
 const t=THEMES[key]||THEMES.aurora;
 document.documentElement.dataset.theme=key;
 for(const [k,v] of Object.entries(t)) if(k!="name"&&k!="icon") document.documentElement.style.setProperty("--"+k,v);
 document.documentElement.style.setProperty("--accent",t.accent);document.documentElement.style.setProperty("--accent2",t.accent2);
 document.documentElement.style.setProperty("--good",t.accent2);
 document.querySelectorAll(".logo,.top-brand-logo").forEach(el=>{el.innerHTML=brandMark();el.style.background="#0b1020"});
 const meta=document.querySelector('meta[name="theme-color"]'); if(meta) meta.content=t.bg;
 let faviconLink=document.querySelector('link[data-theme-favicon]'); if(!faviconLink){faviconLink=document.createElement('link');faviconLink.rel='icon';faviconLink.type='image/svg+xml';faviconLink.dataset.themeFavicon='1';document.head.appendChild(faviconLink)}
 const svg=brandMark().replace('<svg ', '<svg ').replace('aria-hidden="true"','').replace('><path','><rect width="108" height="108" rx="26" fill="#0b1020"/><path');
 faviconLink.href='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);
 if(typeof applyAppearance==='function')applyAppearance();
 localStorage.setItem('moviesansar-theme',key);
 window.dispatchEvent(new CustomEvent('moviesansar:theme',{detail:{accent:t.accent}}));
 document.querySelectorAll('[data-theme-option]').forEach(b=>b.classList.toggle('active',b.dataset.themeOption===key));
}
function openThemePanel(){window.MovieSansarUI?.closeSidebar();document.querySelector('#themePanel')?.classList.add('open');document.querySelector('#themeOverlay')?.classList.add('show')}
function closeThemePanel(){document.querySelector('#themePanel')?.classList.remove('open');document.querySelector('#themeOverlay')?.classList.remove('show')}
function themePanelHTML(){return `<div class="theme-overlay" id="themeOverlay"></div><aside class="theme-panel" id="themePanel"><div class="theme-head"><div><b>Theme Studio</b><small>Customize the whole KUD Movies</small></div><button id="themeClose" aria-label="Close theme settings">${icon("close")}</button></div>${typeof appearanceHTML==='function'?appearanceHTML():''}<div class="theme-section-title">ACCENT COLOR</div><div class="theme-grid">${Object.entries(THEMES).map(([key,t])=>`<button class="theme-option" data-theme-option="${key}" style="--sw1:${t.accent};--sw2:${t.accent2}"><span class="theme-swatch"><i></i><i></i></span><span><b>${t.name}</b><small>${icon(t.icon)} App accent</small></span><em>✓</em></button>`).join('')}</div><div class="theme-note">Your appearance preferences are saved on this device. KUD Movies • Part of KUD.</div></aside>`}
function initTheme(){
 applyTheme(localStorage.getItem('moviesansar-theme')||'aurora');
 if(typeof initAppearance==='function')initAppearance();
 document.addEventListener('click',e=>{
   const theme=e.target.closest?.('#themeSettings,#themeTopControl'); if(theme){e.preventDefault();openThemePanel();return}
   if(e.target.closest?.('#themeClose,#themeOverlay')){e.preventDefault();closeThemePanel();return}
   const opt=e.target.closest?.('[data-theme-option]'); if(opt){e.preventDefault();applyTheme(opt.dataset.themeOption);return}
 },{passive:false});
}

function shell(section,content){
 const cats=section==="movies"?["All Movies","Action","Comedy","Drama","Thriller","Romance","Sci-Fi","Animation","Adventure","Horror"]:
 ["All Series","Drama","Comedy","Crime","Mystery","Sci-Fi","Documentary","Fantasy"];
 const sectionName=section==="movies"?"KUD Movies":"KUD Series";
 const categoryButtons=cats.map((c,i)=>`<button type="button" class="${i===0?'active':''}" data-category="${esc(c)}">${icon(section==='movies'?'movie':'series')}<span>${esc(c)}</span></button>`).join("");
 return `<div class="app">
 <aside class="sidebar" id="sidebar" aria-hidden="false">
  <div class="brand"><div class="logo">${brandMark()}</div><div class="brand-copy"><b>KUD MOVIES</b><small>Movies • Web Series</small></div><button class="side-close" id="sideClose" aria-label="Close menu">${icon("close")}</button></div>
  <div class="side-heading">${sectionName} categories</div><div class="category-list" aria-label="Categories">${categoryButtons}</div>
  <div class="utility">
   <a href="#" data-action="library">${icon("library")}<span>My Library</span></a>
   <a href="#" data-action="recent">${icon("recent")}<span>Recently Added</span></a>
   <a href="#" id="downloadsLink">${icon("download")}<span>Downloads</span><em class="utility-count" id="downloadCount">0</em></a>
   <a href="#" id="themeSettings">${icon("theme")}<span>Theme Studio</span></a>
  </div>
 </aside>
 <main class="main">${content}<footer class="site-footer"><div>© ${new Date().getFullYear()} <strong>KUD Movies</strong> • Created by <strong>Mohit Mishra</strong></div><a href="#" data-portfolio-link>View Portfolio ↗</a></footer></main>
 </div>
 <div class="sidebar-overlay" id="overlay"></div>
 ${bottomNavHTML(section)}
 <button class="theme-top-control mobile-theme-control" id="themeTopControl" aria-label="Open theme settings">${icon("theme")}<span>Theme</span></button>
 <div class="download-panel" id="downloadPanel" aria-hidden="true"><div class="download-head"><div><b>Downloads</b><small id="downloadSummary">Authorized downloads</small></div><button id="downloadClose" aria-label="Close downloads">${icon("close")}</button></div><div class="download-quality"><span>Quality</span><div class="quality-row">${["360p","480p","720p","1080p"].map(q=>`<button type="button" class="quality-choice ${q===(localStorage.getItem('moviesansar-quality')||'720p')?'active':''}" data-quality="${q}">${q}</button>`).join("")}</div></div><div id="downloadList" class="download-list"></div></div>
 ${libraryPanelHTML()}
 ${themePanelHTML()}`;
}
function cardHTML(it,label,type,i=0){
 const title=it.title||it.name||"Untitled",year=(it.release_date||it.first_air_date||"").slice(0,4)||"—";
 return `<article class="card" data-id="${esc(it.id)}" data-type="${type}" style="--delay:0ms"><div class="poster">${it.poster_path?`<img src="${TMDB.poster}${it.poster_path}" alt="${esc(title)}" loading="lazy" decoding="async" onerror="this.style.display='none';this.parentElement.classList.add('poster-error')">`:`<div class="poster-fallback"><span>${icon(type==="movie"?"movie":"series")}</span><b>${esc(title)}</b></div>`}<div class="overlay"><span class="play" aria-hidden="true">${icon("play")}</span></div><span class="badge">${icon("spark")} ${(it.vote_average||0).toFixed(1)}</span>${it._india?`<span class="india-badge">${icon("flag")}<span>India</span></span>`:""}</div><div class="card-info"><h3>${esc(title)}</h3><div class="meta"><span>${esc(label)}</span><i>•</i><span>${year}</span></div></div></article>`;
}
function getDownloadHistory(){try{return JSON.parse(localStorage.getItem("moviesansar-downloads")||"[]")}catch(e){return[]}}
function saveDownloadHistory(item){const a=getDownloadHistory().filter(x=>x.url!==item.url);a.unshift(item);localStorage.setItem("moviesansar-downloads",JSON.stringify(a.slice(0,30)));renderDownloadHistory()}
function renderDownloadHistory(){
 const el=document.getElementById("downloadList");if(!el)return;const a=getDownloadHistory();
 const count=document.getElementById("downloadCount");if(count)count.textContent=a.length>99?"99+":String(a.length);
 el.innerHTML=a.length?a.map(x=>`<div class="download-item"><div class="download-item-main">${icon("download")}<div><b>${esc(x.title||"Video")}</b><small>${esc(x.quality||"720p")} • ${esc(x.date||"")}</small></div></div><a href="${esc(x.url)}" target="_blank" rel="noopener">Open</a></div>`).join(""):`<div class="download-empty">${icon("download")}<span>No authorized downloads yet.</span></div>`;
}
function openDownloads(){const p=document.getElementById("downloadPanel");if(!p)return;p.classList.add("open");p.setAttribute("aria-hidden","false");renderDownloadHistory()}
function closeDownloads(){const p=document.getElementById("downloadPanel");p?.classList.remove("open");p?.setAttribute("aria-hidden","true")}
function openLibrary(){const p=document.getElementById("libraryPanel");if(!p)return;p.classList.add("open");p.setAttribute("aria-hidden","false");renderLibrary()}
function closeLibrary(){const p=document.getElementById("libraryPanel");p?.classList.remove("open");p?.setAttribute("aria-hidden","true")}
function getLibrary(){try{return JSON.parse(localStorage.getItem("moviesansar-watchlist")||"[]")}catch(e){return[]}}
function bottomNavHTML(active){return `<nav class="bottom-nav" aria-label="Main navigation"><a href="movies.html" data-page="movies.html" data-section-nav="movies" class="${active==='movies'?'active':''}">${icon('movie')}<span>Movies</span></a><a href="series.html" data-page="series.html" data-section-nav="series" class="${active==='series'?'active':''}">${icon('series')}<span>Web Series</span></a><a href="#" data-action="library">${icon('library')}<span>Library</span></a></nav>`}
function libraryPanelHTML(){return `<div class="library-panel" id="libraryPanel" aria-hidden="true"><div class="download-head"><div><b>My Library</b><small>Continue watching • History • Saved</small></div><button id="libraryClose" aria-label="Close library">${icon('close')}</button></div><div id="libraryList" class="download-list"></div></div>`}
function getHistory(){try{const a=JSON.parse(localStorage.getItem('moviesansar-history-v8')||'[]');return Array.isArray(a)?a:[]}catch(e){return []}}
function historyKey(x){return `${x.type}:${x.id}:${x.season||1}:${x.episode||1}`}
function saveHistory(x){const a=getHistory(),key=historyKey(x),old=a.find(y=>historyKey(y)===key)||{};const item={...old,...x,updatedAt:Date.now()};try{localStorage.setItem('moviesansar-history-v8',JSON.stringify([item,...a.filter(y=>historyKey(y)!==key)].slice(0,200)))}catch(e){}return item}
function timeLabel(t){t=Math.floor(Number(t)||0);return `${Math.floor(t/60)}:${String(t%60).padStart(2,'0')}`}
function historyUrl(x){return `watch.html?type=${encodeURIComponent(x.type)}&id=${encodeURIComponent(x.id)}&s=${x.season||1}&e=${x.episode||1}&server=${encodeURIComponent(x.server||'server1')}`}
function renderLibrary(){
 const el=document.getElementById('libraryList');if(!el)return;
 const history=getHistory(),saved=getLibrary();
 function rows(a,kind){return a.length?a.map(x=>`<div class="download-item"><div class="download-item-main"><div><b>${esc(x.title||'Title '+x.id)}</b><small>${x.type==='tv'?`S${x.season||1} · E${x.episode||1} • `:''}${x.watchedAt?(x.completed?'Completed':timeLabel(x.position)+' watched'):'Recently opened'}</small></div></div><a href="${esc(historyUrl(x))}">${x.position&&!x.completed?'Resume':'Open'}</a><button data-remove-kind="${kind}" data-remove-key="${esc(kind==='saved'?x.type+':'+x.id:historyKey(x))}" aria-label="Remove ${esc(x.title||'title')}">×</button></div>`).join(''):'<p class="library-empty">Nothing here yet.</p>'}
 el.innerHTML='<h3>Continue watching</h3>'+rows(history.filter(x=>x.watchedAt&&x.position>0&&!x.completed),'history')+'<h3>History</h3>'+rows(history,'history')+'<h3>Saved</h3>'+rows(saved.map(x=>({...x,...history.find(h=>h.id===x.id&&h.type===x.type)})),'saved');
 el.querySelectorAll('[data-remove-key]').forEach(b=>b.onclick=()=>{if(b.dataset.removeKind==='saved')localStorage.setItem('moviesansar-watchlist',JSON.stringify(getLibrary().filter(x=>x.type+':'+x.id!==b.dataset.removeKey)));else localStorage.setItem('moviesansar-history-v8',JSON.stringify(getHistory().filter(x=>historyKey(x)!==b.dataset.removeKey)));renderLibrary()});
}
function initDownloadCenter(){
 document.getElementById("downloadsLink")?.addEventListener("click",e=>{e.preventDefault();openDownloads()});
 document.getElementById("downloadClose")?.addEventListener("click",closeDownloads);
 document.getElementById("libraryClose")?.addEventListener("click",closeLibrary);
 document.querySelectorAll(".quality-choice").forEach(b=>b.addEventListener("click",()=>{document.querySelectorAll(".quality-choice").forEach(x=>x.classList.remove("active"));b.classList.add("active");localStorage.setItem("moviesansar-quality",b.dataset.quality)}));
 renderDownloadHistory();
}

