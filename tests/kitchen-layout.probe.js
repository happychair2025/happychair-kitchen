// Spanish layout QA, run once per viewport (VW/VH) by the DevTools harness. Walks one fixture
// record through every Record Sheet state and every lockout stage, and checks each one for the
// failures found in visual review: header overflow, clipped labels, an off-screen action, a
// hidden rehearsal marker, colliding rail labels, and English interface text leaking through.
setTimeout(()=>{T.push('WATCHDOG');fetch('/__results',{method:'POST',body:T.join('\n')})},170000);
const T=[];let pass=0,fail=0;
const ok=(n,c,x)=>{c?pass++:fail++;T.push((c?'PASS  ':'FAIL  ')+n+(x!==undefined&&x!==''?'   → '+x:''))};
const w=ms=>new Promise(r=>setTimeout(r,ms)), hrs=h=>new Date(Date.now()-h*3600e3).toISOString();
const sh=()=>document.getElementById('verifyContent'), lk=()=>document.getElementById('lockoutContent');
const R=e=>e.getBoundingClientRect(), VW=innerWidth, VH=innerHeight;
const inside=(a,b,t)=>a.left>=b.left-(t||1)&&a.right<=b.right+(t||1)&&a.top>=b.top-(t||1)&&a.bottom<=b.bottom+(t||1);
const overlap=(a,b)=>a.left<b.right-1&&b.left<a.right-1&&a.top<b.bottom-1&&b.top<a.bottom-1;
async function hold(b){b.dispatchEvent(new MouseEvent('mousedown',{bubbles:true}));await w(1400);b.dispatchEvent(new MouseEvent('mouseup',{bubbles:true}));await w(400)}
function echo(id){const r=window.__ROWS.find(x=>x.id===id),c=cards[id];['kitchen_ack_at','kitchen_ack_by','protocol_confirmed_at','protocol_confirmed_by','verified_at','verified_by','served_at','status'].forEach(k=>{if(c[k]!==undefined)r[k]=c[k]})}
// English interface strings that must not appear in Spanish mode. Data is not in the catalog,
// so it is never matched; strings identical in both languages are skipped.
const EN_ONLY=Object.keys(I18N.en).map(k=>[k,I18N.en[k]]).filter(([k,v])=>v&&v.length>3&&v!==I18N.es[k]&&!/\{/.test(v));
function leaks(root){const t=root.innerText;return EN_ONLY.filter(([k,v])=>t.includes(v)).map(([k])=>k)}
function headerChecks(tag){
  const hdr=document.querySelector('.hdr'),hr=R(hdr);
  const kids=[...hdr.querySelectorAll('.hdr-logo,.hdr-venue,.hdr-clock,.lang-sw,.vd-st,.hb,.vol-ctrl,.hdr-btn')].filter(e=>e.offsetParent);
  ok(tag+' header: every control inside the viewport',kids.every(e=>R(e).right<=VW+1&&R(e).left>=-1),kids.filter(e=>R(e).right>VW+1).map(e=>e.className).join(','));
  ok(tag+' header: venue name on one line, not clipped vertically',(()=>{const v=document.getElementById('venueName');return R(v).height<=26&&R(v).top>=hr.top-1})());
  const ctrls=kids.filter(e=>!/hdr-venue/.test(e.className));
  ok(tag+' header: controls do not overlap',ctrls.every((a,i)=>ctrls.every((b,j)=>i===j||!overlap(R(a),R(b)))));
}
function holdFits(btn,tag){const lbl=btn.querySelector('.hold-lbl');
  ok(tag+' hold label fully inside its button',inside(R(lbl),R(btn),2),Math.round(R(lbl).height)+'/'+Math.round(R(btn).height));
  ok(tag+' hold button at least 52px tall',R(btn).height>=52,Math.round(R(btn).height));}
function sheetChecks(tag){
  const card=document.querySelector('#verify .vfy-card'),cr=R(card),hr=R(document.querySelector('.hdr'));
  ok(tag+' sheet starts below the header (EN | ES reachable)',cr.top>=hr.bottom-1,Math.round(cr.top)+' vs '+Math.round(hr.bottom));
  const reh=sh().querySelector('.vfy-reh');
  ok(tag+' REHEARSAL marker visible',!!reh&&R(reh).top>=cr.top-1&&R(reh).bottom<=VH);
  const act=sh().querySelector('.vfy-go')||sh().querySelector('.vfy-back');
  // The sheet is not blocking: on a long record it scrolls to the action rather than pinning a
  // footer over the guest notes. So: the action is reachable inside the card, and nothing
  // ever sits on top of the guest notes.
  act.scrollIntoView({block:'nearest'});
  const ar=R(act),cr2=R(card);
  ok(tag+' the action is reachable (scrolls fully into view inside the card)',ar.top>=cr2.top-1&&ar.bottom<=cr2.bottom+1&&ar.bottom<=VH+1,Math.round(ar.bottom)+' / '+Math.round(cr2.bottom));
  card.scrollTop=0;
  const notes=sh().querySelector('.al-notes');
  ok(tag+' nothing covers the guest notes',!notes||![...sh().querySelectorAll('.vfy-act,.vfy-do,.vfy-go,.vfy-prov')].some(e=>overlap(R(e),R(notes))));
  if(sh().querySelector('.vfy-go'))holdFits(sh().querySelector('.vfy-go'),tag);
  const labels=[...sh().querySelectorAll('.prog .plbl')];
  ok(tag+' rail labels do not collide',labels.every((a,i)=>i===0||!overlap(R(labels[i-1]),R(a))));
  const dots=[...sh().querySelectorAll('.prog .pd')].map(d=>Math.round(R(d).top));
  ok(tag+' rail stages aligned on one line',dots.every(y=>Math.abs(y-dots[0])<=1),dots.join(','));
  ok(tag+' no English interface text',leaks(sh()).length===0,leaks(sh()).join(','));
}
function lockoutChecks(tag){
  const L=document.getElementById('lockout');
  const sw=L.querySelector('.lk-lang'),reh=lk().querySelector('.lockout-reh');
  ok(tag+' lockout has its own EN | ES, inside the viewport',!!sw&&R(sw).right<=VW+1&&R(sw).top>=0);
  ok(tag+' lockout EN | ES does not cover the rehearsal marker',!!reh&&!overlap(R(sw),R(reh)));
  const act=lk().querySelector('.hold-btn')||lk().querySelector('.lockout-back');
  ok(tag+' lockout action in view without scrolling',R(act).bottom<=VH+1&&R(act).top>=0,Math.round(R(act).bottom)+' / '+VH);
  if(lk().querySelector('.hold-btn'))holdFits(lk().querySelector('.hold-btn'),tag);
  ok(tag+' no English interface text',leaks(lk()).length===0,leaks(lk()).join(','));
}
(async()=>{try{
 for(let i=0;i<80&&document.querySelectorAll('.row').length<3;i++)await w(100);
 await window.__realLoadVenue(); document.getElementById('audioPrompt').click(); await w(200);
 switchLocale('es'); await w(300);
 T.push('════ viewport '+VW+'×'+VH+' ════');
 headerChecks('[board]');
 ok('[board] no English interface text',leaks(document.getElementById('cardArea')).length===0&&leaks(document.querySelector('.hdr')).length===0&&leaks(document.getElementById('summaryBar')).length===0);
 ok('[board] summary items never split mid-phrase',[...document.querySelectorAll('#summaryBar span')].every(s=>R(s).height<=24));
 ok('[board] row actions fully inside their rows',[...document.querySelectorAll('.row .r-act')].every(b=>inside(R(b.querySelector('.hold-lbl')),R(b),2)));
 const X='lay0000-x';
 window.__ROWS.push({id:X,asset_id:'a1',table_label:'P4',zone_name:'Terrace',guest_name:'Tom',allergens:['Fish','Tree Nuts'],severity:'anaphylaxis',
   cross_contact:true,notes:'I get sick',status:'pending',created_at:hrs(.3),kitchen_ack_at:null,kitchen_ack_by:null,protocol_confirmed_at:null,
   protocol_confirmed_by:null,verified_at:null,verified_by:null,served_at:null,closed_at:null,superseded_at:null,supersedes_id:null,minimized_at:null,
   service_instance_id:'s1',service_kind:'rehearsal',is_open:true});
 await reconcile(); await w(300);
 openRecord(X); await w(300);
 for(const tag of ['[received]','[prep]','[second check]','[second check recorded]','[served recorded]']){
   sheetChecks(tag); const b=sh().querySelector('.vfy-go'); if(b){await hold(b);echo(X)}
 }
 closeRecord(); await w(150);
 const L2='lay0001-l';
 window.__ROWS.push(Object.assign({},window.__ROWS.find(x=>x.id===X),{id:L2,served_at:null,verified_at:null,protocol_confirmed_at:null,kitchen_ack_at:null,status:'pending'}));
 await reconcile(); await w(300); showLockout(L2); await w(250);
 for(const tag of ['[lockout received]','[lockout prep]','[lockout done]']){
   lockoutChecks(tag); const b=lk().querySelector('.hold-btn'); if(b){await hold(b);echo(L2)}
 }
}catch(e){T.push('THREW '+e.message+'\n'+(e.stack||''))}
 T.push(''); T.push(fail===0?('ALL '+pass+' CHECKS PASS'):(pass+' pass, '+fail+' FAIL'));
 try{await fetch('/__results',{method:'POST',body:T.join('\n')})}catch(e){}
})();
