const {chromium}=require('playwright'),fs=require('fs');
const hosts=new Set(fs.readFileSync('ad-hosts.txt','utf8').split('\n').filter(s=>s&&!s.startsWith('#')).map(s=>s.trim().split(/\s+/)).map(a=>a.length>1?a[1]:a[0]));
function blocked(h){while(h){if(hosts.has(h))return true;const i=h.indexOf('.');if(i<0)break;h=h.slice(i+1)}return false}
(async()=>{fs.mkdirSync('qa-live',{recursive:true});const b=await chromium.launch();const report=[];
for(const [name,url] of [
 ['stellar-tv','https://stellar.rip/en/watch/embed/tv/1399-1-2?autoPlay=false&autoNext=false'],
 ['phantom-tv','https://vidphantom.com/tv/1399/1/2?autoplay=false'],
 ['peestream-tv','https://providers.peestream.in/embed/?tmdbId=1399&type=tv&season=1&episode=2'],
 ['stellar-movie','https://stellar.rip/en/watch/embed/movie/1726?autoPlay=false'],
 ['phantom-movie','https://vidphantom.com/movie/1726?autoplay=false'],
 ['peestream-movie','https://providers.peestream.in/embed/?tmdbId=1726&type=movie'],
 ['nxsha-color','https://nxsha.space/embed/tv/1399/1/2?disable_app_ad=true&disable_dl_button=true&color=%2310b981']]){
 const c=await b.newContext({viewport:{width:980,height:600},serviceWorkers:'block'});await c.addInitScript({content:'window.__MS_TOKEN="candidate-test";'+fs.readFileSync('js/player-guard.js','utf8')+';document.addEventListener("playing",e=>{if(e.target.tagName==="VIDEO"&&!window.__firstPlayedAt)window.__firstPlayedAt=Date.now()},true);'});const p=await c.newPage();const row={name,url,blocked:[],popups:0,errors:[],hosts:[]};const seen=new Set();c.on('page',x=>{row.popups++;x.close().catch(()=>{})});
 await c.route('**/*',r=>{const u=new URL(r.request().url());seen.add(u.hostname);if(u.hostname==='appassets.androidplatform.net')return r.fulfill({contentType:'text/html',body:'<html><body style="margin:0;background:black"><iframe id="player" referrerpolicy="strict-origin-when-cross-origin" style="width:960px;height:540px;border:0" allow="autoplay;fullscreen;encrypted-media" sandbox="allow-scripts allow-same-origin allow-presentation allow-orientation-lock"></iframe></body></html>'});if(blocked(u.hostname)){row.blocked.push(u.hostname);return r.abort()}return r.continue()});
 try{await p.goto('https://appassets.androidplatform.net/assets/test.html');const start=Date.now();await p.locator('#player').evaluate((f,u)=>f.src=u,url);await p.waitForTimeout(8000);row.frames=p.frames().map(f=>f.url());row.text=[];
 for(const f of p.frames().slice(1)){const txt=(await f.locator('body').innerText({timeout:2000}).catch(()=>'' )).slice(0,3000);row.text.push(txt);row.buttons=await f.getByRole('button').evaluateAll(es=>es.map(e=>({text:e.textContent,aria:e.getAttribute('aria-label'),title:e.getAttribute('title')}))).catch(()=>[]);
 if(!/cloudflare|verify you are human|security verification|captcha|sandbox.{0,20}(not|disable)|disable sandbox/i.test(txt)){
 const play=f.getByRole('button',{name:/^(play|play video|start watching|watch now|play movie|play episode)$/i}).first();row.clickedAt=Date.now();if(await play.count())await play.click({timeout:2500}).catch(e=>row.errors.push(e.message));else if(name==='nxsha-color')await p.locator('#player').click({position:{x:480,y:270}});
 }}
 for(let attempt=0;attempt<30;attempt++){
  let playing=false;for(const f of p.frames().slice(1))if(await f.locator('video').evaluateAll(vs=>vs.some(v=>!v.paused&&v.currentTime>1&&v.duration>60)).catch(()=>false))playing=true;
  if(playing){row.playbackConfirmed=true;row.confirmedAfterMs=Date.now()-start;break}await p.waitForTimeout(500);
 }
 row.after=[];for(const f of p.frames().slice(1)){row.after.push({url:f.url(),text:(await f.locator('body').innerText({timeout:2000}).catch(()=>'' )).slice(0,2000),videos:await f.locator('video').evaluateAll(vs=>vs.map(v=>({time:v.currentTime,ready:v.readyState,paused:v.paused,duration:Number.isFinite(v.duration)?v.duration:null,error:v.error?.code||null}))).catch(()=>[]),firstPlayedAt:await f.evaluate(()=>window.__firstPlayedAt||null).catch(()=>null),accent:await f.locator('.controls-bg-target').evaluateAll(es=>es.map(e=>getComputedStyle(e).getPropertyValue('--player-accent'))).catch(()=>[])});}await p.screenshot({path:'qa-live/'+name+'.png'});
 }catch(e){row.errors.push(e.message)}row.hosts=[...seen];report.push(row);await c.close();fs.writeFileSync('qa-live/candidates.json',JSON.stringify(report,null,2));}
 await b.close();console.log(JSON.stringify(report,null,2));})().catch(e=>{console.error(e);process.exit(1)});
