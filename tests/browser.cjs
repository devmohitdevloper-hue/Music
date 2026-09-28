const {chromium}=require('playwright');const fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert');
const root=path.resolve(__dirname,'..');process.chdir(root);
const server=http.createServer((req,res)=>{const f=path.join(root,new URL(req.url,'http://local').pathname);try{res.setHeader('Content-Type',f.endsWith('.js')?'application/javascript':f.endsWith('.css')?'text/css':'text/html');res.end(fs.readFileSync(f))}catch(e){res.writeHead(404);res.end()}});
(async()=>{
 await new Promise(r=>server.listen(8123,'127.0.0.1',r));const browser=await chromium.launch();const page=await browser.newPage();await page.emulateMedia({reducedMotion:'reduce'});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript({content:'window.__MS_TOKEN="test-token";'+fs.readFileSync('js/player-guard.js','utf8')});
 await page.route('**/*',r=>{const u=new URL(r.request().url());if(u.hostname==='127.0.0.1')return r.continue();
 if(u.hostname==='api.themoviedb.org'){
 let data={results:[{id:101,name:'Test Series',title:'Test Movie',vote_average:8,poster_path:'/test.jpg',vote_count:500}],page:1,total_pages:1};
 if(/\/(movie|tv)\/101$/.test(u.pathname))data={id:101,title:'Test Movie',name:'Test Series',overview:'Test',seasons:[{season_number:1,episode_count:3}]};
 if(u.pathname.includes('/season/'))data={episodes:[{},{},{}]};return r.fulfill({json:data});}
 if(/screenscape.me|nxsha.space/.test(u.hostname))return r.fulfill({contentType:'text/html',body:'<video id="video"></video><div class="ad-overlay">ADVERTISEMENT</div><button id="popup" onclick="window.open(\'https://ads.example\')">Popup</button>'});
 return r.abort();});
 fs.mkdirSync('qa',{recursive:true});
 for(const size of [{width:390,height:844},{width:844,height:390},{width:1280,height:800},{width:1920,height:1080}]){
 await page.setViewportSize(size);await page.goto('http://127.0.0.1:8123/series.html');await page.waitForSelector('#grid .card');
 assert(await page.locator('.bottom-nav').isVisible());assert.equal(await page.locator('#sidebar [data-page]').count(),0);
 if(size.width>size.height){assert(await page.locator('.chips').evaluate(el=>el.scrollWidth<=el.clientWidth+1));const boxes=await page.locator('.chip').evaluateAll(a=>a.map(e=>e.getBoundingClientRect().toJSON()));assert(boxes.every(b=>b.x>=0&&b.right<=size.width&&b.y>=0&&b.bottom<size.height-62));}
 await page.screenshot({path:`qa/series-${size.width}.png`});
 }
 await page.goto('http://127.0.0.1:8123/watch.html?type=tv&id=101&s=1&e=2&server=server2');await page.waitForSelector('[data-e="3"]');
 let frame=page.frames().find(f=>f.url().includes('nxsha.space'));assert(frame);await frame.waitForSelector('video');
 async function mockVideo(f){await f.evaluate(()=>{const v=document.querySelector('video');window.testTime=0;Object.defineProperty(v,'duration',{get:()=>3600});Object.defineProperty(v,'currentTime',{get:()=>window.testTime,set:x=>window.testTime=x});Object.defineProperty(v,'paused',{get:()=>false});v.dispatchEvent(new Event('loadedmetadata'));});}
 await mockVideo(frame);await page.waitForTimeout(100);
 await frame.evaluate(()=>{window.testTime=127;document.querySelector('video').dispatchEvent(new Event('playing'))});
 await page.waitForFunction(()=>JSON.parse(localStorage.getItem('moviesansar-history-v8')||'[]')[0]?.position===127);
 assert.equal(await frame.locator('.ad-overlay').count(),0);assert.equal(await frame.evaluate(()=>window.open('https://ads.example')),null);
 await page.goto('http://127.0.0.1:8123/series.html');await page.locator('.bottom-nav [data-action="library"]').click();await page.waitForSelector('#libraryPanel.open');assert((await page.locator('#libraryList').innerText()).includes('2:07'));await page.locator('#libraryList a').first().click();
 await page.waitForSelector('[data-e="3"]');frame=page.frames().find(f=>f.url().includes('nxsha.space'));await frame.waitForSelector('video');await mockVideo(frame);await frame.waitForFunction(()=>window.testTime===127);
 assert((await page.locator('#frame').getAttribute('src')).includes('e=2'));
 await page.screenshot({path:'qa/resume.png'});assert.deepEqual(errors,[]);console.log('PASS: 4 viewport layouts, category wrapping, history, position capture, resume at 127s, episode/server persistence, popup and ad overlay removal.');
 await browser.close();server.close();
})().catch(e=>{console.error(e);server.close();process.exit(1)});
