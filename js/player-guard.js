// Injected at document start by the APK, including nested HTTPS player frames.
(()=>{
 if(window===window.top)return;
 const token=window.__MS_TOKEN;
 try{Object.defineProperty(window,'open',{value:()=>null,writable:false,configurable:false})}catch(e){window.open=()=>null}
 const adSelectors='[data-ad-slot],[data-ad-client],.adsbygoogle,.ad-container,.ad-overlay,.advertisement,#ad-container,#ad-overlay,iframe[src*="doubleclick.net"],iframe[src*="popads.net"],iframe[src*="googlesyndication.com"]';
 function clean(){document.querySelectorAll(adSelectors).forEach(el=>{el.remove()})}
 document.addEventListener('click',e=>{const a=e.target.closest?.('a');if(a&&(a.target==='_blank'||/^(intent:|market:)/i.test(a.href))){e.preventDefault();e.stopImmediatePropagation()}},true);
 const attached=new WeakSet();let scheduled=false;
 function scan(){scheduled=false;clean();document.querySelectorAll('video').forEach(attach)}
 function schedule(){if(!scheduled){scheduled=true;requestAnimationFrame(scan)}}
 new MutationObserver(schedule).observe(document,{childList:true,subtree:true});
 function attach(video){
  if(attached.has(video))return;attached.add(video);
  const key=Math.random().toString(36).slice(2);let session='',resume=0,restored=false,played=false,last=0;
  function eligible(){return Number.isFinite(video.duration)&&video.duration>=60&&!video.closest(adSelectors)}
  function hello(){if(eligible()&&!session)window.top.postMessage({kind:'MS_VIDEO_READY',token,videoKey:key},'*')}
  function restore(){if(!session||restored||!eligible())return;try{if(resume>0&&resume<video.duration-10)video.currentTime=resume;restored=true}catch(e){}}
  window.addEventListener('message',e=>{const m=e.data;if(e.source!==window.top||m?.token!==token||m.kind!=='MS_VIDEO_CONFIG'||m.videoKey!==key)return;session=m.session;resume=Math.max(0,Number(m.position)||0);restore()});
  function send(force=false){if(!played||!session||!eligible()||(!force&&Date.now()-last<2000))return;last=Date.now();window.top.postMessage({kind:'MS_VIDEO_PROGRESS',token,session,position:video.currentTime,duration:video.duration},'*')}
  video.addEventListener('loadedmetadata',()=>{hello();restore()});video.addEventListener('canplay',()=>{hello();restore()});
  video.addEventListener('playing',()=>{played=true;hello();restore();send(true)});
  video.addEventListener('timeupdate',()=>{if(!video.paused)send()});
  ['pause','seeked','ended'].forEach(name=>video.addEventListener(name,()=>send(true)));
  window.addEventListener('pagehide',()=>send(true));document.addEventListener('visibilitychange',()=>{if(document.hidden)send(true)});
  hello();
 }
 document.addEventListener('DOMContentLoaded',scan);scan();
})();
