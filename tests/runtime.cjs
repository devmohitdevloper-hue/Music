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
 const make=(id,s,e)=>vm.runInContext(`STREAM_SERVERS.server2.buildUrl('tv',${id},${s},${e})`,c);
 assert(make(1399,1,2).includes('/tv/1399/1/2?'));
 assert(make(1399,2,1).includes('/tv/1399/2/1?'));
 assert.equal(vm.runInContext('EXPERIMENTAL_SERVER_ORDER.length',c),2);
 assert(!vm.runInContext('SERVER_ORDER.some(x=>STREAM_SERVERS[x].experimental)',c));
 assert.equal(vm.runInContext('new URLSearchParams(STREAM_SERVERS.server2.buildUrl("tv",1399,2,1).split("?")[1]).get("color")',c),'#8b6cff');
 console.log('PASS: in-flight dedup, persistent API cache, fallback cancellation, hedged proxy win, offline rejection, removed navigation, Server 2 season/episode paths, experimental opt-in.');
})().catch(e=>{console.error(e);process.exitCode=1});
