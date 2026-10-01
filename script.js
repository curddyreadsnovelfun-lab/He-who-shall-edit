const $=id=>document.getElementById(id),V=$('v'),TL=$('tl');
let file,url,dur=0,vw=0,vh=0,s=0,e=0,res='orig',cust=240,busy=false,prev=false,cancel=false,out=null;
const fmt=t=>{t=Math.max(0,t);const h=Math.floor(t/3600),m=String(Math.floor(t%3600/60)).padStart(2,'0'),x=(t%60).toFixed(3).padStart(6,'0');return h?`${h}:${m}:${x}`:`${m}:${x}`};
const parse=q=>{q=q.trim();if(!q)return NaN;const p=q.split(':').map(Number);return p.length>3||p.some(isNaN)?NaN:p.reduce((a,b)=>a*60+b,0)};
const mb=b=>b>=1e9?(b/1e9).toFixed(2)+' GB':(b/1e6).toFixed(b<1e7?1:0)+' MB';
const MT={mp4:['video/mp4;codecs=avc1.42E01E,mp4a.40.2','video/mp4;codecs=avc1','video/mp4'],webm:['video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm']};
const pick=f=>window.MediaRecorder?MT[f].find(m=>MediaRecorder.isTypeSupported(m)):undefined;
const RES=[['orig','Original'],[1440,'1440p (2K)'],[1080,'1080p'],[720,'720p'],[480,'480p'],[360,'360p'],[240,'240p · smallest'],['cust','Custom']];
const can=!!(pick('mp4')||pick('webm'));
const err=m=>{$('err').textContent=m;$('err').hidden=!m};

/* format list: disable what this browser can't record */
['mp4','webm'].forEach(f=>{const o=new Option(f.toUpperCase()+(pick(f)?'':' (not supported here)'),f);o.disabled=!pick(f);$('fmt').add(o)});
$('fmt').value=pick('mp4')?'mp4':'webm';
$('go').disabled=!can;
if(!can)err("This browser can't record video, so exporting is unavailable. Try a current Chrome, Edge, Firefox or Safari.");

/* loading */
function clearOut(){out=null;$('done').hidden=true}
function load(f){
  if(!f||busy)return;
  clearOut();V.removeAttribute('src');if(url)URL.revokeObjectURL(url);
  file=f;url=URL.createObjectURL(f);err('');V.src=url;
}
const fail=()=>{$('app').hidden=true;err(`This browser can't play ${file?file.name:'that file'}. MP4 and WebM work everywhere; MOV, AVI and MKV depend on the codecs inside.`)};
V.onerror=()=>{if(file)fail()};
V.onloadedmetadata=()=>{
  if(!V.videoWidth||!isFinite(V.duration))return fail();
  dur=V.duration;vw=V.videoWidth;vh=V.videoHeight;s=0;e=dur;res='orig';
  $('app').hidden=false;$('drop').classList.add('sm');$('dtxt').textContent='Choose a different video';
  const b=document.createElement('b');b.textContent=file.name;
  $('info').replaceChildren(b,` · ${vw}×${vh} (${Math.min(vw,vh)}p) · ${fmt(dur)} · ${mb(file.size)}`);
  $('cust').hidden=true;chips();draw();
};
$('file').onchange=ev=>{load(ev.target.files[0]);ev.target.value=''};
const dz=$('drop');
['dragenter','dragover'].forEach(n=>dz.addEventListener(n,ev=>{ev.preventDefault();dz.classList.add('over')}));
['dragleave','drop'].forEach(n=>dz.addEventListener(n,ev=>{ev.preventDefault();dz.classList.remove('over')}));
dz.addEventListener('drop',ev=>load(ev.dataTransfer.files[0]));
addEventListener('dragover',ev=>ev.preventDefault());
addEventListener('drop',ev=>ev.preventDefault());

/* timeline */
const pct=t=>(dur?t/dur*100:0)+'%';
function draw(){
  $('hs').style.left=pct(s);$('he').style.left=pct(e);
  $('rng').style.left=pct(s);$('rng').style.width=(dur?(e-s)/dur*100:0)+'%';
  $('ts').value=fmt(s);$('te').value=fmt(e);$('td').textContent=(e-s).toFixed(3)+' s';est();
}
const seek=t=>{if(!V.seeking)V.currentTime=t};
[['hs','s'],['he','e']].forEach(([id,w])=>{
  const h=$(id),set=t=>{if(w=='s')s=Math.min(Math.max(0,t),e-.1);else e=Math.max(Math.min(dur,t),s+.1);seek(w=='s'?s:e);draw()};
  h.onpointerdown=ev=>{ev.preventDefault();h.setPointerCapture(ev.pointerId);h.onpointermove=m=>{const r=TL.getBoundingClientRect();set((m.clientX-r.left)/r.width*dur)}};
  h.onpointerup=h.onpointercancel=()=>{h.onpointermove=null;V.currentTime=w=='s'?s:e};
  h.onkeydown=k=>{const d=k.key=='ArrowLeft'?-1:k.key=='ArrowRight'?1:0;if(d){k.preventDefault();set((w=='s'?s:e)+d*(k.shiftKey?1:.1))}};
});
TL.onpointerdown=ev=>{if(ev.target.classList.contains('h'))return;const r=TL.getBoundingClientRect();V.currentTime=Math.min(dur,Math.max(0,(ev.clientX-r.left)/r.width*dur))};
$('ts').onchange=()=>{const t=parse($('ts').value);if(!isNaN(t))s=Math.min(Math.max(0,t),e-.1);draw();V.currentTime=s};
$('te').onchange=()=>{const t=parse($('te').value);if(!isNaN(t))e=Math.max(Math.min(dur,t),s+.1);draw();V.currentTime=e};
const ph=()=>{$('ph').style.left=pct(V.currentTime);if(prev&&V.currentTime>=e){prev=false;V.pause()}};
const loop=()=>{ph();if(!V.paused)requestAnimationFrame(loop)};
V.onplay=loop;V.ontimeupdate=V.onseeked=ph;V.onpause=()=>{prev=false;ph()};
$('pv').onclick=()=>{prev=true;V.currentTime=s;V.play()};

/* resolution + estimate */
function chips(){
  const sh=Math.min(vw,vh);
  $('res').innerHTML=RES.map(([k,l])=>`<button type="button" data-k="${k}" class="${k===res?'on':''}" ${typeof k=='number'&&k>sh?'disabled title="Larger than the original"':''}>${l}</button>`).join('');
}
$('res').onclick=ev=>{const b=ev.target.closest('button');if(!b||b.disabled)return;const k=b.dataset.k;res=isNaN(k)?k:+k;$('cust').hidden=res!='cust';chips();est()};
$('cv').oninput=()=>{cust=Math.max(64,+$('cv').value||240);est()};
['q','au','fmt'].forEach(i=>$(i).onchange=est);
function rates(){
  const sh=Math.min(vw,vh),t=Math.min(res=='orig'?sh:res=='cust'?cust:res,sh),k=t/sh,ev=n=>Math.max(2,Math.round(n*k/2)*2),w=ev(vw),h=ev(vh),q=+$('q').value;
  return{w,h,v:Math.max(120e3,w*h*30*[.05,.09,.15][q]),a:$('au').value=='1'?[48e3,64e3,96e3][q]:0};
}
function est(){
  if(!file||!dur)return;
  const r=rates(),sz=(r.v+r.a)*(e-s)/8,red=Math.max(0,Math.round((1-sz/file.size)*100));
  $('est').innerHTML=`Output <b>${r.w}×${r.h}</b> <span class="mute">from ${vw}×${vh}</span><br>Estimated size <b>~${mb(sz)}</b> <span class="mute">· original ${mb(file.size)} · about ${red}% smaller · approximate</span>`;
}

/* export: play the selection into a scaled canvas and record it */
const once=(el,n)=>new Promise((ok,no)=>{el.addEventListener(n,ok,{once:true});el.addEventListener('error',()=>no(new Error('Could not read the video.')),{once:true})});
async function run(){
  const {w,h,v,a}=rates(),mime=pick($('fmt').value),st=s,dd=e-s;
  cancel=false;busy=true;clearOut();err('');V.pause();
  $('go').disabled=true;$('prog').hidden=false;
  const stage=p=>{$('pb').style.width=p*100+'%';$('pt').textContent=`Encoding ${Math.min(w,h)}p video… ${Math.round(p*100)}%`;$('ps').textContent=p>0?`About ${Math.max(1,Math.ceil(dd*(1-p)))} s remaining`:'Preparing…'};
  stage(0);
  const c=document.createElement('canvas');c.width=w;c.height=h;
  const g=c.getContext('2d');g.imageSmoothingQuality='high';
  const x=document.createElement('video');x.playsInline=true;x.preload='auto';x.muted=!a;x.src=url;
  let ac;
  try{
    await once(x,'loadeddata');
    if(st>0){x.currentTime=st;await once(x,'seeked')}
    const stream=c.captureStream(30);
    if(a){ac=new AudioContext();await ac.resume();const d=ac.createMediaStreamDestination();ac.createMediaElementSource(x).connect(d);d.stream.getAudioTracks().forEach(t=>stream.addTrack(t))}
    const rec=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:v,audioBitsPerSecond:a||undefined});
    const parts=[];rec.ondataavailable=ev=>{if(ev.data.size)parts.push(ev.data)};
    const fin=new Promise(ok=>rec.onstop=ok);
    g.drawImage(x,0,0,w,h);rec.start(1000);await x.play();
    await new Promise(ok=>{
      const step=()=>{
        if(cancel||x.ended||x.currentTime>=st+dd)return ok();
        g.drawImage(x,0,0,w,h);stage(Math.min(1,(x.currentTime-st)/dd));
        x.requestVideoFrameCallback?x.requestVideoFrameCallback(step):requestAnimationFrame(step);
      };step();
    });
    x.pause();if(rec.state!='inactive')rec.stop();await fin;
    if(!cancel){
      const blob=new Blob(parts,{type:mime.split(';')[0]}),ext=mime.startsWith('video/mp4')?'mp4':'webm';
      out={blob,name:`${file.name.replace(/\.[^.]+$/,'')}-${Math.min(w,h)}p.${ext}`};
      $('dt').textContent=`Finished — ${mb(blob.size)}, ${w}×${h}, ${ext.toUpperCase()}`;$('done').hidden=false;
    }
  }catch(ex){err('Export failed: '+(ex&&ex.message?ex.message:ex)+' Try again, or pick a different format.')}
  finally{
    x.pause();x.removeAttribute('src');x.load();if(ac)ac.close();
    busy=false;$('go').disabled=!can;$('prog').hidden=true;
  }
}
$('go').onclick=run;
$('cancel').onclick=()=>{cancel=true};
addEventListener('beforeunload',ev=>{if(busy){ev.preventDefault();ev.returnValue=''}});

/* save: hosted pages hand files to the viewer through the downloads capability */
$('save').onclick=async()=>{
  if(!out)return;
  try{
    const d=window.claude?await claude.use('downloads'):null;
    if(d){await d.save({filename:out.name,data:out.blob});return}
  }catch(x){if(x&&x.code=='declined')return}
  const a=document.createElement('a');a.href=URL.createObjectURL(out.blob);a.download=out.name;
  document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),6e4);
};
