// C1 STAGING strip — nothing operational is covered. Offline harness, network stubbed, staging build.
//   VITE_SUPABASE_URL=… VITE_SUPABASE_ANON_KEY=<staging-shaped key> node scripts/staging-config.mjs --out /tmp/k
//   KITCHEN_INDEX=/tmp/k/index.html node tests/harness/run.js tests/staging-strip.probe.js --query='inst=1'
// (tests/staging-strip.run.mjs does both.) Asserts, in a real Chrome at 1280×800, that the 22px
// strip intersects NO element carrying text — board, cards, lockout (with its language switch),
// verify sheet — and that every top-anchored overlay (.vfy, .ghost-tabs, .lockout, .audio-prompt,
// .lk-lang, .i18n-fail) starts at or below the strip.
(async()=>{
const T=[];let pass=0,fail=0;
const ok=(n,c,x)=>{c?pass++:fail++;T.push((c?'PASS  ':'FAIL  ')+n+(x?'   → '+x:''))};
const w=ms=>new Promise(r=>setTimeout(r,ms));
const done=async()=>{T.push('',pass+' passed, '+fail+' failed');await fetch('/__results',{method:'POST',body:T.join('\n')})};
try{
  await w(2500);
  const strip=document.getElementById('hcStaging');
  ok('STAGING strip present',!!strip,strip&&strip.textContent);
  const S=strip.getBoundingClientRect();
  ok('strip is the top 22px',Math.round(S.top)===0&&Math.round(S.bottom)===22,JSON.stringify([S.top,S.bottom]));
  ok('title says [STAGING]',document.title.indexOf('[STAGING] ')===0,document.title);
  const covered=()=>{const out=[];
    for(const el of document.querySelectorAll('body *')){
      if(el===strip||strip.contains(el))continue;
      const own=[...el.childNodes].some(n=>n.nodeType===3&&n.textContent.trim());
      if(!own)continue;
      const cs=getComputedStyle(el);if(cs.display==='none'||cs.visibility==='hidden'||+cs.opacity===0)continue;
      const r=el.getBoundingClientRect();if(!r.width||!r.height)continue;
      if(r.top<S.bottom&&r.bottom>S.top&&r.right>S.left&&r.left<S.right)out.push((el.id||el.className||el.tagName)+' "'+el.textContent.trim().slice(0,30)+'" top='+Math.round(r.top));
    }return out};
  const check=name=>{const c=covered();ok(name+': strip covers no text',c.length===0,c.slice(0,5).join(' | '))};
  const cards=Object.keys(window.cards||{});
  ok('fixture cards rendered',cards.length>0,cards.length+' cards');
  check('board');
  const hdr=document.querySelector('.hdr').getBoundingClientRect();
  ok('header starts below the strip',hdr.top>=22,'top='+hdr.top);
  // Lockout (with its language switch)
  if(typeof showLockout==='function'&&cards[0]){showLockout(cards[0]);await w(400);
    const lk=document.getElementById('lockout');
    ok('lockout open',lk.classList.contains('on'));
    ok('lockout starts below the strip',lk.getBoundingClientRect().top>=22,'top='+lk.getBoundingClientRect().top);
    const card=document.getElementById('lockoutContent').getBoundingClientRect();
    ok('lockout card below the strip',card.top>=22,'top='+card.top);
    check('lockout');
    const lang=document.querySelector('.lk-lang');
    if(lang&&lang.getBoundingClientRect().height)ok('lockout language switch below the strip',lang.getBoundingClientRect().top>=22,'top='+lang.getBoundingClientRect().top);
    lk.classList.remove('on');await w(200)}
  // Verify / record sheet
  if(typeof openRecord==='function'&&cards[0]){openRecord(cards[0]);await w(500);
    const v=[...document.querySelectorAll('.vfy')].find(e=>getComputedStyle(e).display!=='none');
    ok('record sheet open',!!v);
    if(v)ok('record sheet starts below the header + strip',v.getBoundingClientRect().top>=22+hdr.height-1,'top='+v.getBoundingClientRect().top+' hdr='+hdr.height);
    check('record sheet');
    if(typeof closeRecord==='function')closeRecord();await w(200)}
  // Overlays that are not open in this fixture: force-display to measure where they would sit.
  for(const sel of ['.ghost-tabs','.audio-prompt','.lk-lang','.i18n-fail','.vfy']){
    let el=document.querySelector(sel),made=false;
    if(!el){el=document.createElement('div');el.className=sel.slice(1);el.textContent='x';document.body.appendChild(el);made=true}
    const prev=el.style.display;el.style.display='block';
    const r=el.getBoundingClientRect();
    // inside a closed container (e.g. .lk-lang inside the closed lockout): measured in context above
    if(r.height)ok(sel+' top at or below the strip',r.top>=22,'top='+r.top);
    el.style.display=prev;if(made)el.remove()}
  check('final');
  ok('no page errors',!(window.__ERRS||[]).length,(window.__ERRS||[]).join(' | ').slice(0,300));
}catch(e){ok('EXCEPTION '+e.message,false,e.stack)}
await done()})();
