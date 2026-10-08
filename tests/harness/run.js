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
let ws,seq=0;const pend={},blocked=[];
const cdp=(m,p)=>{const id=++seq;ws.send(JSON.stringify({id,method:m,params:p||{}}));return new Promise(r=>pend[id]=r)};
let done;const got=new Promise(r=>done=r);
fs.mkdirSync(shots,{recursive:true});
const srv=http.createServer(async(q,s)=>{
  const u=new URL(q.url,'http://x');
  if(u.pathname==='/__shot'){const r=await cdp('Page.captureScreenshot',{format:'png'});
    fs.writeFileSync(path.join(shots,u.searchParams.get('n')+'.png'),Buffer.from(r.result.data,'base64'));s.end('ok');return}
  if(u.pathname==='/__tap'){const x=+u.searchParams.get('x'),y=+u.searchParams.get('y');
    for(const type of ['mousePressed','mouseReleased'])await cdp('Input.dispatchMouseEvent',{type,x,y,button:'left',clickCount:1});
    s.end('ok');return}
  if((u.pathname==='/__results'||u.pathname==='/sink')&&q.method==='POST'){let b='';q.on('data',d=>b+=d);q.on('end',()=>{s.end();done(b)});return}
  if(u.pathname==='/__stub-supabase.js'){s.setHeader('content-type','text/javascript');s.end(fs.readFileSync(path.join(__dirname,'stub-supabase.js')));return}
  if(u.pathname==='/__probe.js'){s.setHeader('content-type','text/javascript');s.end(fs.readFileSync(probeFile));return}
  if(u.pathname==='/'||u.pathname==='/index.html'){s.setHeader('content-type','text/html; charset=utf-8');s.end(page());return}
  s.statusCode=404;s.end();
}).listen(0,'127.0.0.1',async()=>{
  const port=srv.address().port,dbg=9300+Math.floor(Math.random()*600);
  const ud=fs.mkdtempSync(path.join(os.tmpdir(),'hc-kitchen-'));
  const ch=spawn(CHROME,['--headless=new','--disable-gpu','--hide-scrollbars','--no-first-run','--user-data-dir='+ud,
    '--autoplay-policy=user-gesture-required','--remote-debugging-port='+dbg,'--window-size=1280,900','about:blank'],{stdio:'ignore'});
  let t;for(let i=0;i<75&&!t;i++){await new Promise(r=>setTimeout(r,200));try{t=(await (await fetch('http://127.0.0.1:'+dbg+'/json')).json()).find(x=>x.type==='page')}catch(e){}}
  if(!t){console.error('chrome did not start');process.exit(2)}
  ws=new WebSocket(t.webSocketDebuggerUrl);await new Promise(r=>ws.onopen=r);
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
  const to=setTimeout(()=>done('HARNESS TIMEOUT after '+TIMEOUT+'ms'),TIMEOUT);
  got.then(b=>{clearTimeout(to);
    const tail='\n\nnetwork: '+(blocked.length?blocked.length+' request(s) blocked — '+[...new Set(blocked)].join(', '):'no request left the local server');
    console.log(b+tail);if(out)fs.writeFileSync(out,b+tail+'\n');
    ch.kill();srv.close();try{fs.rmSync(ud,{recursive:true,force:true})}catch(e){}
    process.exit(/FAIL|TIMEOUT|stalled/.test(b)?1:0)});
});
