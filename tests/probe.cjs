const {chromium}=require('playwright'),fs=require('fs');
(async()=>{fs.mkdirSync('qa-live/bundles',{recursive:true});const b=await chromium.launch();const report=[];let count=0;
for(const [name,url] of [
 ['nx-docs','https://web.nxsha.space/embed'],
 ['nx-old','https://nxsha.space/embed/tv/1399?s=1&e=2&color=purple'],
 ['nx-path','https://nxsha.space/embed/tv/1399/1/2?disable_app_ad=true&disable_dl_button=true'],
 ['s1','https://screenscape.me/embed?tmdb=1399&type=tv&s=1&e=2'],
 ['experimental','https://vidfast.pro/tv/1399/1/2?autoPlay=false']]){
 const context=await b.newContext({viewport:{width:960,height:640}});const p=await context.newPage();const row={name,url,hosts:[],requests:[],frames:[],popups:[],error:null};const hosts=new Set();
 p.on('request',r=>{const u=new URL(r.url());hosts.add(u.hostname);if(r.isNavigationRequest())row.requests.push({host:u.hostname,path:u.pathname});});context.on('page',popup=>{row.popups.push(popup.url());popup.close().catch(()=>{});});
 p.on('response',async r=>{try{const u=new URL(r.url());if(r.request().resourceType()==='script'&&/nxsha|screenscape/.test(u.hostname)&&count<40){const text=await r.text();if(text.length<3000000)fs.writeFileSync('qa-live/bundles/'+String(count++)+'.js',text);}}catch(e){}});
 try{const res=await p.goto(url,{timeout:25000,waitUntil:'domcontentloaded'});row.status=res?.status();await p.waitForTimeout(5000);row.finalUrl=p.url();row.text=(await p.locator('body').innerText()).slice(0,9000);row.frames=p.frames().map(f=>f.url());await p.screenshot({path:`qa-live/${name}.png`});
 const plays=p.getByRole('button',{name:/^(play|watch|start)/i});if(await plays.count()){await plays.first().click({timeout:2500}).catch(()=>{});await p.waitForTimeout(3000);row.framesAfter=p.frames().map(f=>f.url())}
 }catch(e){row.error=e.message}row.hosts=[...hosts];report.push(row);await context.close();}
 await b.close();fs.writeFileSync('qa-live/probe.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report.map(r=>({name:r.name,status:r.status,error:r.error,frames:r.frames,hosts:r.hosts})),null,2));})().catch(e=>{console.error(e);process.exit(1)});
