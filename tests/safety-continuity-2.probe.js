// W1-3 Safety continuity, part 2 — after the client-side merge was REMOVED (integrator decision
// following the second verification failure). Same offline harness; all network stubbed.
//   node tests/harness/run.js tests/safety-continuity-2.probe.js --query='inst=1&rows=none'
// (f) two declarations at one table and guest session → two cards, two lockouts, each acknowledged
//     separately; the second never changes the first; an honest count cue; supersession replaces.
// (j) becoming acknowledged (elsewhere, or by a late commit) never sounds the alarm (verifier J, M2, K).
// (o) another declaration while an ack is in flight: the ack lands on its own record only (O).
// (p) a write resolving after its record's content changed, or after it was superseded, is stale:
//     no chime, no stage drawn from it, the database state shown with a notice (P, B).
// (q) a guarded write matched nothing and the re-read failed → "Couldn't confirm", never "NOT recorded" (D).
// (r) a hold on changed content is cancelled for every severity (R, E).
// (s) verifier round 3 · 6b: a record superseded only by a successor's supersedes_id — the hold
//     writes nothing, it leaves every band and the cue, milestone calls on it write nothing, and the
//     successor carries an honest notice.
// (t) · E: a lockout record that stops being anaphylaxis closes its lockout; no ANAPHYLAXIS chip.
// (u) · F: an INSERT during an in-flight board read is not pruned by that read; a further read runs.
// (v) verifier round 4 · X1/X2: a supersedes_id from another table or guest session is ignored —
//     the named record stays live, owed and alarming, and the naming row is not shown as UPDATED.
// (w) · C1/C2/C3: a chain A ← B ← C hides A when only B's superseded_at landed (A never reaches the
//     lockout and is never written); A does not come back when its successor leaves the board.
// (x) round 5 · S1 self-reference, S2 cycle, and an OLDER "successor" — none hides anything.
// (y) round 5 · reload: the supersession registry travels with the cache (A stays hidden before any
//     board read); a hold on an unconfirmed cached card writes nothing and says "Checking with the
//     server yet — nothing was recorded."; after the read A is still hidden and C is owed.
const SS='hc_probe_w13b';
const st=JSON.parse(sessionStorage.getItem(SS)||'{"T":[],"pass":0,"fail":0}');
const T=st.T;
// ?cold=1 runs only (c), in a fresh browser profile: a display booting with no prior engagement.
if(location.search.indexOf('cold=1')>=0&&!st.phase){st.phase='c';st.cold=true;T.push('════ COLD BOOT (fresh profile, no prior engagement) ════')}
const ok=(n,c,x)=>{c?st.pass++:st.fail++;T.push((c?'PASS  ':'FAIL  ')+n+(x!==undefined&&x!==''?'   → '+x:''))};
const H=s=>{T.push('');T.push('──── '+s+' ────')};
const w=ms=>new Promise(r=>setTimeout(r,ms));
const until=async(f,ms,step)=>{const t0=Date.now();while(Date.now()-t0<ms){if(f())return Date.now()-t0;await w(step||50)}return -1};
const shot=n=>fetch('/__shot?n='+(st.cold?'cold-':'')+n);
const tap=(x,y)=>fetch('/__tap?x='+Math.round(x)+'&y='+Math.round(y));
const minsAgo=m=>new Date(Date.now()-m*60e3).toISOString();
const lkOn=()=>document.getElementById('lockout').classList.contains('on');
const lkTxt=()=>document.getElementById('lockoutContent').innerText;
const lkBtn=()=>document.querySelector('#lockoutContent .hold-btn');
const lkQ=()=>{const e=document.getElementById('lkQueue');return e&&!e.hidden?e.textContent:''};
const DW=id=>(window.__DW__||[]).filter(x=>x.__target===id);
const MW=id=>(window.__W__||[]).filter(x=>x.__target===id);
const md=b=>b.dispatchEvent(new MouseEvent('mousedown',{bubbles:true})), mu=b=>b.dispatchEvent(new MouseEvent('mouseup',{bubbles:true}));
async function hold(b,ms){md(b);await w(ms||1350);mu(b);await w(200)}
function rowObj(id,o){return Object.assign({id:id,asset_id:'a-'+id,table_label:'P5',zone_name:'Terrace',guest_name:'Probe Guest',
  allergens:['Sesame'],severity:'anaphylaxis',cross_contact:false,notes:null,status:'pending',created_at:ago(1),
  kitchen_ack_at:null,kitchen_ack_by:null,protocol_confirmed_at:null,protocol_confirmed_by:null,verified_at:null,
  verified_by:null,served_at:null,closed_at:null,superseded_at:null,supersedes_id:null,minimized_at:null,
  service_instance_id:'s1',service_kind:'live',is_open:true},o)}
// The database accepting a write: the board read returns what was written (the socket stays dead).
function persist(id){const r=window.__ROWS.find(x=>x.id===id),c=cards[id];if(!r||!c)return;
  ['kitchen_ack_at','kitchen_ack_by','protocol_confirmed_at','protocol_confirmed_by','verified_at','verified_by','served_at','status'].forEach(k=>{if(c[k])r[k]=c[k]})}
const alarms=[];
const _ca=chimeAnaphylaxis;chimeAnaphylaxis=function(){alarms.push(Date.now());return _ca.apply(this,arguments)};
const insertHandlers=()=>(window.__RT||[]).filter(h=>h.flt&&h.flt.event==='INSERT');
async function done(){
  T.push('');T.push(st.fail===0?('ALL '+st.pass+' CHECKS PASS'):(st.pass+' pass, '+st.fail+' FAIL'));
  sessionStorage.removeItem(SS);
  await fetch('/__results',{method:'POST',body:T.join('\n')});
}
setTimeout(()=>{T.push('WATCHDOG — stalled after the last line above');fetch('/__results',{method:'POST',body:T.join('\n')})},330000);

(async()=>{try{
 if(st.phase==='reload'){
  H('(y) RELOAD — before the first board read');
  const YA='ya000000-a',YC='yc000000-c';
  await until(()=>typeof reconcile==='function'&&!!cards[YC],4000);await w(150);
  ok('no board read yet (the cache is all the board has)',lastReconcileOk===0);
  ok('A restored from the cache is still hidden (registry travelled with the cache)',!document.querySelector('[data-k="card:'+YA+'"]')&&!(cards[YA]&&lockoutEligible(cards[YA])));
  ok('C from the cache is shown but not escalated',!!document.querySelector('[data-k="card:'+YC+'"]')&&!lockoutEligible(cards[YC])&&!lkOn());
  const nC=MW(YC).length;
  const yb=document.querySelector('[data-k="card:'+YC+'"] .row .hold-btn');
  if(yb){md(yb);await w(1350);mu(yb);await w(250)}
  await doAck(YA,'row');await w(150);
  ok('a hold on an unconfirmed cached card writes NOTHING',MW(YC).length===nC&&MW(YA).length===0);
  ok('…and says so on the row: "Not confirmed with the server yet — nothing was recorded."',/Not confirmed with the server yet — nothing was recorded\./.test(document.querySelector('[data-k="card:'+YC+'"]').innerText));
  await shot('y-cache-checking');
  H('(y) RELOAD — after the first board read');
  await until(()=>lastReconcileOk>0,8000);await w(300);
  ok('A still hidden and never written',!document.querySelector('[data-k="card:'+YA+'"]')&&!(cards[YA]&&lockoutEligible(cards[YA]))&&MW(YA).length===0);
  ok('C confirmed: live, owed, on the lockout',!cards[YC]._fromCache&&lockoutEligible(cards[YC])&&(lockoutId===YC||lockoutQueue.indexOf(YC)>=0));
  await done();return;
 }
 await until(()=>typeof reconcile==='function'&&paired()&&lastReconcileOk>0,8000);
 H('SETUP');
 const ap=document.getElementById('audioPrompt');const r0=ap.getBoundingClientRect();await tap(r0.left+r0.width/2,r0.top+r0.height/2);
 ok('a real tap unlocks audio',await until(()=>audioReady&&ctx&&ctx.state==='running',3000)>=0);
 // ── (f) ───────────────────────────────────────────────────────────────────────────────────
 H('(f) TWO DECLARATIONS AT ONE TABLE, ONE GUEST SESSION — NO MERGING');
 const F1='f1000000-first',F2='f2000000-second',F3='f3000000-correction',FS='sess-f1',FA='asset-f1';
 const fRow=(id,o)=>rowObj(id,Object.assign({guest_session_id:FS,asset_id:FA,table_label:'P7',zone_name:'Terrace',guest_name:'Same Guest'},o));
 const rawRow=r=>{const x=Object.assign({},r);['table_label','zone_name','service_kind','is_open'].forEach(k=>delete x[k]);x.venue_id='v';return x};
 window.__ROWS.push(fRow(F1,{allergens:['Sesame']}));
 await until(()=>lockoutId===F1,RECONCILE_MS+2000);
 ok('first record on the lockout',lockoutId===F1&&lockoutStage==='ack');
 // the second arrives WHILE the cook is holding Confirm Received on the first
 let f0=alarms.length;md(lkBtn());await w(500);
 const f2=fRow(F2,{allergens:['Peanut']});window.__ROWS.push(f2);insertHandlers().forEach(h=>h.cb({new:rawRow(f2)}));
 await w(1000);mu(lkBtn()||document.body);await w(250);
 ok('two cards, not one',!!cards[F1]&&!!cards[F2]&&!!document.querySelector('[data-k="card:'+F1+'"]')&&!!document.querySelector('[data-k="card:'+F2+'"]'));
 ok('the first card is unchanged by the second',JSON.stringify(cards[F1].allergens)==='["Sesame"]',JSON.stringify(cards[F1].allergens));
 ok('second record has its own lockout, queued',lockoutQueue.indexOf(F2)>=0||lockoutId===F2);
 ok('alarm sounded for the second record',alarms.length>f0,alarms.length-f0);
 ok('the hold on the first completed on the first — its content never changed',MW(F1).filter(x=>'kitchen_ack_at' in x).length===1&&MW(F2).length===0);
 persist(F1);
 ok('the first is acknowledged; the second is not',!!cards[F1].kitchen_ack_at&&!cards[F2].kitchen_ack_at);
 ok('lockout shows the honest count: "Also at this table: 1 other allergy record"',/Also at this table: 1 other allergy record\b/.test(lkTxt()),(document.getElementById('lkAlso')||{}).textContent);
 ok('no claim of correction or replacement',!/correct|replac|supersed|update/i.test((document.getElementById('lkAlso')||{}).textContent||''));
 ok('row carries the same count',/Also at this table: 1 other allergy record/.test(document.querySelector('[data-k="card:'+F2+'"]').innerText));
 // W2-K1: F1 is at Prep now, so the un-acknowledged F2 takes the screen; F1 waits in the routine queue.
 ok('"1 of 2" — the un-acknowledged second takes the screen, the first waits at Prep',lockoutId===F2&&lockoutStage==='ack'&&lockoutRoutine[0]===F1&&/^1 of 2\b/.test(lkQ()),lockoutId+' '+lkQ());
 await shot('f-two-records-one-table');
 const f1a=alarms.length;await w(ALARM_REPEAT_MS+1200);
 ok('alarm continues: the second is un-acknowledged',alarms.length>f1a);
 ok('the second record\'s own lockout at Confirm Received',lockoutId===F2&&lockoutStage==='ack'&&/Peanut/.test(lkTxt())&&!/Sesame,/.test(lkTxt()));
 await hold(lkBtn());persist(F2);
 ok('second acknowledged separately, once',MW(F2).filter(x=>'kitchen_ack_at' in x).length===1&&MW(F1).filter(x=>'kitchen_ack_at' in x).length===1);
 await hold(lkBtn());persist(F2);document.querySelector('#lockoutContent .lockout-back').click();await w(200);
 ok('Back → the first returns at its Prep step',lockoutId===F1&&lockoutStage==='prep'&&/Sesame/.test(lkTxt()));
 await hold(lkBtn());persist(F1);document.querySelector('#lockoutContent .lockout-back').click();await w(200);
 H('(f) …supersession still replaces');
 const f3=fRow(F3,{allergens:['Peanut','Fish'],supersedes_id:F2});
 window.__ROWS.find(x=>x.id===F2).superseded_at=new Date().toISOString();window.__ROWS.push(f3);
 insertHandlers().forEach(h=>h.cb({new:rawRow(f3)}));await w(200);
 ok('the corrected record leaves the board',!cards[F2]&&!document.querySelector('[data-k="card:'+F2+'"]'));
 ok('its successor is its own card with its own lockout',!!cards[F3]&&lockoutId===F3&&lockoutStage==='ack'&&/Peanut, Fish/.test(lkTxt()));
 ok('successor row marked UPDATED',/UPDATED/.test(document.querySelector('[data-k="card:'+F3+'"]').innerText));
 await hold(lkBtn());persist(F3);await hold(lkBtn());persist(F3);document.querySelector('#lockoutContent .lockout-back').click();await w(200);

 // ── (j) re-verifier J / M2 / K: becoming acknowledged never alarms ───────────────────────────
 H('(j) ACKNOWLEDGEMENT NEVER SOUNDS THE ALARM');
 const upd=r=>(window.__RT||[]).filter(h=>h.flt&&h.flt.event==='UPDATE').forEach(h=>h.cb({new:rawRow(r)}));
 const J1='j1000000-onscreen',J2='j2000000-queued';
 window.__ROWS.push(rowObj(J1,{table_label:'SP17',zone_name:'Patio'}),rowObj(J2,{table_label:'SP18',zone_name:'Patio'}));
 await until(()=>lockoutId===J1&&lockoutQueue.indexOf(J2)>=0,RECONCILE_MS+2000);await w(1200);
 let j0=alarms.length;
 const rJ2=window.__ROWS.find(x=>x.id===J2);rJ2.kitchen_ack_at=new Date().toISOString();rJ2.status='acknowledged';upd(rJ2);await w(300);
 ok('M2 · queued record acknowledged elsewhere: dropped from the queue, NO alarm',lockoutQueue.indexOf(J2)<0&&alarms.length===j0,'alarms+'+(alarms.length-j0));
 j0=alarms.length;
 const rJ1=window.__ROWS.find(x=>x.id===J1);rJ1.kitchen_ack_at=new Date().toISOString();rJ1.status='acknowledged';upd(rJ1);await w(300);
 ok('J · on-screen record acknowledged elsewhere: lockout → Prep, NO alarm',lockoutStage==='prep'&&alarms.length===j0,'stage='+lockoutStage+' alarms+'+(alarms.length-j0));
 await hold(lkBtn());persist(J1);document.querySelector('#lockoutContent .lockout-back').click();await w(200);
 const K1='k1000000-own-late';
 window.__ROWS.push(rowObj(K1,{table_label:'SP19',zone_name:'Patio'}));
 await until(()=>lockoutId===K1,RECONCILE_MS+2000);await w(1200);
 window.__WRITE_MODE='hangcommit';await hold(lkBtn());
 await until(()=>!cards[K1]._writing,WRITE_TIMEOUT_MS+3000,100);window.__WRITE_MODE='ok';
 ok('K · own ack timed out; database has it',!cards[K1].kitchen_ack_at&&!!window.__ROWS.find(x=>x.id===K1).kitchen_ack_at);
 j0=alarms.length;await w(RECONCILE_MS+800);
 ok('K · board read restores it → Prep, NO alarm on confirmation',!!cards[K1].kitchen_ack_at&&lockoutStage==='prep'&&alarms.length===j0,'alarms+'+(alarms.length-j0));
 ok('K · the unknown-state message is cleared by the read',!cards[K1]._error);
 await hold(lkBtn());persist(K1);document.querySelector('#lockoutContent .lockout-back').click();await w(200);

 // ── (o) re-verifier O: another declaration while an ack is IN FLIGHT ─────────────────────────
 H('(o) ANOTHER DECLARATION ARRIVES WHILE AN ACK WRITE IS IN FLIGHT');
 const O1='o1000000-host',O2='o2000000-arrival',OS='sess-o';
 window.__ROWS.push(rowObj(O1,{guest_session_id:OS,asset_id:'asset-o',table_label:'T10',zone_name:'Main Hall'}));
 await until(()=>lockoutId===O1,RECONCILE_MS+2000);
 window.__PEND=[];window.__WRITE_MODE='hold';await hold(lkBtn());window.__WRITE_MODE='ok';
 const o2=rowObj(O2,{guest_session_id:OS,asset_id:'asset-o',table_label:'T10',zone_name:'Main Hall',allergens:['Peanut']});
 window.__ROWS.push(o2);insertHandlers().forEach(h=>h.cb({new:rawRow(o2)}));await w(150);
 window.__PEND.shift()();await w(300);
 ok('the in-flight ack lands on its own record only',!!cards[O1].kitchen_ack_at&&!cards[O2].kitchen_ack_at&&JSON.stringify(cards[O1].allergens)==='["Sesame"]');
 ok('the new record is still owed: alarm pending, queued',alarmPending()&&(lockoutQueue.indexOf(O2)>=0||lockoutId===O2));
 // W2-K1: once the in-flight ack has settled, O1 is at Prep and the owed O2 takes the screen.
 ok('after the ack settled, the owed arrival takes the screen; the host waits at Prep',lockoutId===O2&&lockoutStage==='ack'&&lockoutRoutine[0]===O1);
 persist(O1);await hold(lkBtn());persist(O2);await hold(lkBtn());persist(O2);document.querySelector('#lockoutContent .lockout-back').click();await w(200);
 ok('Back → the host returns at Prep',lockoutId===O1&&lockoutStage==='prep');
 await hold(lkBtn());persist(O1);document.querySelector('#lockoutContent .lockout-back').click();await w(200);

 // ── (p) generation guard: content changes / record superseded while a write is in flight ────────
 H('(p) A WRITE THAT RESOLVES AFTER THE RECORD CHANGED IS STALE');
 const P1='p1000000-prep-inflight';
 window.__ROWS.push(rowObj(P1,{table_label:'T11',zone_name:'Main Hall'}));
 await until(()=>lockoutId===P1,RECONCILE_MS+2000);
 await hold(lkBtn());persist(P1);
 ok('at Prep',lockoutStage==='prep');
 const ckP=[];const _ckp=chimeAck;chimeAck=function(){ckP.push(1);return _ckp.apply(this,arguments)};
 window.__PEND=[];window.__WRITE_MODE='hold';await hold(lkBtn());window.__WRITE_MODE='ok';
 const rP=window.__ROWS.find(x=>x.id===P1);rP.allergens=['Sesame','Mustard'];upd(rP);await w(200);
 ok('content change redraws the lockout with the new content',/Mustard/.test(lkTxt()));
 window.__PEND.shift()();
 await until(()=>/changed while saving/.test(lkTxt()),RECONCILE_MS+3000);
 ok('stale write: no confirmation chime',ckP.length===0);
 ok('stale write: notice, and the screen shows what the database has',/This record changed while saving — showing what is recorded\./.test(lkTxt())&&!!cards[P1].protocol_confirmed_at===!!rP.protocol_confirmed_at);
 chimeAck=_ckp;
 await shot('p-stale-write');
 if(lockoutStage!=='done'){await hold(lkBtn());persist(P1)}
 document.querySelector('#lockoutContent .lockout-back').click();await w(200);
 const P2='p2000000-ack-inflight',P3='p3000000-successor';
 window.__ROWS.push(rowObj(P2,{table_label:'T12',zone_name:'Main Hall'}));
 await until(()=>lockoutId===P2,RECONCILE_MS+2000);
 const ckQ=[];const _ckq=chimeAck;chimeAck=function(){ckQ.push(1);return _ckq.apply(this,arguments)};
 window.__PEND=[];window.__WRITE_MODE='hold';await hold(lkBtn());window.__WRITE_MODE='ok';
 const p3=rowObj(P3,{table_label:'T12',zone_name:'Main Hall',allergens:['Fish'],supersedes_id:P2});
 window.__ROWS.find(x=>x.id===P2).superseded_at=new Date().toISOString();window.__ROWS.push(p3);
 insertHandlers().forEach(h=>h.cb({new:rawRow(p3)}));await w(150);
 window.__PEND.shift()();await w(400);
 ok('record superseded mid-write: no chime, no Prep drawn for it',ckQ.length===0&&!(lockoutId===P2));
 ok('the successor holds the lockout at Confirm Received',lockoutId===P3&&lockoutStage==='ack');
 chimeAck=_ckq;
 await hold(lkBtn());persist(P3);await hold(lkBtn());persist(P3);document.querySelector('#lockoutContent .lockout-back').click();await w(200);

 // ── (q) D: the follow-up board read fails → state unknown ───────────────────────────────────────
 H('(q) GUARDED WRITE MATCHED NOTHING AND THE RE-READ FAILED');
 const Q1='q1000000-unknown';
 window.__ROWS.push(rowObj(Q1,{severity:'severe',table_label:'T13',zone_name:'Main Hall'}));
 await until(()=>!!document.querySelector('[data-k="card:'+Q1+'"] .row .hold-btn'),RECONCILE_MS+2000);
 window.__ROWS.find(x=>x.id===Q1).kitchen_ack_at=minsAgo(0.2);   // another display already did it
 window.__BOARD_FAIL=true;
 await hold(document.querySelector('[data-k="card:'+Q1+'"] .row .hold-btn'));
 await until(()=>!!cards[Q1]._error,RECONCILE_MS+3000);
 ok('says the state is unknown — never "NOT recorded"',cards[Q1]._error==='err.unconfirmed');
 ok('row: "Not confirmed — tap to check"',/Not confirmed — tap to check/.test(document.querySelector('[data-k="card:'+Q1+'"]').innerText));
 openRecord(Q1);await w(200);
 ok('record: "Couldn\'t confirm — check the record."',/Couldn't confirm — check the record\./.test(document.getElementById('verifyContent').innerText)&&!/NOT recorded/.test(document.getElementById('verifyContent').innerText));
 await shot('q-unconfirmed');
 closeRecord();window.__BOARD_FAIL=false;
 await until(()=>!!cards[Q1].kitchen_ack_at&&!cards[Q1]._error,RECONCILE_MS+3000);
 ok('next good read resolves it to the recorded state',!!cards[Q1].kitchen_ack_at&&!cards[Q1]._error);

 // ── (r) E: hold cancellation on content change for EVERY severity ───────────────────────────────
 H('(r) A HOLD ON CHANGED CONTENT IS CANCELLED — ANY SEVERITY');
 const E1='r1000000-severe-hold';
 window.__ROWS.push(rowObj(E1,{severity:'severe',table_label:'T14',zone_name:'Main Hall'}));
 await until(()=>!!document.querySelector('[data-k="card:'+E1+'"] .row .hold-btn'),RECONCILE_MS+2000);
 const eb=document.querySelector('[data-k="card:'+E1+'"] .row .hold-btn'),nE=MW(E1).length;
 md(eb);await w(500);
 const rE=window.__ROWS.find(x=>x.id===E1);rE.allergens=['Sesame','Soy'];upd(rE);
 await w(1000);mu(eb);await w(250);
 ok('severe record: the stale hold wrote nothing',MW(E1).length===nE,MW(E1).length-nE);
 ok('row shows the new content, hold still available',/Sesame, Soy/.test(document.querySelector('[data-k="card:'+E1+'"]').innerText)&&!!document.querySelector('[data-k="card:'+E1+'"] .row .hold-btn'));

 // ── (s) verifier round 3 · 6b: superseded ONLY by reference ───────────────────────────────────
 H('(s) SUPERSEDED ONLY BY REFERENCE (successor names it; its own superseded_at never landed)');
 const S1='s1000000-pred',S2='s2000000-succ',SS1='sess-s';
 window.__ROWS.push(rowObj(S1,{guest_session_id:SS1,asset_id:'asset-s',table_label:'T15',zone_name:'Main Hall'}));
 await until(()=>lockoutId===S1,RECONCILE_MS+2000);
 const nS=MW(S1).length;const sb=lkBtn();md(sb);await w(300);
 window.__ROWS.push(rowObj(S2,{guest_session_id:SS1,asset_id:'asset-s',table_label:'T15',zone_name:'Main Hall',allergens:['Sesame','Egg'],supersedes_id:S1}));
 await boardRead();await w(150);
 ok('6b · the cancelled hold is SAID on the successor, not silently dropped',lockoutId===S2&&/replaced by this newer one — nothing was recorded/.test(lkTxt()));
 await w(950);mu(sb);await w(400);
 ok('6b · the hold wrote NOTHING to the predecessor',MW(S1).length===nS,MW(S1).length-nS);
 ok('6b · successor on the lockout at Confirm Received',lockoutId===S2&&lockoutStage==='ack'&&/Egg/.test(lkTxt()));
 const s1w=document.querySelector('[data-k="card:'+S1+'"]');
 ok('6b · predecessor is not drawn in any band (not actionable)',!s1w);
 ok('6b · predecessor not counted in the same-visit cue',!/Also at this table/.test(lkTxt()));
 // backstop: a milestone call that reaches a superseded-by-reference record writes nothing
 const nS2=MW(S1).length;await doAck(S1,'row');await confirmProtocol(S1,'row');await w(150);
 ok('6b · ack / prep calls on the predecessor write nothing',MW(S1).length===nS2);
 ok('6b · honest notice on the successor',/replaced by this newer one — nothing was recorded/.test(lkTxt()));
 await shot('s-superseded-by-reference');
 await hold(lkBtn());persist(S2);await hold(lkBtn());persist(S2);document.querySelector('#lockoutContent .lockout-back').click();await w(200);

 // ── (t) verifier round 3 · E: severity leaves anaphylaxis ─────────────────────────────────────
 H('(t) THE LOCKOUT RECORD STOPS BEING ANAPHYLAXIS');
 const T1='t1000000-sev';
 window.__ROWS.push(rowObj(T1,{table_label:'T16',zone_name:'Main Hall'}));
 await until(()=>lockoutId===T1,RECONCILE_MS+2000);
 const rT=window.__ROWS.find(x=>x.id===T1);rT.severity='severe';upd(rT);await w(200);
 ok('E · lockout closed for a record that is no longer anaphylaxis',!(lkOn()&&lockoutId===T1),lkOn()+' '+lockoutId);
 ok('E · no ANAPHYLAXIS chip left for it',!(lkOn()&&/T16/.test(lkTxt())&&/ANAPHYLAXIS/.test(lkTxt())));
 ok('E · alarm no longer pending for it',!lockoutEligible(cards[T1])&&!alarmPending());
 ok('E · the record stays on the board, actionable, as SEVERE',/SEVERE/.test(document.querySelector('[data-k="card:'+T1+'"]').innerText)&&!!document.querySelector('[data-k="card:'+T1+'"] .row .hold-btn'));

 // ── (u) verifier round 3 · F: INSERT during an in-flight board read ───────────────────────────
 H('(u) AN INSERT DURING AN IN-FLIGHT BOARD READ IS NOT PRUNED BY IT');
 const U1='u1000000-mid-read';
 const snap=JSON.parse(JSON.stringify(window.__ROWS));const realRpc=sbv.rpc;let boardCalls=0;
 sbv.rpc=function(fn,a){if(fn!=='kitchen_board')return realRpc.call(sbv,fn,a);boardCalls++;
   if(boardCalls>1)return realRpc.call(sbv,fn,a);
   const o={retry:()=>o,abortSignal:()=>o,then:(r,j)=>new Promise(res=>setTimeout(res,800)).then(()=>({data:JSON.parse(JSON.stringify(snap)),error:null})).then(r,j)};return o};
 await until(()=>!reconcileInFlight,6000);
 const pr=reconcile();await w(100);
 const u1=rowObj(U1,{table_label:'T17',zone_name:'Main Hall'});window.__ROWS.push(u1);insertHandlers().forEach(h=>h.cb({new:rawRow(u1)}));await w(50);
 ok('F · lockout up on the insert',lockoutId===U1);
 await pr;await w(300);
 ok('F · not pruned by the stale read that began before it',!!cards[U1]&&lockoutId===U1);
 ok('F · one more board read ran after the stale one',boardCalls>=2,boardCalls+' reads');
 sbv.rpc=realRpc;
 await w(RECONCILE_MS+800);
 ok('F · still there after the next poll',!!cards[U1]&&lockoutId===U1);
 await hold(lkBtn());persist(U1);await hold(lkBtn());persist(U1);document.querySelector('#lockoutContent .lockout-back').click();await w(200);

 // ── (v) verifier round 4 · X1/X2: a supersedes_id from ANOTHER visit is ignored ─────────────────
 H('(v) A REFERENCE FROM ANOTHER TABLE OR SESSION NEVER HIDES A RECORD');
 // Works every lockout off the screen (Confirm Received, Prep, Back) so the next scenario starts clean.
 async function drain(){for(let i=0;i<20&&lockoutId;i++){const id=lockoutId;
   if(lockoutStage==='ack'){await hold(lkBtn());persist(id)}
   if(lockoutStage==='prep'){await hold(lkBtn());persist(id)}
   const bk=document.querySelector('#lockoutContent .lockout-back');if(bk){bk.click();await w(200)}}}
 const live=id=>!!document.querySelector('[data-k="card:'+id+'"]')&&!isSupersededRow(cards[id]);
 const queuedOrUp=id=>lockoutId===id||lockoutQueue.indexOf(id)>=0;
 const V1='v1000000-t3-anaph',V2='v2000000-p1-attack',V3='v3000000-t4-anaph',V4='v4000000-p2-attack',V5='v5000000-t5-anaph',V6='v6000000-t5-othersess';
 window.__ROWS.push(rowObj(V1,{asset_id:'asset-T3',table_label:'T3',zone_name:'Main Hall',guest_session_id:'gs-T3'}));
 await until(()=>lockoutId===V1,RECONCILE_MS+2000);
 const v2=rowObj(V2,{asset_id:'asset-P1',table_label:'P1',zone_name:'Patio',guest_session_id:'gs-P1',severity:'unsure',supersedes_id:V1});
 window.__ROWS.push(v2);insertHandlers().forEach(h=>h.cb({new:rawRow(v2)}));await w(200);await boardRead();await w(150);
 ok('X1 · cross-table INSERT naming T3: T3 stays on the board, on the lockout, alarming',live(V1)&&queuedOrUp(V1)&&lockoutEligible(cards[V1])&&alarmPending());
 ok('X1 · the attacking row is not presented as a correction (no UPDATED)',!/UPDATED/.test((document.querySelector('[data-k="card:'+V2+'"]')||{}).innerText||''));
 window.__ROWS.push(rowObj(V3,{asset_id:'asset-T4',table_label:'T4',zone_name:'Main Hall',guest_session_id:'gs-T4'}),
                   rowObj(V4,{asset_id:'asset-P2',table_label:'P2',zone_name:'Patio',guest_session_id:'gs-P2',severity:'discomfort',supersedes_id:V3}));
 await boardRead();await w(150);
 ok('X2 · cross-table reference via board read only: T4 stays live and owed',live(V3)&&queuedOrUp(V3)&&lockoutEligible(cards[V3]));
 window.__ROWS.push(rowObj(V5,{asset_id:'asset-T5',table_label:'T5',zone_name:'Main Hall',guest_session_id:'gs-T5a'}),
                   rowObj(V6,{asset_id:'asset-T5',table_label:'T5',zone_name:'Main Hall',guest_session_id:'gs-T5b',supersedes_id:V5,allergens:['Fish']}));
 await boardRead();await w(150);
 ok('same table, DIFFERENT guest session: the named record stays live',live(V5)&&queuedOrUp(V5));
 ok('a non-matching reference never writes: no milestone to any named record',MW(V1).length===0&&MW(V3).length===0&&MW(V5).length===0);
 await shot('v-cross-table-reference-ignored');
 await drain();

 // ── (w) verifier round 4 · C1/C2/C3: chains and successors that leave the board ────────────────
 H('(w) SUPERSESSION CHAINS AND SUCCESSORS THAT LEAVE THE BOARD');
 const CA='wa000000-a',CB='wb000000-b',CC='wc000000-c';
 window.__ROWS.push(rowObj(CA,{created_at:minsAgo(5),guest_session_id:'gs-C',asset_id:'asset-C',table_label:'T18',zone_name:'Main Hall'}),
                   rowObj(CB,{created_at:minsAgo(4),guest_session_id:'gs-C',asset_id:'asset-C',table_label:'T18',zone_name:'Main Hall',supersedes_id:CA,superseded_at:new Date().toISOString()}),
                   rowObj(CC,{created_at:minsAgo(3),guest_session_id:'gs-C',asset_id:'asset-C',table_label:'T18',zone_name:'Main Hall',supersedes_id:CB,allergens:['Sesame','Egg']}));
 const lk0=window.__LKLOG.length;await boardRead();await w(200);
 ok('C1 · A ← B ← C with only B.superseded_at: A is hidden and not owed',!document.querySelector('[data-k="card:'+CA+'"]')&&!lockoutEligible(cards[CA]));
 ok('C1 · A never reached the lockout, not even for an instant',!window.__LKLOG.slice(lk0).some(x=>x.startsWith(CA)),window.__LKLOG.slice(lk0).join());
 const nA=MW(CA).length;await doAck(CA,'row');await w(150);
 ok('C1 · no milestone is ever written to A',MW(CA).length===nA);
 ok('C1 · C is the live record',lockoutId===CC);
 await drain();
 const DA='wd000000-a',DB='we000000-b';
 window.__ROWS.push(rowObj(DA,{guest_session_id:'gs-D',asset_id:'asset-D',table_label:'T19',zone_name:'Main Hall'}));
 await until(()=>lockoutId===DA,RECONCILE_MS+2000);
 const db=rowObj(DB,{guest_session_id:'gs-D',asset_id:'asset-D',table_label:'T19',zone_name:'Main Hall',supersedes_id:DA,allergens:['Milk']});
 window.__ROWS.push(db);insertHandlers().forEach(h=>h.cb({new:rawRow(db)}));await w(200);
 ok('C2 · same-visit successor by INSERT: A leaves the lockout, B takes it',lockoutId===DB&&!document.querySelector('[data-k="card:'+DA+'"]'));
 window.__ROWS=window.__ROWS.filter(x=>x.id!==DB);await boardRead();await w(200);
 ok('C2 · B leaves the board: A does NOT come back',!document.querySelector('[data-k="card:'+DA+'"]')&&!lockoutEligible(cards[DA])&&lockoutId!==DA);
 await drain();
 const EA='wf000000-a',EB='wg000000-b';
 window.__ROWS.push(rowObj(EA,{guest_session_id:'gs-E',asset_id:'asset-E',table_label:'T20',zone_name:'Main Hall'}));
 await until(()=>lockoutId===EA,RECONCILE_MS+2000);
 window.__ROWS.push(rowObj(EB,{guest_session_id:'gs-E',asset_id:'asset-E',table_label:'T20',zone_name:'Main Hall',supersedes_id:EA,severity:'severe'}));
 await boardRead();await w(150);
 ok('C3 · same-visit successor by board read: A hidden, off the lockout',!document.querySelector('[data-k="card:'+EA+'"]')&&lockoutId!==EA);
 window.__ROWS=window.__ROWS.filter(x=>x.id!==EB);await boardRead();await w(200);
 ok('C3 · B leaves the board: A does NOT come back',!document.querySelector('[data-k="card:'+EA+'"]')&&!lockoutEligible(cards[EA]));
 ok('invariant · every owed anaphylaxis record is on the lockout or queued',Object.keys(cards).filter(id=>lockoutEligible(cards[id])).every(queuedOrUp));

 // ── (x) verifier round 5 · S1/S2: self-reference and cycles are never honoured ─────────────────
 await drain();
 H('(x) SELF-REFERENCE, CYCLES AND OLDER "SUCCESSORS" HIDE NOTHING');
 const X1='x1000000-self',XP='x2000000-p',XQ='x3000000-q',XO='x4000000-old-succ',XN='x5000000-named';
 window.__ROWS.push(rowObj(X1,{asset_id:'asset-X1',table_label:'T21',zone_name:'Main Hall',guest_session_id:'gs-X1',supersedes_id:X1}));
 await boardRead();await w(200);
 ok('S1 · a row naming ITSELF stays on the board, owed and alarming',!!document.querySelector('[data-k="card:'+X1+'"]')&&queuedOrUp(X1)&&lockoutEligible(cards[X1])&&alarmPending());
 window.__ROWS.push(rowObj(XP,{asset_id:'asset-X2',table_label:'T22',zone_name:'Main Hall',guest_session_id:'gs-X2',supersedes_id:XQ,created_at:minsAgo(3)}),
                   rowObj(XQ,{asset_id:'asset-X2',table_label:'T22',zone_name:'Main Hall',guest_session_id:'gs-X2',supersedes_id:XP,allergens:['Peanut'],created_at:minsAgo(2)}));
 await boardRead();await w(200);
 ok('S2 · a cycle P ↔ Q hides NEITHER: both owed',queuedOrUp(XP)&&queuedOrUp(XQ)&&!isSupersededRow(cards[XP])&&!isSupersededRow(cards[XQ]));
 window.__ROWS.push(rowObj(XN,{asset_id:'asset-X3',table_label:'T23',zone_name:'Main Hall',guest_session_id:'gs-X3',created_at:minsAgo(1)}),
                   rowObj(XO,{asset_id:'asset-X3',table_label:'T23',zone_name:'Main Hall',guest_session_id:'gs-X3',supersedes_id:XN,severity:'unsure',created_at:minsAgo(6)}));
 await boardRead();await w(200);
 ok('a "successor" OLDER than the record it names hides nothing',queuedOrUp(XN)&&!isSupersededRow(cards[XN]));
 ok('none of these records was written to by the board',[X1,XP,XQ,XN].every(id=>MW(id).length===0));
 await drain();

 // ── (y) verifier round 5 · reload: the cache window ───────────────────────────────────────────
 H('(y) RELOAD — prepare: chain A ← B ← C in the cache, first board read delayed');
 const YA='ya000000-a',YB='yb000000-b',YC='yc000000-c';
 const yrows=[rowObj(YA,{asset_id:'asset-Y',table_label:'T24',zone_name:'Main Hall',guest_session_id:'gs-Y',created_at:minsAgo(5)}),
   rowObj(YB,{asset_id:'asset-Y',table_label:'T24',zone_name:'Main Hall',guest_session_id:'gs-Y',supersedes_id:YA,superseded_at:minsAgo(1),created_at:minsAgo(4)}),
   rowObj(YC,{asset_id:'asset-Y',table_label:'T24',zone_name:'Main Hall',guest_session_id:'gs-Y',supersedes_id:YB,allergens:['Egg'],created_at:minsAgo(3)})];
 window.__ROWS.push(...yrows);await boardRead();await w(300);cacheCards();
 ok('pre-reload: A hidden',!document.querySelector('[data-k="card:'+YA+'"]'));
 st.phase='reload';sessionStorage.setItem(SS,JSON.stringify(st));
 sessionStorage.setItem('hc_fixture_rows',JSON.stringify(yrows));
 sessionStorage.setItem('hc_fixture_delay_board','3000');
 location.reload();
 return;
}catch(e){T.push('EXCEPTION '+e.message+'\n'+e.stack);st.fail++;await done()}})();
