// Real provider pages under the same iframe sandbox and document-start script.
// Chromium request interception models the APK host filter; this is not an Android device test.
const {chromium}=require('playwright'),fs=require('fs'),http=require('http'),path=require('path');
process.chdir(path.resolve(__dirname,'..'));
const hosts=new Set(fs.readFileSync('ad-hosts.txt','utf8').split('\n').map(s=>s.trim()).filter(s=>s&&!s.startsWith('#')).map(s=>s.split(/\s+/)).map(a=>a.length>1?a[1]:a[0]));
function blocked(host){while(host){if(hosts.has(host))return true;const i=host.indexOf('.');if(i<0)break;host=host.slice(i+1)}return false}
const server=http.createServer((req,res)=>{try{const f=path.join(process.cwd(),new URL(req.url,'http://local').pathname);res.setHeader('Content-Type',f.endsWith('.js')?'application/javascript':f.endsWith('.css')?'text/css':'text/html');res.end(fs.readFileSync(f))}catch(e){res.writeHead(404);res.end()}});
(async()=>{
 await new Promise(r=>server.listen(8124,'127.0.0.1',r));fs.mkdirSync('qa',{recursive:true});const browser=await chromium.launch();const report={environment:'Playwright Chromium, real provider pages, simulated native host blocking',cases:[]};
 for(const provider of ['server2','server1']){
  const context=await browser.newContext({viewport:{width:1000,height:760},serviceWorkers:'block'});const page=await context.newPage();const item={provider,blocked:[],hosts:[],popups:0,steps:[],errors:[]};const observed=new Set();
  await context.addInitScript({content:'window.__MS_TOKEN="live-test-token";'+fs.readFileSync('js/player-guard.js','utf8')});
  context.on('page',p=>{item.popups++;p.close().catch(()=>{})});
  await context.route('**/*',async r=>{const u=new URL(r.request().url());observed.add(u.hostname);
   if(blocked(u.hostname)||/\/(popunder|popads|popcash|adsterra|vast|vpaid)(\.[a-z]+)?$/.test(u.pathname)||u.pathname.startsWith('/ads/')){item.blocked.push(u.hostname+u.pathname);return r.abort()}
   if(u.hostname==='api.themoviedb.org'){
    let data={results:[]};if(/\/tv\/1399$/.test(u.pathname))data={id:1399,name:'Game of Thrones',seasons:[{season_number:1,episode_count:10},{season_number:2,episode_count:10}]};
    if(u.pathname.includes('/season/'))data={episodes:Array.from({length:10},()=>({}))};return r.fulfill({json:data});}
   return r.continue();});
  try{
   await page.goto('http://127.0.0.1:8124/watch.html?type=tv&id=1399&s=1&e=1&server='+ (provider==='experimental'?'server2':provider));
   await page.waitForSelector('#topEpisode option[value="2"]',{state:'attached',timeout:12000});
   if(provider==='experimental'){await page.locator('#experimentalToggle').check();await page.locator('#server').selectOption('experimental')}
   for(const [sn,ep] of [[1,1],[1,2],[2,1]]){
    if(sn===2)await page.locator('#topSeason').selectOption('2');
    else if(ep===2)await page.locator('#topEpisode').selectOption('2');
    await page.waitForTimeout(10000);
    const frame=page.frames().find(f=>provider==='server2'?f.url().includes('nxsha.space/embed'):provider==='experimental'?f.url().includes('vidlink.pro/tv'):f.url().includes('screenscape.me'));
    const step={season:sn,episode:ep,src:await page.locator('#frame').getAttribute('src'),frameUrl:frame?.url(),text:'',videoCount:0};
    if(frame){step.text=(await frame.locator('body').innerText({timeout:3000}).catch(()=>'' )).slice(0,5000);step.videoCount=await frame.locator('video').count();}
    step.episodeLabelMatches=provider==='server2'?step.text.includes('S'+sn+':E'+ep):null;
    step.challenge=/verify you are human|security verification|cloudflare|access denied/i.test(step.text);
    if(!step.challenge&&frame){
     const play=frame.getByRole('button',{name:/^(play|play video|start playback)$/i}).first();
     if(await play.count())await play.click({timeout:3000}).catch(e=>{step.clickError=e.message});
     else if(provider==='server2'&&step.episodeLabelMatches){const box=await page.locator('#frame').boundingBox();await page.locator('#frame').click({position:{x:box.width/2,y:box.height/2},timeout:3000}).catch(e=>{step.clickError=e.message})}
     await page.waitForTimeout(10000);
     step.afterClickText=(await frame.locator('body').innerText({timeout:3000}).catch(()=>'' )).slice(0,3000);
     step.videos=[];
     for(const f of page.frames()){
      try{step.videos.push(...await f.locator('video').evaluateAll(vs=>vs.map(v=>({paused:v.paused,time:v.currentTime,duration:Number.isFinite(v.duration)?v.duration:null,readyState:v.readyState,error:v.error?.code||null}))))}catch(e){}
     }
     step.framesAfter=page.frames().map(f=>f.url());
    }
    await page.screenshot({path:`qa/live-${provider}-s${sn}-ep${ep}.png`});item.steps.push(step);
   }
  }catch(e){item.errors.push(e.message)}
  item.hosts=[...observed];report.cases.push(item);await context.close();
 }
 await browser.close();server.close();fs.writeFileSync('qa/live-report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
})().catch(e=>{console.error(e);server.close();process.exit(1)});
