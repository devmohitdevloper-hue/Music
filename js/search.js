const SEARCH_HISTORY='moviesansar-search-history-v12';
const SEARCH_GENRES={movie:{Action:28,Comedy:35,Drama:18,Thriller:53,Romance:10749,'Sci-Fi':878,Animation:16,Adventure:12,Horror:27},tv:{Drama:18,Comedy:35,Crime:80,Mystery:9648,'Sci-Fi':10765,Documentary:99,Fantasy:10765}};
const searchParams=new URLSearchParams(location.search);
let searchType=['all','movie','tv'].includes(searchParams.get('type'))?searchParams.get('type'):'all';
let searchCategory=searchParams.get('category')||'',searchQuery=(searchParams.get('q')||'').slice(0,120),searchGeneration=0,searchTimer=0,searchPage=1,searchPages=1,searchBusy=false;
const searchSeen=new Set();
function historyRead(){try{const a=JSON.parse(localStorage.getItem(SEARCH_HISTORY)||'[]');return Array.isArray(a)?a.filter(x=>typeof x.q==='string'&&['all','movie','tv'].includes(x.type)).slice(0,20):[]}catch(e){return[]}}
function historyWrite(a){try{localStorage.setItem(SEARCH_HISTORY,JSON.stringify(a.slice(0,20)))}catch(e){}renderSearchHistory()}
function rememberSearch(){const q=searchQuery.trim();if(!q)return;historyWrite([{q,type:searchType},...historyRead().filter(x=>x.q.toLocaleLowerCase()!==q.toLocaleLowerCase()||x.type!==searchType)])}
function renderSearchHistory(){const list=document.getElementById('searchHistory');if(!list)return;const a=historyRead();document.getElementById('clearHistory').hidden=!a.length;list.innerHTML=a.length?a.map((x,i)=>`<div class="history-row"><button type="button" data-history="${i}">${icon('recent')}<span>${esc(x.q)}</span><small>${x.type==='all'?'All':x.type==='tv'?'Series':'Movies'}</small></button><button class="history-remove" type="button" data-remove-history="${i}" aria-label="Remove ${esc(x.q)} from search history">${icon('close')}</button></div>`).join(''):'<p class="search-hint">Your submitted searches will appear here. Saved only on this device.</p>'}
function availableCategories(){return [...new Set(Object.values(searchType==='all'?SEARCH_GENRES:{[searchType]:SEARCH_GENRES[searchType]}).flatMap(x=>Object.keys(x)))]}
function renderSearchCategories(){if(!availableCategories().includes(searchCategory))searchCategory='';document.getElementById('searchCategories').innerHTML=['',...availableCategories()].map(c=>`<button type="button" data-search-category="${c}" aria-pressed="${searchCategory===c}">${esc(c||'All genres')}</button>`).join('');document.querySelectorAll('[data-search-type]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.searchType===searchType)))}
document.getElementById('app').innerHTML=shell('search',`<header class="topbar search-topbar"><button class="back-btn" id="searchBack" aria-label="Back">${icon('back')}</button><a class="top-brand" href="movies.html"><span class="top-brand-logo">${icon('spark')}</span><span class="top-brand-name">KUD Movies</span></a><button class="back-btn" id="themeSettings">${icon('theme')}</button></header><div class="search-content"><h1>Search</h1><p class="search-hint">Find your next movie or web series.</p><form id="searchForm" role="search"><label class="sr-only" for="catalogSearch">Search movies and web series</label>${icon('search')}<input id="catalogSearch" type="search" maxlength="120" placeholder="Movies, web series and more" autocomplete="off" enterkeyhint="search" value="${esc(searchQuery)}"><button type="button" id="clearSearch" aria-label="Clear search">${icon('close')}</button><button type="submit" aria-label="Submit search">${icon('arrow')}</button></form><div class="search-types" role="group" aria-label="Search type">${[['all','All'],['movie','Movies'],['tv','Web Series']].map(([v,l])=>`<button type="button" data-search-type="${v}">${l}</button>`).join('')}</div><section class="recent-searches"><div class="search-section-head"><h2>Recent searches</h2><button id="clearHistory" type="button">Clear all</button></div><div id="searchHistory"></div></section><section><div class="search-section-head"><h2>Browse categories</h2></div><div id="searchCategories"></div></section><section class="search-results"><div class="search-section-head"><h2 id="searchResultsTitle">Discover something new</h2></div><p id="searchStatus" role="status" aria-live="polite"></p><div class="grid" id="searchResults"></div><button type="button" id="searchMore" hidden>Load more</button></section></div>`);
// Search has categories in the page, so it does not need a duplicate drawer.
document.getElementById('sidebar')?.remove();document.getElementById('overlay')?.remove();
wireNav('search');renderSearchHistory();renderSearchCategories();
const catalogInput=document.getElementById('catalogSearch');
function updateSearchURL(){const p=new URLSearchParams({type:searchType});if(searchQuery)p.set('q',searchQuery);if(searchCategory)p.set('category',searchCategory);history.replaceState(null,'','search.html?'+p)}
async function runCatalogSearch(append=false){
 clearTimeout(searchTimer);const generation=++searchGeneration;searchBusy=true;
 if(!append){searchPage=1;searchSeen.clear();document.getElementById('searchResults').innerHTML=''}
 const query=searchQuery,category=searchCategory,type=searchType,page=searchPage;updateSearchURL();
 const status=document.getElementById('searchStatus'),more=document.getElementById('searchMore');more.hidden=true;status.textContent='Searching…';document.getElementById('searchResults').setAttribute('aria-busy','true');
 document.getElementById('searchResultsTitle').textContent=query?`Results for “${query}”`:category||'Popular now';
 const types=(type==='all'?['movie','tv']:[type]).filter(t=>!category||SEARCH_GENRES[t][category]);
 const responses=await Promise.allSettled(types.map(async t=>{const params={page,include_adult:'false'};let route;if(query){route='/search/'+t;params.query=query}else{route='/discover/'+t;params.sort_by='popularity.desc';if(category)params.with_genres=SEARCH_GENRES[t][category]}const data=await TMDB.get(route,params);return{type:t,items:(data.results||[]).filter(x=>x.id&&!x.adult&&(!category||!query||(x.genre_ids||[]).includes(SEARCH_GENRES[t][category]))),pages:data.total_pages||1}}));
 if(generation!==searchGeneration)return;
 const valid=responses.filter(x=>x.status==='fulfilled').map(x=>x.value),failed=responses.length-valid.length;
 searchPages=Math.min(500,Math.max(1,...valid.map(x=>x.pages)));const merged=[];for(let i=0;i<20;i++)for(const r of valid){const x=r.items[i];if(x&&!searchSeen.has(r.type+':'+x.id)){searchSeen.add(r.type+':'+x.id);merged.push({...x,_type:r.type})}}
 document.getElementById('searchResults').insertAdjacentHTML('beforeend',merged.map(x=>cardHTML(x,x._type==='movie'?'Movie':'Web Series',x._type).replace('<article ','<article tabindex="0" role="link" ')).join(''));
 status.textContent=failed?(valid.length?'Some sources could not load. Try again.':'Could not load results. Check your connection and retry.'):searchSeen.size?`${searchSeen.size} titles loaded`:'No matching titles. Try a different name or category.';
 if(failed){const b=document.createElement('button');b.type='button';b.id='searchRetry';b.textContent='Retry';b.onclick=()=>runCatalogSearch(false);status.append(' ',b)}
 more.hidden=searchPage>=searchPages||!valid.length;searchBusy=false;document.getElementById('searchResults').setAttribute('aria-busy','false');
}
document.getElementById('searchForm').onsubmit=e=>{e.preventDefault();searchQuery=catalogInput.value.trim();rememberSearch();catalogInput.blur();runCatalogSearch()};
catalogInput.addEventListener('input',()=>{searchQuery=catalogInput.value.trim();clearTimeout(searchTimer);++searchGeneration;document.getElementById('searchResults').innerHTML='';document.getElementById('searchStatus').textContent='Searching…';document.getElementById('searchMore').hidden=true;searchTimer=setTimeout(()=>runCatalogSearch(),320)});
document.getElementById('clearSearch').onclick=()=>{catalogInput.value='';searchQuery='';runCatalogSearch();catalogInput.focus()};
document.getElementById('clearHistory').onclick=()=>historyWrite([]);
document.getElementById('searchBack').onclick=()=>{if(history.length>1)history.back();else location.href='movies.html'};
document.getElementById('searchMore').onclick=()=>{if(!searchBusy&&searchPage<searchPages){searchPage++;runCatalogSearch(true)}};
document.addEventListener('click',e=>{
 const type=e.target.closest('[data-search-type]');if(type){searchType=type.dataset.searchType;renderSearchCategories();runCatalogSearch();return}
 const cat=e.target.closest('[data-search-category]');if(cat){searchCategory=cat.dataset.searchCategory;renderSearchCategories();runCatalogSearch();return}
 const recent=e.target.closest('[data-history]');if(recent){const x=historyRead()[+recent.dataset.history];if(x){searchQuery=x.q;searchType=x.type;searchCategory='';catalogInput.value=searchQuery;renderSearchCategories();rememberSearch();runCatalogSearch()}return}
 const remove=e.target.closest('[data-remove-history]');if(remove){historyWrite(historyRead().filter((_,i)=>i!==+remove.dataset.removeHistory));return}
 const card=e.target.closest('#searchResults .card');if(card){rememberSearch();goWatch(card.dataset.type,card.dataset.id)}
});
document.getElementById('searchResults').addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.matches('.card'))e.target.click()});
runCatalogSearch();
