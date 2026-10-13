#!/usr/bin/env node
// Kitchen offline harness — headless Chrome over the DevTools protocol, no dependencies.
//
//   node tests/harness/run.js <probe.js> [--query=inst=1&...] [--fixture=tests/record-sheet.fixture.js]
//                                        [--out=results.txt] [--shots=dir] [--timeout=ms]
//
// NO NETWORK LEAVES THE MACHINE. index.html is served with:
//   * the jsdelivr supabase-js <script> replaced by tests/harness/stub-supabase.js (dead clients);
//   * the fixture inserted immediately before the boot IIFE, so it can replace vdExchange / sbv
//     before boot reads them;
//   * the probe appended after the page script.
// On top of that, every request the page makes to anything other than this local server is
// FAILED by the DevTools Fetch domain and listed in the output ("blocked: …"). A probe that
// needs a real gesture (audio unlock) asks for one with GET /__tap?x=&y= — a trusted input event.
// Screenshots: GET /__shot?n=name → <shots>/<name>.png. Results: POST /__results.
'use strict';
const http=require('http'),fs=require('fs'),path=require('path'),os=require('os'),{spawn}=require('child_process');
const ROOT=path.join(__dirname,'..','..');
const arg=k=>{const a=process.argv.find(x=>x.startsWith('--'+k+'='));return a?a.slice(k.length+3):null};
const probeFile=path.resolve(process.argv[2]);
const query=arg('query')??'inst=1';
const fixture=path.resolve(arg('fixture')||path.join(ROOT,'tests','record-sheet.fixture.js'));
const out=arg('out'),shots=arg('shots')||path.join(ROOT,'..','shots-kitchen'),TIMEOUT=+(arg('timeout')||240000);
const CHROME=process.env.CHROME||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

function page(){
  let h=fs.readFileSync(process.env.KITCHEN_INDEX||path.join(ROOT,'index.html'),'utf8');
  const cdn=/<script src="https:\/\/cdn\.jsdelivr\.net\/npm\/@supabase\/supabase-js@2\/dist\/umd\/supabase\.min\.js"><\/script>/;
  if(!cdn.test(h))throw new Error('supabase CDN tag not found — harness would not be network-free');
  h=h.replace(cdn,'<script src="/__stub-supabase.js"></script>');
  const boot=';(async function boot(){';
  if(h.indexOf(boot)<0)throw new Error('boot IIFE not found');
  h=h.replace(boot,'\n/* ── harness fixture ── */\n'+fs.readFileSync(fixture,'utf8')+'\n'+boot);
  return h.replace('</body>','<script src="/__probe.js"></script>\n</body>');
}
let ws,seq=0,probeServed=false;const pend={},blocked=[];
const cdp=(m,p)=>{const id=++seq;ws.send(JSON.stringify({id,method:m,params:p||{}}));return new Promise(r=>pend[id]=r)};
const T0=Date.now();
let done;const got=new Promise(r=>done=r);
// The overall bound starts NOW, before Chrome is launched, so a run can never hang on start-up or
// on the DevTools socket either.
const to=setTimeout(()=>done('HARNESS TIMEOUT after '+TIMEOUT+'ms'),TIMEOUT);
fs.mkdirSync(shots,{recursive:true});
const srv=http.createServer(async(q,s)=>{
  const u=new URL(q.url,'http://x');
  if(u.pathname==='/__shot'){const r=await cdp('Page.captureScreenshot',{format:'png'});
    fs.writeFileSync(path.join(shots,u.searchParams.get('n')+'.png'),Buffer.from(r.result.data,'base64'));s.end('ok');return}
  if(u.pathname==='/__tap'){const x=+u.searchParams.get('x'),y=+u.searchParams.get('y');
    for(const type of ['mousePressed','mouseReleased'])await cdp('Input.dispatchMouseEvent',{type,x,y,button:'left',clickCount:1});
    s.end('ok');return}
  if((u.pathname==='/__results'||u.pathname==='/sink')&&q.method==='POST'){let b='';q.on('data',d=>b+=d);q.on('end',()=>{s.end();console.error('harness: results posted +'+Math.round((Date.now()-T0)/1000)+'s');done(b)});return}
  if(u.pathname==='/__stub-supabase.js'){s.setHeader('content-type','text/javascript');s.end(fs.readFileSync(path.join(__dirname,'stub-supabase.js')));return}
  if(u.pathname==='/__probe.js'){probeServed=true;console.error('harness: probe served +'+Math.round((Date.now()-T0)/1000)+'s');s.setHeader('content-type','text/javascript');s.end(fs.readFileSync(probeFile));return}
  if(u.pathname==='/'||u.pathname==='/index.html'){s.setHeader('content-type','text/html; charset=utf-8');s.end(page());return}
  s.statusCode=404;s.end();
}).listen(0,'127.0.0.1',async()=>{
  const port=srv.address().port;
  // START-UP IS RETRIED. Under parallel load a headless Chrome occasionally never gets as far as
  // loading the page (observed: a whole batch of 5 produced no output and timed out, then passed
  // when re-run). If the page has not fetched the probe within START_MS, that Chrome is killed and
  // a fresh one launched — at most START_TRIES times. Only start-up is retried, never a probe that
  // ran: once the probe script has been served, its outcome is final.
  const START_MS=30000,START_TRIES=3;
  let ch=null,ud=null;
  const kill=()=>{try{ws&&ws.close()}catch(e){};try{ch&&ch.kill('SIGKILL')}catch(e){};try{ud&&fs.rmSync(ud,{recursive:true,force:true})}catch(e){}};
  async function launch(attempt){
    // Debug port derived from our own (unique) server port and the attempt, so parallel runs and
    // retries never collide.
    const dbg=20000+((port+attempt*7)%20000);
    ud=fs.mkdtempSync(path.join(os.tmpdir(),'hc-kitchen-'));
    ch=spawn(CHROME,['--headless=new','--mute-audio','--disable-gpu','--hide-scrollbars','--no-first-run','--user-data-dir='+ud,
      '--autoplay-policy=user-gesture-required','--remote-debugging-port='+dbg,'--window-size=1280,900','about:blank'],{stdio:'ignore'});
    let t;for(let i=0;i<75&&!t;i++){await new Promise(r=>setTimeout(r,200));try{t=(await (await fetch('http://127.0.0.1:'+dbg+'/json')).json()).find(x=>x.type==='page')}catch(e){}}
    if(!t)throw new Error('chrome did not start');
    ws=new WebSocket(t.webSocketDebuggerUrl);await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j});
    ws.onmessage=e=>{const m=JSON.parse(e.data);
      if(m.id&&pend[m.id]){pend[m.id](m);delete pend[m.id];return}
      if(m.method==='Fetch.requestPaused'){const url=m.params.request.url;
        if(url.startsWith('http://127.0.0.1:'+port+'/'))cdp('Fetch.continueRequest',{requestId:m.params.requestId});
        else{blocked.push(url);cdp('Fetch.failRequest',{requestId:m.params.requestId,errorReason:'BlockedByClient'})}}
      if(m.method==='Runtime.exceptionThrown'){const d=m.params.exceptionDetails;console.error('page exception:',(d.exception&&d.exception.description)||d.text)}};
    await cdp('Fetch.enable',{patterns:[{urlPattern:'*'}]});
    await cdp('Runtime.enable');
    await cdp('Emulation.setFocusEmulationEnabled',{enabled:true});
    // --size=WxH sets the exact CSS viewport (the layout probe reads innerWidth/innerHeight).
    if(arg('size')){const [W,Hh]=arg('size').split(/[x,]/).map(Number);
      await cdp('Emulation.setDeviceMetricsOverride',{width:W,height:Hh,deviceScaleFactor:1,mobile:false})}
    await cdp('Page.navigate',{url:'http://127.0.0.1:'+port+'/?'+query});
  }
  got.then(b=>{clearTimeout(to);
    const tail='\n\nnetwork: '+(blocked.length?blocked.length+' request(s) blocked — '+[...new Set(blocked)].join(', '):'no request left the local server');
    console.log(b+tail);if(out)fs.writeFileSync(out,b+tail+'\n');
    kill();srv.close();
    process.exit(/^FAIL |HARNESS TIMEOUT|WATCHDOG|stalled after/m.test(b)?1:0)});
  for(let attempt=0;attempt<START_TRIES&&!probeServed;attempt++){
    const t0=Date.now();
    try{await Promise.race([launch(attempt),new Promise((_,j)=>setTimeout(()=>j(new Error('start-up timed out')),START_MS))])}
    catch(e){console.error('harness: attempt '+(attempt+1)+' — '+e.message)}
    while(!probeServed&&Date.now()-t0<START_MS)await new Promise(r=>setTimeout(r,250));
    if(probeServed)break;
    console.error('harness: page did not load the probe within '+START_MS+'ms — relaunching Chrome');
    for(const k of Object.keys(pend))delete pend[k];
    kill();
  }
  if(!probeServed)done('HARNESS TIMEOUT — Chrome never loaded the page in '+START_TRIES+' attempts');
});
