// One Kitchen interaction contract: Received → Prep Confirmed → Second Check → Served.
// Offline fixture (record-sheet.fixture.js) plus records added here. B and C stand in for the two
// live Tom records and are NEVER acted on — they are the sibling-untouched control.
const T=[];let pass=0,fail=0;
const ok=(n,c,x)=>{c?pass++:fail++;T.push((c?'PASS  ':'FAIL  ')+n+(x!==undefined&&x!==''?'   → '+x:''))};
const H=s=>{T.push('');T.push('──── '+s+' ────')};
const w=ms=>new Promise(r=>setTimeout(r,ms));
const hrsAgo=h=>new Date(Date.now()-h*3600e3).toISOString();
const A='ba65384b-cccc',B='56a859b5-aaaa',C='7784ff89-bbbb';
const D='dddd0000-sev',E='eeee0000-anaph',F='ffff0000-prep',G='gggg0000-ackfail',Hh='hhhh0000-servefail';
const W=()=>window.__W__, wf=id=>W().filter(x=>x.__target===id), keys=x=>Object.keys(x).filter(k=>k[0]!=='_').sort().join(',');
const lk=()=>document.getElementById('lockout'), lkOn=()=>lk().classList.contains('on'), lkTxt=()=>document.getElementById('lockoutContent').innerText;
const lkBtn=()=>document.querySelector('#lockoutContent .hold-btn');
// Completed milestones are the .lk-ok lines — NOT a text match, which would also hit the
// "Hold to Confirm Prep Area Cleared" button label.
const lkDone=()=>[...document.querySelectorAll('#lockoutContent .lk-ok')].map(e=>e.textContent.trim().toUpperCase());
const shOn=()=>document.getElementById('verify').classList.contains('on'), sh=()=>document.getElementById('verifyContent'), shTxt=()=>sh().innerText;
const shBtn=()=>sh().querySelector('.vfy-go');
const row=id=>{const x=document.querySelector('[data-k="card:'+id+'"]');return x?x.querySelector('.row'):null};
const badge=id=>{const r=row(id);return !!(r&&r.querySelector('.r-reh'))};
const railDone=l=>{const p=[...sh().querySelectorAll('.prog .ps')].find(s=>s.querySelector('.plbl').textContent===l);return !!(p&&p.querySelector('.pd svg'))};
const md=b=>b.dispatchEvent(new MouseEvent('mousedown',{bubbles:true})), mu=b=>b.dispatchEvent(new MouseEvent('mouseup',{bubbles:true}));
async function hold(b,ms){md(b);await w(ms);mu(b);await w(250)}
function row0(id,o){return Object.assign({id:id,asset_id:'a2',table_label:'P9',zone_name:'Terrace',guest_name:'Fixture',
  allergens:['Sesame'],severity:'anaphylaxis',cross_contact:false,notes:null,status:'pending',created_at:ago(1),
  kitchen_ack_at:null,kitchen_ack_by:null,protocol_confirmed_at:null,protocol_confirmed_by:null,verified_at:null,
  verified_by:null,served_at:null,closed_at:null,superseded_at:null,supersedes_id:null,minimized_at:null,
  service_instance_id:'s1',service_kind:'rehearsal',is_open:true},o)}
// The database accepting a write, as the live board sees it: the row changes, then a raw
// postgres_changes UPDATE (table columns only — no service_kind) arrives.
function echo(id){const r=window.__ROWS.find(x=>x.id===id),c=cards[id];
  ['kitchen_ack_at','kitchen_ack_by','protocol_confirmed_at','protocol_confirmed_by','verified_at','verified_by','served_at','status'].forEach(k=>{if(c[k]!==undefined)r[k]=c[k]});
  const raw=Object.assign({},r);['service_kind','table_label','zone_name','is_open'].forEach(k=>delete raw[k]);raw.venue_id='v';
  (window.__RT||[]).filter(h=>h.flt&&h.flt.event==='UPDATE').forEach(h=>h.cb({new:raw}))}
async function churn(){echo.last&&0;await w(5600);await vdExchange();await w(250);renderCards();await w(100)}
const refuse=()=>{sbv.from=function(){return {update:function(v){W().push(Object.assign({__refused:1},v));return {eq:function(){return Promise.resolve({error:{message:'refused'}})}}}}}};
const hang=()=>{sbv.from=function(){return {update:function(v){W().push(Object.assign({__hung:1},v));return {eq:function(){return new Promise(function(){})}}}}}};

setTimeout(()=>{T.push('WATCHDOG — stalled after the last line above');fetch('/__results',{method:'POST',body:T.join('\n')})},150000);
// Since the shared-ingest change (refactor decision 1) every un-acknowledged anaphylaxis record
// raises its own lockout on load, and they queue one at a time. So "no lockout popped" is asserted
// as "this action did not change which lockout is up", and leaving one lockout opens the next.
// W2-K1 (lockout priority): an un-acknowledged anaphylaxis record now takes the screen from a lockout
// at a routine step. The in-place confirmation contract on A is therefore exercised with no OTHER owed
// record on the board: E and G (both owed anaphylaxis) are added only when their own sections begin.
// Ordering itself is covered by lockout-priority.probe.js.
const lkState=()=>lkOn()?lockoutId+'|'+lockoutStage:'closed';
(async()=>{try{
 for(let i=0;i<80&&document.querySelectorAll('.row').length<3;i++)await w(100);
 await window.__realLoadVenue();
 window.__ROWS.push(row0(D,{severity:'severe',guest_name:'Dee',allergens:['Fish']}),
   row0(F,{guest_name:'Fay',kitchen_ack_at:ago(.5),kitchen_ack_by:'Kitchen Display',status:'acknowledged'}),
   row0(Hh,{severity:'severe',guest_name:'Hal',kitchen_ack_at:ago(.5),verified_at:ago(.2),status:'acknowledged'}));
 await reconcile(); await w(300);
 const ANON=[]; const realSbFrom=sb.from.bind(sb);
 sb.from=function(t){const q=realSbFrom(t);['update','insert','upsert','delete'].forEach(m=>{const f=q[m];q[m]=function(){ANON.push(t+'.'+m);return f.apply(q,arguments)}});return q};
 const Bsnap=JSON.stringify(cards[B]),Csnap=JSON.stringify(cards[C]),realFrom=sbv.from;
 ok('setup: 6 records on the board',document.querySelectorAll('.row').length===6,document.querySelectorAll('.row').length);

 H('1 · LOCKOUT · CONFIRM RECEIVED (A, keyboard)');
 showLockout(A); await w(150);
 ok('lockout up on A with REHEARSAL',lkOn()&&/REHEARSAL · NOT A GUEST/.test(lkTxt()));
 let n=W().length; await hold(lkBtn(),300);
 ok('early release = zero writes',W().length===n);
 const kb=lkBtn(); kb.focus(); kb.dispatchEvent(new KeyboardEvent('keydown',{key:' ',bubbles:true})); await w(1400);
 kb.dispatchEvent(new KeyboardEvent('keyup',{key:' ',bubbles:true})); await w(250);
 ok('keyboard hold = exactly one write',W().length===n+1,W().length-n);
 ok('...kitchen_ack_at/by + status, to A',wf(A).length===1&&keys(wf(A)[0])==='kitchen_ack_at,kitchen_ack_by,status');

 H('3 · RECEIVED CONFIRMED IN PLACE (same lockout card)');
 ok('lockout still up, still A',lkOn()&&lockoutId===A);
 ok('states Allergy Received',lkDone().join('|')==='ALLERGY RECEIVED');
 ok('context kept: P4, guest, allergens, ANAPHYLAXIS',/P4/.test(lkTxt())&&/CLOSURE T\./.test(lkTxt())&&/Sesame, Peanut/.test(lkTxt())&&/ANAPHYLAXIS/.test(lkTxt()));
 ok('Avoid all / check-ingredients blocks kept',/Avoid all — Sesame/i.test(lkTxt())&&/Peanut — Check ingredients/i.test(lkTxt()));
 ok('REHEARSAL kept',/REHEARSAL · NOT A GUEST/.test(lkTxt()));
 ok('next requirement exposed with no extra click',/Hold to Confirm Prep Area Cleared/.test(lkTxt()));
 echo(A); await churn();
 ok('poll + token refresh + live update: confirmation survives',lkOn()&&lockoutId===A&&lkDone().join('|')==='ALLERGY RECEIVED'&&/Hold to Confirm Prep Area Cleared/.test(lkTxt()));

 H('1 · LOCKOUT · CONFIRM PREP AREA CLEARED IS A HOLD');
 const pb=lkBtn();
 ok('is a <button> with hold wiring, no onclick',pb.tagName==='BUTTON'&&!pb.getAttribute('onclick')&&/startHold\([^)]*'prep'\)/.test(pb.getAttribute('onmousedown')));
 ok('has visible progress fill',!!pb.querySelector('.hold-fill'));
 ok('carries touch, leave, blur and key cancels',['ontouchstart','ontouchend','ontouchcancel','onmouseleave','onblur','onkeydown','onkeyup'].every(a=>pb.hasAttribute(a)));
 n=W().length; pb.click(); await w(300); ok('a single tap writes nothing',W().length===n);
 await hold(pb,300); ok('early release writes nothing',W().length===n);
 md(pb); await w(500); pb.dispatchEvent(new MouseEvent('mouseleave',{bubbles:true})); await w(900); ok('leaving the button cancels',W().length===n);
 pb.focus(); pb.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true})); await w(400); pb.blur(); await w(1000);
 ok('blur cancels a keyboard hold',W().length===n);
 md(pb); await w(250); const fillMid=parseFloat(pb.querySelector('.hold-fill').style.width); await w(300);
 await reconcile(); renderCards(); await w(50);
 ok('progress visible mid-hold',fillMid>4,fillMid+'%');
 ok('a poll mid-hold does not replace the control',lkBtn()===pb&&document.body.contains(pb));
 await w(800); mu(pb); await w(250);
 ok('completed hold = exactly one write',W().length===n+1,W().length-n);
 ok('...protocol_confirmed_at/by only, to A',keys(W()[W().length-1])==='protocol_confirmed_at,protocol_confirmed_by'&&W()[W().length-1].__target===A);
 ok('lockout confirms in place: Received ✓ + Prep Area Cleared ✓',lkOn()&&lockoutId===A&&lkDone().join('|')==='ALLERGY RECEIVED|PREP AREA CLEARED');
 ok('names the next step briefly, no action performed for them',/Next: Second Check\./.test(lkTxt())&&!lkBtn());
 ok('context + REHEARSAL kept',/CLOSURE T\./.test(lkTxt())&&/REHEARSAL · NOT A GUEST/.test(lkTxt()));
 echo(A); await churn();
 ok('poll + token refresh + live update: survives',lkOn()&&lkDone().join('|')==='ALLERGY RECEIVED|PREP AREA CLEARED');
 n=W().length; document.querySelector('#lockoutContent .lockout-back').click(); await w(150);
 ok('Back to Kitchen Board closes it, zero writes',lockoutId!==A&&W().length===n);
 ok('...and with nothing else owed, the lockout closes',!lkOn(),lkState());
 ok('A row badge survives Received → Prep',badge(A));

 H('3 · SHEET · NON-ANAPHYLAXIS RECEIVED (D)');
 openRecord(D); await w(200); n=W().length; let lk0=lkState();
 await hold(shBtn(),300); ok('early release = zero writes',W().length===n);
 await hold(shBtn(),1400);
 ok('exactly one ack write to D',W().length===n+1&&wf(D).length===1);
 ok('no lockout popped',lkState()===lk0,lk0+' → '+lkState());
 ok('sheet stayed open on D',shOn()&&recordOpenId===D);
 ok('Allergy Received confirmed visibly (not a toast)',!!sh().querySelector('.vfy-ok')&&/Allergy Received/.test(sh().querySelector('.vfy-ok').innerText));
 ok('next requirement is Second Check (no prep for severe)',/Hold to Record Second Check/.test(shTxt()));
 ok('rail: Received and Confirmed complete',railDone('Received')&&railDone('Confirmed'));
 echo(D); await churn();
 ok('poll + token + live update: banner survives, REHEARSAL kept',/Allergy Received/.test(shTxt())&&/REHEARSAL · NOT A GUEST/.test(shTxt())&&badge(D));

 H('2 · SECOND CHECK (preserved) THEN SERVED ON D');
 n=W().length; await hold(shBtn(),1400);
 ok('Second Check: one write, success sheet unchanged',W().length===n+1&&/Second Check Recorded/.test(shTxt())&&/Mark served when the dish leaves the kitchen\./.test(shTxt()));
 echo(D); await w(200);
 await hold(shBtn(),300); ok('Mark Served early release = zero writes',W().length===n+1);
 await hold(shBtn(),1400);
 ok('Mark Served: exactly one write, served_at + status',W().length===n+2&&keys(W()[W().length-1])==='served_at,status'&&W()[W().length-1].__target===D);
 ok('sheet did NOT auto-close',shOn()&&recordOpenId===D);
 ok('title: Served Recorded',sh().querySelector('.vfy-t').textContent.trim()==='Served Recorded');
 ok('rail: all four complete',['Received','Confirmed','Second Check','Served'].every(railDone));
 ok('one closing line: Kitchen steps complete',/Kitchen steps complete\./.test(shTxt())&&!/The Kitchen workflow/.test(shTxt()));
 ok('names the authenticated display, never a person',/Kitchen Display · Happy Bistro — records the display, not the person\./.test(shTxt()));
 ok('no guest-delivery, safety or closure claim',!/\bsafe|delivered|guest (received|ate|was served)|closed|protected|guarantee/i.test(shTxt()));
 ok('REHEARSAL kept',/REHEARSAL · NOT A GUEST/.test(shTxt()));
 ok('only exit is Back to Kitchen Board',!shBtn()&&/Back to Kitchen Board/.test(sh().querySelector('.vfy-back').textContent));
 echo(D); await churn();
 ok('poll + token + live update: Served Recorded survives',shOn()&&/Served Recorded/.test(shTxt())&&/REHEARSAL/.test(shTxt()));
 ok('D row badge survives to Served',badge(D));
 n=W().length; sh().querySelector('.vfy-back').click(); await w(150);
 ok('Back closes, zero writes',!shOn()&&W().length===n);

 H('3 · SHEET · ANAPHYLAXIS RECEIVED → PREP (E): no screen swap');
 window.__ROWS.push(row0(E,{guest_name:'Eve'})); await reconcile(); await w(300);
 ok('E (owed anaphylaxis) raises its own lockout',lkOn()&&lockoutId===E&&lockoutStage==='ack',lkState());
 openRecord(E); await w(200); lk0=lkOn()?lockoutId:'closed'; await hold(shBtn(),1400);
 ok('ack on E from the sheet does NOT pop the lockout',(lkOn()?lockoutId:'closed')===lk0&&(lk0!==E||lockoutStage!=='ack'),lk0+' → '+lkState());
 ok('Allergy Received banner + next is the prep hold',/Allergy Received/.test(shTxt())&&/Hold to Confirm Prep Area Cleared/.test(shTxt()));
 echo(E); await hold(shBtn(),1400);
 ok('prep from the sheet: Prep Area Cleared banner, next Second Check',/Prep Area Cleared/.test(shTxt())&&/Hold to Record Second Check/.test(shTxt()));
 ok('E writes: exactly ack then prep',wf(E).map(keys).join(' | ')==='kitchen_ack_at,kitchen_ack_by,status | protocol_confirmed_at,protocol_confirmed_by');
 closeRecord(); await w(100);

 H('FAILED AND HUNG WRITES NEVER CLAIM COMPLETION');
 showLockout(F); showLockoutProtocol(F); await w(100); refuse();
 await hold(lkBtn(),1400);
 ok('lockout prep refused: no Prep Area Cleared',lkDone().join('|')==='ALLERGY RECEIVED',lkDone().join('|'));
 ok('...error shown ON the lockout, prep hold still offered',!!document.querySelector('#lockoutContent .lk-err')&&/NOT recorded/.test(lkTxt())&&/Hold to Confirm Prep Area Cleared/.test(lkTxt()));
 ok('...F protocol_confirmed_at reverted',!cards[F].protocol_confirmed_at);
 hang(); await hold(lkBtn(),1400); await w(400);
 ok('lockout prep hung: never claims Prep Area Cleared',lkDone().join('|')==='ALLERGY RECEIVED'&&/Hold to Confirm Prep Area Cleared/.test(lkTxt()));
 sbv.from=realFrom; closeLockout();
 window.__ROWS.push(row0(G,{guest_name:'Gus'})); await reconcile(); await w(300);
 openRecord(G); await w(200); lk0=lkState(); refuse(); await hold(shBtn(),1400);
 ok('sheet ack refused: no banner, error shown, ack hold still offered',!sh().querySelector('.vfy-ok')&&/Received NOT recorded/.test(shTxt())&&/Hold to Confirm Allergy Received/.test(shTxt()));
 ok('...no lockout popped',lkState()===lk0,lk0+' → '+lkState());
 delete cards[G]._error; closeRecord(); openRecord(G); await w(150); hang(); await hold(shBtn(),1400); await w(500);
 ok('sheet ack hung: no banner, never offers the next step',!sh().querySelector('.vfy-ok')&&!/Prep Area Cleared/.test(shTxt())&&/Hold to Confirm Allergy Received/.test(shTxt()));
 sbv.from=realFrom; closeRecord();
 openRecord(Hh); await w(200); refuse(); await hold(shBtn(),1400);
 ok('Mark Served refused: no Served Recorded, error shown, hold still offered',!/Served Recorded/.test(shTxt())&&/Served NOT recorded/.test(shTxt())&&/Hold to Mark Served/.test(shTxt()));
 ok('...served_at reverted',!cards[Hh].served_at);
 delete cards[Hh]._error; closeRecord(); openRecord(Hh); await w(150); hang(); await hold(shBtn(),1400); await w(500);
 ok('Mark Served hung: never claims Served Recorded',!/Served Recorded/.test(shTxt())&&shOn());
 sbv.from=realFrom; closeRecord();

 H('NO ANONYMOUS KITCHEN WRITES');
 ok('no write ever went through the anonymous client',ANON.length===0,ANON.join(','));
 const jwt=vdJwt; vdJwt=null; n=W().length;
 const X=Object.keys(cards).find(id=>!cards[id].kitchen_ack_at&&!cards[id]._writing&&id!==A&&id!==B&&id!==C);
 if(X){openRecord(X);await w(150);await hold(shBtn(),1400);}
 ok('unpaired display: a completed hold writes nothing',W().length===n&&ANON.length===0,X);
 vdJwt=jwt; closeRecord();

 H('SIBLINGS (stand-ins for the live Tom records)');
 ok('B: zero writes, state identical',wf(B).length===0&&JSON.stringify(cards[B])===Bsnap);
 ok('C: zero writes, state identical',wf(C).length===0&&JSON.stringify(cards[C])===Csnap);
 ok('B and C keep REHEARSAL badges',badge(B)&&badge(C));
}catch(e){T.push('THREW '+e.message+'\n'+(e.stack||''))}
 T.push(''); T.push(fail===0?('ALL '+pass+' CHECKS PASS'):(pass+' pass, '+fail+' FAIL'));
 try{await fetch('/__results',{method:'POST',body:T.join('\n')})}catch(e){}
})();
