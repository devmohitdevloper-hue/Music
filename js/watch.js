const params=new URLSearchParams(location.search),TYPE=params.get("type")==="tv"?"tv":"movie",ID=/^[1-9]\d*$/.test(params.get("id")||"")?params.get("id"):"";
const lastVisit=getHistory().find(x=>x.type===TYPE&&String(x.id)===ID);
let season=Math.max(1,Number(params.get('s'))||lastVisit?.season||1),episode=Math.max(1,Number(params.get('e'))||lastVisit?.episode||1),server=SERVER_ORDER.includes(params.get('server'))?params.get('server'):(SERVER_ORDER.includes(lastVisit?.server)?lastVisit.server:'server1'),seasons=[],title=lastVisit?.title||'';
let playerRequest=0;
let playbackSession='',activeVideo=null,lastProgress=0;
function recordVisit(extra={}){if(!ID)return;return saveHistory({id:ID,type:TYPE,title:title||lastVisit?.title||'Title '+ID,season,episode,server,...extra})}
window.addEventListener('message',event=>{
 const m=event.data;if(!m||m.token!==window.__MS_TOKEN||!window.__MS_TOKEN||!event.source||event.source===window)return;
 if(m.kind==='MS_VIDEO_READY'){
  const prior=getHistory().find(x=>historyKey(x)===historyKey({type:TYPE,id:ID,season,episode}));
  event.source.postMessage({kind:'MS_VIDEO_CONFIG',token:window.__MS_TOKEN,videoKey:m.videoKey,session:playbackSession,position:prior?.completed?0:(prior?.position||0)},event.origin==='null'?'*':event.origin);
 }else if(m.kind==='MS_VIDEO_PROGRESS'&&m.session===playbackSession){
  const position=Number(m.position),duration=Number(m.duration);
  if(!Number.isFinite(position)||!Number.isFinite(duration)||duration<60||duration>172800||position<0||position>duration+1)return;
  activeVideo=event.source;lastProgress=Date.now();recordVisit({position,duration,watchedAt:Date.now(),completed:position>=duration-10});
  document.getElementById('playerStatus').textContent='Progress saved • '+timeLabel(position);
 }
});
const app=document.getElementById("app");

app.innerHTML=`<div class="app"><main class="main"><div class="watch-page">
<div class="watch-top"><div class="watch-brand"><a href="movies.html" aria-label="Movie Sansar home"><span class="top-brand-logo">${icon("spark")}</span><span class="top-brand-name">Movie Sansar</span></a></div><button class="back-btn" id="back">${icon("back")}<span>Back</span></button><div class="watch-tools"><button class="back-btn" id="themeSettings">${icon("theme")}<span>Theme</span></button><span class="badge-pill"><span class="badge-dot"></span><span>Player</span></span></div></div>
<div class="controls-bar"><div class="controls-group"><span class="controls-label">Playback</span>
${TYPE==="tv"?`<select class="server-select episode-select" id="topSeason" aria-label="Season"></select><select class="server-select episode-select" id="topEpisode" aria-label="Episode"></select>`:""}
</div><div class="controls-group"><span class="controls-label">Zoom</span><button class="zoom-btn active" data-z="fit">Fit</button><button class="zoom-btn" data-z="fill">1x</button><button class="zoom-btn" data-z="ultra">Ultra</button></div>
<div class="controls-group"><span class="controls-label">Server</span><label class="experimental-toggle"><input type="checkbox" id="experimentalToggle"> Experimental</label><select class="server-select" id="server">${SERVER_ORDER.map(x=>`<option value="${x}">${STREAM_SERVERS[x].label}</option>`).join("")}</select><button class="download-btn" id="downloadBtn" title="Available only when an authorized direct download is configured">${icon("download")}<span>Download</span></button><button class="save-btn" id="save">${icon("heart")}<span>Save</span></button></div></div>
<div class="player-wrap"><iframe id="frame" allow="accelerometer; autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen loading="eager" referrerpolicy="no-referrer"></iframe></div>
<p id="playerStatus" role="status" style="color:var(--muted);font-size:12px"></p><div class="info-card"><div class="info-top"><h1 class="info-title" id="title">Loading…</h1><div class="info-badges"><span class="info-badge rating" id="rating">${icon("spark")} <span>—</span></span><span class="info-badge" id="year">—</span></div></div><p class="info-overview" id="overview">Loading description…</p></div>
<div class="episodes-card" id="episodes" style="display:none"><div class="episodes-head"><h3>Select Season & Episode</h3><div class="season-tabs" id="seasons"></div></div><div class="episode-grid" id="episodeGrid"></div><div class="now-playing-strip" id="nowPlaying"></div></div>
<h3 class="related-title">More Like This</h3><div class="grid" id="related"></div><footer class="site-footer"><div>© ${new Date().getFullYear()} <strong>Movie Sansar</strong> • Created by <strong>Mohit Mishra</strong></div></footer></div></main></div>${bottomNavHTML(TYPE==="movie"?"movies":"series")}${libraryPanelHTML()}${themePanelHTML()}`;

initTheme();
document.querySelector('[data-action="library"]').onclick=e=>{e.preventDefault();openLibrary()};
document.getElementById('libraryClose').onclick=closeLibrary;
document.getElementById('server').value=server;
document.getElementById("back").onclick=()=>location.href=TYPE==="movie"?"movies.html":"series.html";
document.querySelectorAll("[data-z]").forEach(b=>b.onclick=()=>{document.querySelectorAll("[data-z]").forEach(x=>x.classList.remove("active"));b.classList.add("active");document.getElementById("frame").style.transform=b.dataset.z==="fill"?"scale(1.08)":b.dataset.z==="ultra"?"scale(1.18)":"scale(1)"});
document.getElementById("server").onchange=e=>{server=e.target.value;loadPlayer()};
document.getElementById('experimentalToggle').onchange=e=>{
 const select=document.getElementById('server');
 if(e.target.checked){const opt=document.createElement('option');opt.value='experimental';opt.textContent=STREAM_SERVERS.experimental.label;select.appendChild(opt)}
 else{select.querySelector('[value="experimental"]')?.remove();if(server==='experimental'){server='server1';select.value=server;loadPlayer()}}
};

function syncTopSelectors(){
 const ss=document.getElementById("topSeason"),es=document.getElementById("topEpisode");
 if(!ss||!es)return;
 ss.innerHTML=seasons.map(x=>`<option value="${x.season_number}" ${x.season_number===season?"selected":""}>Season ${x.season_number}</option>`).join("");
 es.innerHTML=Array.from(document.querySelectorAll("[data-e]")).map(b=>{const n=+b.dataset.e;return `<option value="${n}" ${n===episode?"selected":""}>Episode ${n}</option>`}).join("");
 ss.onchange=async e=>{season=+e.target.value;episode=1;renderSeasons();loadPlayer();await loadEpisodes()};
 es.onchange=e=>{episode=+e.target.value;updateEpisodeUI();loadPlayer()};
}
function updateEpisodeUI(){
 document.querySelectorAll("[data-e]").forEach(x=>x.classList.toggle("active",+x.dataset.e===episode));
 const es=document.getElementById("topEpisode");if(es)es.value=String(episode);
 const ss=document.getElementById("topSeason");if(ss)ss.value=String(season);
 const np=document.getElementById("nowPlaying");if(np)np.innerHTML=`Now playing: <b>Season ${season}, Episode ${episode}</b>`;
}
function loadPlayer(){
 let f=document.getElementById("frame");const status=document.getElementById("playerStatus");
 const cfg=STREAM_SERVERS[server];let u=cfg?.buildUrl?.(TYPE,ID,season,episode);
 if(!u||u==="about:blank"){status.textContent="This server is not configured.";return}
 status.textContent=cfg.experimental?"Experimental server • speed and availability are under testing.":"Pop-ups and external links blocked. If playback fails, try the other server.";
 f.setAttribute("sandbox","allow-scripts allow-same-origin allow-presentation allow-orientation-lock");
 if(f.dataset.source!==u){
  // A fresh browsing context prevents a provider SPA retaining the previous episode.
  const fresh=f.cloneNode(false);fresh.removeAttribute('src');fresh.dataset.source=u;
  fresh.name='moviesansar-'+(++playerRequest);playbackSession=String(Date.now())+'-'+Math.random();activeVideo=null;
  fresh.setAttribute('sandbox','allow-scripts allow-same-origin allow-presentation allow-orientation-lock');
  f.replaceWith(fresh);f=fresh;recordVisit();f.src=u;
 }
 updateEpisodeUI();
}
// Do not disguise an external player page as a download.
const downloadButton=document.getElementById("downloadBtn");
downloadButton.hidden=true;
const FALLBACK_WATCH=[...(FALLBACK_CATALOG?.movies||[]),...(FALLBACK_CATALOG?.series||[])];
async function loadDetails(){
 // Start the player immediately from the known TMDB id. Details/poster metadata
 // must never sit in front of playback startup.
 if(ID) loadPlayer();
 try{
   const d=TYPE==="movie"?await TMDB.movieDetails(ID):await TMDB.tvDetails(ID);
   return await applyDetails(d,false);
 }catch(e){
   const d=FALLBACK_WATCH.find(x=>String(x.id)===String(ID));
   if(d)return await applyDetails(d,true);
   document.getElementById("title").textContent="Could not load details";
   document.getElementById("overview").textContent="Check your connection and try again.";
 }
}
async function applyDetails(d,offline=false){
 title=d.title||d.name||"Untitled";recordVisit();
 document.title="Movie Sansar — "+title;
 document.getElementById("title").textContent=title;
 document.getElementById("rating").innerHTML=`${icon("spark")} <span>${d.vote_average?Number(d.vote_average).toFixed(1):"N/A"}</span>`;
 document.getElementById("year").textContent=(d.release_date||d.first_air_date||"").slice(0,4)||"N/A";
 document.getElementById("overview").textContent=d.overview||(offline?"Offline catalog preview. Connect to the catalog to load the full description.":"No description available.");

 if(TYPE==="tv"&&!offline){seasons=(d.seasons||[]).filter(x=>x.season_number>0);if(seasons.length){document.getElementById("episodes").style.display="";if(!seasons.some(s=>s.season_number===season)){season=seasons[0].season_number;episode=1;}renderSeasons();await loadEpisodes()}}
 loadSaved();
 if(!offline){if(!(TYPE==="movie"&&document.getElementById("frame")?.src))loadPlayer();loadRelated()}
}
function renderSeasons(){document.getElementById("seasons").innerHTML=seasons.map(s=>`<button class="season-tab ${s.season_number===season?"active":""}" data-s="${s.season_number}">Season ${s.season_number}</button>`).join("");document.querySelectorAll("[data-s]").forEach(b=>b.onclick=async()=>{season=+b.dataset.s;episode=1;renderSeasons();loadPlayer();await loadEpisodes()});const ss=document.getElementById("topSeason");if(ss)ss.value=String(season)}
async function loadEpisodes(){const requestedSeason=season;let count=seasons.find(s=>s.season_number===season)?.episode_count||0;try{const d=await TMDB.season(ID,season);count=d.episodes?.length||count}catch(e){}if(requestedSeason!==season)return;document.getElementById("episodeGrid").innerHTML=Array.from({length:count},(_,i)=>`<button class="episode-btn ${i+1===episode?"active":""}" data-e="${i+1}">Ep ${i+1}</button>`).join("");document.querySelectorAll("[data-e]").forEach(b=>b.onclick=()=>{episode=+b.dataset.e;updateEpisodeUI();loadPlayer()});syncTopSelectors();updateEpisodeUI()}
async function loadRelated(){
 try{
  let a=TYPE==="movie"?await TMDB.similarMovies(ID):await TMDB.similarSeries(ID);
  let items=(a||[]).filter(x=>x.poster_path).slice(0,10);
  if(!items.length){
   const d=TYPE==="movie"?await TMDB.movieDetails(ID):await TMDB.tvDetails(ID);
   const genres=(d.genres||[]).slice(0,2).map(x=>x.id);
   if(genres.length){
    const path=TYPE==="movie"?"/discover/movie":"/discover/tv";
    const r=await TMDB.get(path,{with_genres:genres.join(","),sort_by:"popularity.desc",page:1,include_adult:"false",watch_region:REGION,with_origin_country:"IN"});
    items=(r.results||[]).filter(x=>String(x.id)!==String(ID)&&x.poster_path).slice(0,10);
   }
  }
  document.getElementById("related").innerHTML=items.length?items.map((x,i)=>cardHTML(x,TYPE==="movie"?"Movies":"Web Series",TYPE,i)).join(""):`<div class="empty">No suggestions available yet.</div>`;
  document.querySelectorAll("#related .card").forEach(c=>c.onclick=()=>location.href=`watch.html?type=${TYPE}&id=${c.dataset.id}`);
 }catch(e){document.getElementById("related").innerHTML=`<div class="empty">Suggestions are temporarily unavailable.</div>`}
}
function getList(){try{return JSON.parse(localStorage.getItem("moviesansar-watchlist")||"[]")}catch(e){return[]}}
function loadSaved(){const saved=getList().some(x=>x.id===ID&&x.type===TYPE);const b=document.getElementById("save");b.innerHTML=saved?`${icon("heart")}<span>Saved</span>`:`${icon("heart")}<span>Save</span>`;b.classList.toggle("saved",saved)}
document.getElementById("save").onclick=()=>{let a=getList(),i=a.findIndex(x=>x.id===ID&&x.type===TYPE);if(i>-1)a.splice(i,1);else a.push({id:ID,type:TYPE,title});localStorage.setItem("moviesansar-watchlist",JSON.stringify(a));loadSaved()};
if(ID)loadDetails();else{document.getElementById("title").textContent="Missing media ID";document.getElementById("overview").textContent="Open a title from Movies or Web Series."}
