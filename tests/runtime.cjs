const fs=require('fs'),vm=require('vm'),assert=require('assert');
process.chdir(require('path').join(__dirname,'..'));
const source=fs.readFileSync('js/common.js','utf8');
function context(fetch){const saved=new Map();const c=vm.createContext({fetch,AbortController,URLSearchParams,setTimeout,clearTimeout,console,localStorage:{getItem:k=>saved.get(k)||null,setItem:(k,v)=>saved.set(k,v)}});vm.runInContext(source,c);return c;}
(async()=>{
 let count=0;const c=context(async()=>{count++;return{ok:true,json:async()=>({results:[{id:1}]})}});
 await Promise.all([vm.runInContext('fetchJSON("https://test/cache")',c),vm.runInContext('fetchJSON("https://test/cache")',c)]);
 await vm.runInContext('fetchJSON("https://test/cache")',c);assert.equal(count,1,'request deduplication + persistent cache');
 await new Promise(r=>setTimeout(r,950));assert.equal(count,1,'cancel delayed fallback on direct success');
 let calls=[];const race=context((url,{signal})=>new Promise((resolve,reject)=>{calls.push(url);signal.addEventListener('abort',()=>reject(Error('aborted')));if(url.includes('workers.dev'))setTimeout(()=>resolve({ok:true,json:async()=>({winner:'proxy'})}),10)}));
 const start=Date.now();const result=await vm.runInContext('fetchJSON("https://test/slow")',race);assert.equal(result.winner,'proxy');assert(Date.now()-start<1800,'proxy should not wait for direct timeout');assert.equal(calls.length,2);
 const failed=context(async()=>{throw Error('offline')});await assert.rejects(vm.runInContext('fetchJSON("https://test/fail",20)',failed));
 const markup=vm.runInContext('shell("series","test")',c);assert(!/music.html|study.html/.test(markup));
 // Test player navigation with a deliberately minimal DOM, no claims of rendered QA.
 const nodes=new Map();function node(id){if(!nodes.has(id))nodes.set(id,{style:{},innerHTML:'',textContent:'',hidden:false,attributes:{},setAttribute(k,v){this.attributes[k]=v},getAttribute(k){return k==='src'?this.src:this.attributes[k]},classList:{toggle(){},add(){},remove(){}}});return nodes.get(id)}
 const w=vm.createContext({closeLibrary(){},openLibrary(){},getHistory:()=>[],historyKey:x=>JSON.stringify(x),saveHistory:x=>x,bottomNavHTML:()=>'',libraryPanelHTML:()=>'',window:{addEventListener(){}},URLSearchParams,location:{search:'?type=tv&id=123'},document:{getElementById:node,querySelector:()=>node('libraryButton'),querySelectorAll:()=>[]},localStorage:{getItem:()=>null,setItem(){}},icon:()=>'',themePanelHTML:()=>'',initTheme(){},SERVER_ORDER:['server1','server2'],STREAM_SERVERS:{server1:{buildUrl:(t,id,s,e)=>`https://video.example/${id}/${s}/${e}`},server2:{buildUrl:()=> 'https://video2.example/'}},FALLBACK_CATALOG:{movies:[],series:[]},TMDB:{tvDetails:()=>new Promise(()=>{})},Date});
 vm.runInContext(fs.readFileSync('js/watch.js','utf8'),w);
 assert.equal(node('frame').src,'https://video.example/123/1/1','playback starts before metadata');assert(!node('frame').attributes.sandbox.includes('allow-popups'));assert.equal(node('downloadBtn').hidden,true);
 vm.runInContext('episode=2;loadPlayer()',w);assert(node('frame').src.endsWith('/2'));
 node('server').onchange({target:{value:'server2'}});assert.equal(node('frame').src,'https://video2.example/');
 console.log('PASS: in-flight dedup, persistent API cache, fallback cancellation, hedged proxy win, offline rejection, removed navigation, immediate playback before metadata, popup sandbox, disabled fake download, episode and server switching.');
})().catch(e=>{console.error(e);process.exitCode=1});
