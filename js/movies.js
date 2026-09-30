const SECTION=window.PAGE_SECTION||"movies";
const LABEL=SECTION==="movies"?"Movie Sansar":"Web-Series Sansar";
const TYPE=SECTION==="movies"?"movie":"tv";
const CATS=SECTION==="movies"?["All Movies","Action","Comedy","Drama","Thriller","Romance","Sci-Fi","Animation","Adventure","Horror"]:["All Series","Drama","Comedy","Crime","Mystery","Sci-Fi","Documentary","Fantasy"];
const app=document.getElementById("app");
let requestId=0, activeCategory=CATS[0], currentQuery="", currentPage=1, totalPages=1, loadingMore=false;
const seenIds=new Set();

function pageHTML(){return shell(SECTION,`<header class="topbar">
<button class="mobile-menu" id="menu" type="button" aria-label="Open navigation" aria-expanded="false">${icon("menu")}</button>
<a class="top-brand" href="movies.html" aria-label="Movie Sansar home"><span class="top-brand-logo">${icon("spark")}</span><span class="top-brand-name">Movie Sansar</span></a>
<div class="crumb"><b>/</b><strong>${LABEL}</strong></div>
<div class="search" role="search"><span class="search-icon">${icon("search")}</span><input id="search" placeholder="Search ${SECTION==="movies"?"movies":"web series"}..." autocomplete="off" enterkeyhint="search"><button id="searchBtn" type="button" aria-label="Search">${icon("arrow")}</button></div>
<button class="profile" type="button" aria-label="Profile">MV</button></header>
<section class="hero" id="hero"><div class="hero-content"><div class="eyebrow" id="heroEyebrow">${LABEL.toUpperCase()} • LIVE API</div><h1 id="heroTitle">Loading ${LABEL}…</h1><p id="heroText">Fetching trending and top-rated titles…</p><div class="hero-actions"><button class="btn primary" id="explore" type="button">${icon("play")}<span>Explore ${LABEL}</span></button></div><div class="hero-dots" id="heroDots"></div></div></section>
<section class="banner-strip-section"><div class="banner-strip-head"><span class="kicker">TRENDING + TOP RATED ${LABEL.toUpperCase()}</span></div><div class="banner-strip" id="bannerStrip"></div></section>
<section class="content" id="content"><div class="heading"><div><div class="kicker">${LABEL.toUpperCase()} LIBRARY</div><h2 id="title">${CATS[0]}</h2><p id="sub">Trending first • top-rated next • infinite scroll</p></div></div><div class="chips" id="chips">${CATS.map((c,i)=>`<button class="chip ${i===0?"active":""}" type="button" data-chip="${esc(c)}">${esc(c)}</button>`).join("")}</div><div class="grid" id="grid"></div><div id="loadMoreSentinel" style="height:1px"></div><div id="loadMoreStatus" style="min-height:30px;text-align:center;color:var(--muted);font-size:11px"></div></section>`)}
app.innerHTML=pageHTML(); wireNav(SECTION);
function setActiveCategory(cat){activeCategory=cat;document.querySelectorAll("[data-category],[data-chip]").forEach(x=>x.classList.toggle("active",x.dataset.category===cat||x.dataset.chip===cat))}
function cacheKey(cat,q,page=1){return `moviesansar-cache-v5-${SECTION}-${cat}-${q||"all"}-${page}`}
function readCache(cat,q,page=1){try{const x=JSON.parse(localStorage.getItem(cacheKey(cat,q,page))||"null");return Array.isArray(x)?x:null}catch(e){return null}}
function writeCache(cat,q,page,items){try{localStorage.setItem(cacheKey(cat,q,page),JSON.stringify((items||[]).slice(0,24)))}catch(e){}}
function titleOf(x){return x?.title||x?.name||"Untitled"} function yearOf(x){return(x?.release_date||x?.first_air_date||"").slice(0,4)||"—"}
function setLoadingState(cat,q){document.getElementById("title").textContent=q?`Results for “${q}”`:cat;document.getElementById("sub").textContent="Loading…";document.getElementById("grid").innerHTML=`<div class="empty loading"><div class="loading-orb"></div><b>Finding ${SECTION==="movies"?"movies":"web series"}…</b><span>Fetching trending and top-rated titles</span></div>`}
let heroItems=[],heroIndex=0,heroTimer=0;
function renderHeroSlide(i){const x=heroItems[i];if(!x)return;const title=titleOf(x),hero=document.getElementById("hero"),img=x.backdrop_path?TMDB.backdrop+x.backdrop_path:(x.poster_path?TMDB.poster+x.poster_path:"");if(img)hero.style.setProperty("--hero",`url("${img.replace(/"/g,'\\"')}")`);document.getElementById("heroEyebrow").textContent=`${x._trending?"TRENDING • ":"TOP RATED • "}${LABEL.toUpperCase()}`;document.getElementById("heroTitle").textContent=title;document.getElementById("heroText").textContent=`${LABEL} • ${yearOf(x)} • ★ ${(Number(x.vote_average)||0).toFixed(1)}`;const explore=document.getElementById("explore");explore.innerHTML=`${icon("play")}<span>Watch ${esc(title)}</span>`;explore.onclick=()=>goWatch(TYPE,x.id);document.querySelectorAll("#heroDots [data-dot]").forEach(d=>d.classList.toggle("active",+d.dataset.dot===i))}
function resetHeroTimer(){clearInterval(heroTimer);if(!document.hidden&&heroItems.length>1&&(typeof allowArtworkMotion!=='function'||allowArtworkMotion()))heroTimer=setInterval(()=>{heroIndex=(heroIndex+1)%heroItems.length;renderHeroSlide(heroIndex)},4500)}
function setHero(items){heroItems=(items||[]).filter(x=>x&&x.id&&(x.backdrop_path||x.poster_path)).slice(0,6);if(!heroItems.length)return;heroIndex=0;const dots=document.getElementById("heroDots");dots.innerHTML=heroItems.length>1?heroItems.map((_,i)=>`<button type="button" class="hero-dot ${i===0?"active":""}" data-dot="${i}" aria-label="Slide ${i+1}"></button>`).join(""):"";dots.querySelectorAll("[data-dot]").forEach(d=>d.onclick=()=>{heroIndex=+d.dataset.dot;renderHeroSlide(heroIndex);resetHeroTimer()});renderHeroSlide(0);resetHeroTimer()}
function unique(items){const out=[];for(const x of items||[]){if(!x?.id||seenIds.has(String(x.id)))continue;seenIds.add(String(x.id));out.push(x)}return out}
function appendResults(items,cat,q){const clean=unique(items);if(!clean.length)return;const grid=document.getElementById("grid");const html=clean.map((x,i)=>cardHTML(x,LABEL,TYPE,i)).join("");if(grid.querySelector(".empty"))grid.innerHTML="";grid.insertAdjacentHTML("beforeend",html);grid.querySelectorAll(".card").forEach(c=>{if(c.dataset.bound)return;c.dataset.bound="1";c.addEventListener("click",()=>goWatch(TYPE,c.dataset.id),{passive:true})});setHero(Array.from(grid.querySelectorAll(".card")).slice(0,6).map(c=>items.find(x=>String(x.id)===String(c.dataset.id))).filter(Boolean));}
function renderBannerStrip(items){const strip=document.getElementById("bannerStrip"),top=(items||[]).filter(x=>x&&x.poster_path).slice(0,14);strip.innerHTML=top.length?top.map(x=>{const t=titleOf(x);return `<button type="button" class="banner-poster" data-id="${esc(x.id)}" title="${esc(t)}"><img src="${TMDB.poster}${x.poster_path}" alt="${esc(t)}" loading="lazy" decoding="async"><span class="banner-poster-badge">${icon("spark")} ${(Number(x.vote_average)||0).toFixed(1)}</span><b>${esc(t)}</b></button>`}).join(""):"";strip.querySelectorAll("[data-id]").forEach(b=>b.addEventListener("click",()=>goWatch(TYPE,b.dataset.id),{passive:true}))}
async function getPage(cat,q,page){
 if(!q&&cat===CATS[0]&&page===1&&SECTION==="movies"){
   const [tr,top]=await Promise.all([TMDB.trendingMovies(1),TMDB.topRatedMovies(1)]);
   const trending=(tr.items||[]).map(x=>({...x,_trending:true})); const rated=(top.items||[]).map(x=>({...x,_topRated:true}));
   const seen=new Set(),merged=[];for(const x of [...trending,...rated]){if(x?.id&&!seen.has(x.id)){seen.add(x.id);merged.push(x)}}
   return {items:merged,page:1,totalPages:Math.max(tr.totalPages||1,top.totalPages||1)};
 }
 if(!q&&cat===CATS[0]&&page===1&&SECTION==="series"){
   const [tr,top]=await Promise.all([TMDB.trendingSeries(1),TMDB.topRatedSeries(1)]);const merged=[],seen=new Set();for(const x of [...(tr.items||[]).map(x=>({...x,_trending:true})),...(top.items||[]).map(x=>({...x,_topRated:true}))]){if(x?.id&&!seen.has(x.id)){seen.add(x.id);merged.push(x)}}return {items:merged,page:1,totalPages:Math.max(tr.totalPages||1,top.totalPages||1)};
 }
 return SECTION==="movies"?TMDB.movies(cat,q,page):TMDB.series(cat,q,page);
}
async function loadMore(){
 if(loadingMore||currentPage>=totalPages)return;
 const token=requestId,cat=activeCategory,q=currentQuery,next=currentPage+1;
 loadingMore=true;document.getElementById("loadMoreStatus").textContent="Loading more…";
 try{const data=await getPage(cat,q,next);if(token!==requestId)return;
 currentPage=next;totalPages=data.totalPages||next;appendResults(data.items,cat,q);
 document.getElementById("sub").textContent=`${seenIds.size} items loaded`;
 }catch(e){if(token===requestId)document.getElementById("sub").textContent="Could not load more. Scroll to retry."}finally{if(token===requestId){loadingMore=false;document.getElementById("loadMoreStatus").textContent=currentPage>=totalPages?"You’ve reached the end.":""}}
}
async function load(cat=activeCategory,q="",force=false){
 const token=++requestId;loadingMore=false;setActiveCategory(cat);currentQuery=q;
 currentPage=1;totalPages=1;seenIds.clear();setLoadingState(cat,q);
 const cached=readCache(cat,q,1);
 if(!force&&cached?.length){appendResults(cached,cat,q);renderBannerStrip(cached);document.getElementById("sub").textContent="Saved catalog • updating…"}
 try{const data=await getPage(cat,q,1);if(token!==requestId)return;
 totalPages=data.totalPages||1;
 if(data.items?.length){writeCache(cat,q,1,data.items);seenIds.clear();document.getElementById("grid").innerHTML="";appendResults(data.items,cat,q);renderBannerStrip(data.items)}
 else if(!cached?.length){document.getElementById("grid").innerHTML='<div class="empty">No titles available. Check your connection or try another search.<button class="btn secondary" id="retryCatalog">Retry</button></div>';document.getElementById("retryCatalog").onclick=()=>load(cat,q,true)}
 document.getElementById("sub").textContent=`${seenIds.size} items loaded`;
 document.getElementById("loadMoreStatus").textContent="";
 if(!seenIds.size){clearInterval(heroTimer);document.getElementById("heroTitle").textContent=LABEL;document.getElementById("heroText").textContent="Search or retry when your connection is available."}
 }catch(e){if(token!==requestId)return;document.getElementById("sub").textContent="Catalog unavailable. Check your connection.";if(!seenIds.size){document.getElementById("grid").innerHTML='<div class="empty">Could not load this category.<button class="btn secondary" id="retryCatalog">Retry</button></div>';document.getElementById("retryCatalog").onclick=()=>load(cat,q,true)}}
}
function chooseCategory(cat){window.MovieSansarUI?.closeSidebar();const valid=CATS.includes(cat)?cat:CATS[0];document.getElementById("search").value="";load(valid,"")}
document.addEventListener("click",e=>{const b=e.target.closest("[data-category],[data-chip]");if(!b||!document.body.contains(b))return;e.preventDefault();e.stopPropagation();chooseCategory(b.dataset.category||b.dataset.chip)},{passive:false});
const searchInput=document.getElementById("search"),searchBtn=document.getElementById("searchBtn");let searchTimer=0;function runSearch(){clearTimeout(searchTimer);load(activeCategory,searchInput.value.trim())}searchInput.addEventListener("input",()=>{clearTimeout(searchTimer);const q=searchInput.value.trim();searchTimer=setTimeout(()=>load(activeCategory,q),q?220:100)});searchInput.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();runSearch()}});searchBtn.addEventListener("click",runSearch);document.getElementById("explore").addEventListener("click",()=>document.getElementById("content")?.scrollIntoView({behavior:"smooth",block:"start"}));
const sentinel=document.getElementById("loadMoreSentinel");if("IntersectionObserver" in window)new IntersectionObserver(es=>{if(es.some(e=>e.isIntersecting))loadMore()},{rootMargin:"250px 0px"}).observe(sentinel);else window.addEventListener("scroll",()=>{if(innerHeight+scrollY>=document.body.offsetHeight-1200)loadMore()},{passive:true});
document.addEventListener("visibilitychange",()=>{if(document.hidden)clearInterval(heroTimer);else resetHeroTimer()});
window.addEventListener('moviesansar:appearance',resetHeroTimer);
load(CATS[0]);

// Landscape categories live above the hero, so no page or sideways scroll is needed.
const categoryLayout=matchMedia('(orientation: landscape)');
function placeCategories(){const chips=document.getElementById('chips');if(categoryLayout.matches)document.getElementById('hero').before(chips);else document.getElementById('content').insertBefore(chips,document.getElementById('grid'));}
categoryLayout.addEventListener('change',placeCategories);placeCategories();
