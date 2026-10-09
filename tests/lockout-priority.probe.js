// W2-K1 Kitchen lockout priority (Product Owner decision, Oct 9 2026) — offline harness, network stubbed.
//   node tests/harness/run.js tests/lockout-priority.probe.js --query='inst=1&rows=none'
// Rule: an UN-ACKNOWLEDGED anaphylaxis lockout takes priority over a lockout at a ROUTINE step (Prep,
// or any stage after acknowledgement). Un-acknowledged records are shown oldest first (created_at).
// A routine lockout is never interrupted while its write is in flight or being settled; a HOLD running
// on it is cancelled and writes nothing; it returns to the FRONT of the routine queue with its
// identity, timestamps and acknowledgement untouched. Ack-stage lockouts are never preempted.
// (1) simultaneous arrivals: 3 un-acknowledged (out of created_at order) + 1 at Prep.
// (2) arrival during an in-flight Prep write — success, timeout, and a guarded no-row settle.
// (3) arrival mid-hold at Prep: the hold is cancelled, nothing is written.
// (4) foreign acknowledgement of the preempting record → the preempted one returns.
// (5) reconcile (socket dead) with mixed states → correct ordering, nothing lost.
// (6) alarm behaviour unchanged throughout (sounds on owed arrivals, never on preemption / return /
//     acknowledgement, repeats while anything is owed, stops when nothing is).
// (7) reload with mixed states → oldest owed record first, nothing lost.
const SS='hc_probe_w2k1';
const st=JSON.parse(sessionStorage.getItem(SS)||'{"T":[],"pass":0,"fail":0}');
const T=st.T;
const ok=(n,c,x)=>{c?st.pass++:st.fail++;T.push((c?'PASS  ':'FAIL  ')+n+(x!==undefined&&x!==''?'   → '+x:''))};
const H=s=>{T.push('');T.push('──── '+s+' ────')};
const w=ms=>new Promise(r=>setTimeout(r,ms));
const until=async(f,ms,step)=>{const t0=Date.now();while(Date.now()-t0<ms){if(f())return Date.now()-t0;await w(step||50)}return -1};
const shot=n=>fetch('/__shot?n=prio-'+n);
const tap=(x,y)=>fetch('/__tap?x='+Math.round(x)+'&y='+Math.round(y));
const minsAgo=m=>new Date(Date.now()-m*60e3).toISOString();
const lkOn=()=>document.getElementById('lockout').classList.contains('on');
const lkTxt=()=>document.getElementById('lockoutContent').innerText;
const lkBtn=()=>document.querySelector('#lockoutContent .hold-btn');
const lkBack=()=>document.querySelector('#lockoutContent .lockout-back');
const lkQ=()=>{const e=document.getElementById('lkQueue');return e&&!e.hidden?e.textContent:''};
const MW=id=>(window.__W__||[]).filter(x=>x.__target===id);
const ACKW=id=>MW(id).filter(x=>'kitchen_ack_at' in x).length, PREPW=id=>MW(id).filter(x=>'protocol_confirmed_at' in x).length;
const md=b=>b.dispatchEvent(new MouseEvent('mousedown',{bubbles:true})), mu=b=>b.dispatchEvent(new MouseEvent('mouseup',{bubbles:true}));
async function hold(b,ms){md(b);await w(ms||1350);mu(b);await w(200)}
function rowObj(id,o){return Object.assign({id:id,asset_id:'a-'+id,table_label:'P5',zone_name:'Terrace',guest_name:'Probe Guest',
  allergens:['Sesame'],severity:'anaphylaxis',cross_contact:false,notes:null,status:'pending',created_at:minsAgo(1),
  kitchen_ack_at:null,kitchen_ack_by:null,protocol_confirmed_at:null,protocol_confirmed_by:null,verified_at:null,
  verified_by:null,served_at:null,closed_at:null,superseded_at:null,supersedes_id:null,minimized_at:null,
  service_instance_id:'s1',service_kind:'live',is_open:true},o)}
const rawRow=r=>{const x=Object.assign({},r);['table_label','zone_name','service_kind','is_open'].forEach(k=>delete x[k]);x.venue_id='v';return x};
const insertHandlers=()=>(window.__RT||[]).filter(h=>h.flt&&h.flt.event==='INSERT');
const ins=r=>{window.__ROWS.push(r);insertHandlers().forEach(h=>h.cb({new:rawRow(r)}))};
const upd=r=>(window.__RT||[]).filter(h=>h.flt&&h.flt.event==='UPDATE').forEach(h=>h.cb({new:rawRow(r)}));
// The database accepting a write: the board read returns what was written.
function persist(id){const r=window.__ROWS.find(x=>x.id===id),c=cards[id];if(!r||!c)return;
  ['kitchen_ack_at','kitchen_ack_by','protocol_confirmed_at','protocol_confirmed_by','verified_at','verified_by','served_at','status'].forEach(k=>{if(c[k])r[k]=c[k]})}
// A record's identity + evidence, to prove preemption changed nothing but the screen.
const ident=id=>{const c=cards[id];return c?[c.id,c.created_at,c.kitchen_ack_at,c.kitchen_ack_by,c.protocol_confirmed_at,c.status,(c.allergens||[]).join(',')].join('|'):'GONE'};
const alarms=[];
const _ca=chimeAnaphylaxis;chimeAnaphylaxis=function(){alarms.push(Date.now());return _ca.apply(this,arguments)};
const acks=[];
const _ck=chimeAck;chimeAck=function(){acks.push(lockoutId);return _ck.apply(this,arguments)};
// Bring the given record to Prep on the lockout (acknowledged here, written once).
async function toPrep(id){await until(()=>lockoutId===id,RECONCILE_MS+2000);await hold(lkBtn());persist(id)}
// Clear whatever is on the lockout, step by step, recording what was shown.
async function clearAll(){const seen=[];
  for(let i=0;i<30&&lkOn();i++){const id=lockoutId;seen.push(id.slice(0,3)+':'+lockoutStage);
    if(lockoutStage==='done'){lkBack().click();await w(200)}else{await hold(lkBtn());persist(id)}}
  return seen}
async function done(){
  T.push('');T.push(st.fail===0?('ALL '+st.pass+' CHECKS PASS'):(st.pass+' pass, '+st.fail+' FAIL'));
  sessionStorage.removeItem(SS);
  await fetch('/__results',{method:'POST',body:T.join('\n')});
}
setTimeout(()=>{T.push('WATCHDOG — stalled after the last line above');fetch('/__results',{method:'POST',body:T.join('\n')})},330000);

(async()=>{try{
 if(st.phase==='reload'){
  H('(7) RELOAD WITH MIXED STATES — after the first board read');
  await until(()=>typeof reconcile==='function'&&lastReconcileOk>0,10000);await w(400);
  const ids=st.reloadIds;
  ok('nothing lost: every record is on the board',ids.all.every(id=>!!cards[id]&&!!document.querySelector('[data-k="card:'+id+'"]')),ids.all.filter(id=>!cards[id]).join());
  ok('the OLDEST owed record is on the lockout, at Confirm Received',lockoutId===ids.oldest&&lockoutStage==='ack',lockoutId+'|'+lockoutStage);
  ok('the newer owed record waits; acknowledged records are not lockouts',lockoutQueue.indexOf(ids.newer)>=0&&lockoutQueue.indexOf(ids.prep)<0&&lockoutQueue.indexOf(ids.done)<0&&lockoutId!==ids.prep);
  ok('"1 of 2"',/^1 of 2\b/.test(lkQ()),lkQ());
  ok('acknowledged records keep their recorded state',!!cards[ids.prep].kitchen_ack_at&&!cards[ids.prep].protocol_confirmed_at&&!!cards[ids.done].protocol_confirmed_at);
  ok('the reload wrote no milestone',(window.__W__||[]).length===0,(window.__W__||[]).length);
  await shot('7-reload');
  await done();return;
 }
 await until(()=>typeof reconcile==='function'&&paired()&&lastReconcileOk>0,8000);
 H('SETUP');
 const ap=document.getElementById('audioPrompt');const r0=ap.getBoundingClientRect();await tap(r0.left+r0.width/2,r0.top+r0.height/2);
 ok('a real tap unlocks audio',await until(()=>audioReady&&ctx&&ctx.state==='running',3000)>=0);

 // ── (1) ─────────────────────────────────────────────────────────────────────────────────────
 H('(1) SIMULTANEOUS ARRIVALS: 3 UN-ACKNOWLEDGED + 1 AT PREP');
 const A='a1000000-prep',U1='u1000000-newest',U2='u2000000-oldest',U3='u3000000-middle';
 ins(rowObj(A,{table_label:'T1',zone_name:'Main Hall',guest_name:'At Prep',created_at:minsAgo(30)}));
 await toPrep(A);
 ok('A acknowledged here and at Prep',lockoutId===A&&lockoutStage==='prep'&&ACKW(A)===1);
 const idA=ident(A);let a0=alarms.length;
 // Three arrive in ONE moment, in an order that is NOT their created_at order.
 ins(rowObj(U1,{table_label:'T2',guest_name:'Newest',created_at:minsAgo(2)}));
 ins(rowObj(U2,{table_label:'T3',guest_name:'Oldest',created_at:minsAgo(9)}));
 ins(rowObj(U3,{table_label:'T4',guest_name:'Middle',created_at:minsAgo(5)}));
 await w(200);
 ok('an un-acknowledged arrival takes the screen from Prep at once',lockoutStage==='ack'&&[U1,U2,U3].indexOf(lockoutId)>=0,lockoutId);
 ok('A waits at the FRONT of the routine queue',lockoutRoutine[0]===A);
 ok('A is unchanged — identity, timestamps, acknowledgement',ident(A)===idA&&MW(A).length===1);
 ok('all three owed records are held (on screen or queued) — none lost',[U1,U2,U3].every(id=>lockoutId===id||lockoutQueue.indexOf(id)>=0));
 ok('"1 of 4" — the routine record is counted, not hidden',/^1 of 4\b/.test(lkQ()),lkQ());
 ok('ONE alarm for the burst (single-flight, unchanged)',alarms.length-a0===1,alarms.length-a0);
 ok('nothing acknowledged by the arrival or the preemption',[U1,U2,U3].every(id=>ACKW(id)===0&&!cards[id].kitchen_ack_at));
 await shot('1-burst');
 // Expected: U2, U3, U1 acknowledged in created_at order (the same-moment burst opens on its OLDEST
 // even though U1 arrived first); each acknowledgement here puts that record at Prep, so the next
 // owed one takes over; then the Prep steps return, most recently displaced first, A last.
 const seen1=await clearAll();
 ok('the burst opened on its OLDEST record and owed records were shown oldest first',seen1.slice(0,3).join(' ')==='u20:ack u30:ack u10:ack',seen1.join(' '));
 ok('every owed record acknowledged before any Prep step returns',seen1.findIndex(s=>/:(prep|done)$/.test(s))===3,seen1.join(' '));
 ok('each acknowledged exactly once; A never acknowledged again',[U1,U2,U3].every(id=>ACKW(id)===1)&&ACKW(A)===1,[A,U1,U2,U3].map(ACKW).join());
 ok('A returned at its Prep step (last displaced → last back) and was confirmed once',seen1.slice(-2).join(' ')==='a10:prep a10:done'&&PREPW(A)===1,seen1.join(' '));
 ok('board clear of lockouts',!lkOn()&&lockoutQueue.length===0&&lockoutRoutine.length===0);

 // ── (2a) ────────────────────────────────────────────────────────────────────────────────────
 H('(2a) ARRIVAL DURING AN IN-FLIGHT PREP WRITE — it settles (success) first');
 const B='b1000000-prep-write',V='v1000000-arrival';
 ins(rowObj(B,{table_label:'T5',guest_name:'Writing Prep',created_at:minsAgo(20)}));
 await toPrep(B);
 window.__PEND=[];window.__WRITE_MODE='hold';await hold(lkBtn());window.__WRITE_MODE='ok';
 ok('the Prep write is in flight',cards[B]._writing===true&&window.__PEND.length===1);
 a0=alarms.length;
 ins(rowObj(V,{table_label:'T6',guest_name:'Arrives Mid-Write'}));await w(200);
 ok('the arrival does NOT interrupt the in-flight write: B stays on screen at Prep',lockoutId===B&&lockoutStage==='prep');
 ok('the arrival is queued, owed and alarmed',lockoutQueue.indexOf(V)>=0&&alarmPending()&&alarms.length>a0);
 await w(1500);
 ok('…still not interrupted 1.5 s later',lockoutId===B&&cards[B]._writing===true);
 const ack0=acks.length;
 window.__PEND.shift()();await w(300);
 ok('B\'s write settled and was confirmed (chime) while B was on screen',acks.length===ack0+1&&acks[acks.length-1]===B&&!!cards[B].protocol_confirmed_at);
 ok('B drew its completed stage before yielding',window.__LKLOG.indexOf(B+'|done')>=0&&window.__LKLOG.lastIndexOf(B+'|done')<window.__LKLOG.lastIndexOf(V+'|ack'));
 ok('then the owed arrival takes the screen; B waits at the front of the routine queue',lockoutId===V&&lockoutStage==='ack'&&lockoutRoutine[0]===B);
 ok('B written exactly once',PREPW(B)===1);
 persist(B);
 const seen2a=await clearAll();
 ok('V acknowledged; B returns at its own stage (done) and is dismissed with Back',seen2a.join(' ')==='v10:ack v10:prep v10:done b10:done',seen2a.join(' '));
 ok('no further writes to B',PREPW(B)===1&&ACKW(B)===1);

 // ── (2b) ────────────────────────────────────────────────────────────────────────────────────
 H('(2b) ARRIVAL DURING AN IN-FLIGHT PREP WRITE — it settles by timing out first');
 const C='c1000000-prep-hang',W='w1000000-arrival';
 ins(rowObj(C,{table_label:'T7',guest_name:'Hung Prep',created_at:minsAgo(20)}));
 await toPrep(C);
 window.__WRITE_MODE='hang';const tC=Date.now();await hold(lkBtn());window.__WRITE_MODE='ok';
 ins(rowObj(W,{table_label:'T8',guest_name:'Arrives Mid-Hang'}));await w(200);
 ok('C\'s hung write is not interrupted',lockoutId===C&&cards[C]._writing===true);
 await until(()=>lockoutId!==C,WRITE_TIMEOUT_MS+3000,100);
 ok('the arrival takes the screen only once the write timed out',lockoutId===W&&Date.now()-tC>=WRITE_TIMEOUT_MS-200,(Date.now()-tC)+'ms');
 ok('C reverted (Prep not recorded) and waits in the routine queue',!cards[C].protocol_confirmed_at&&lockoutRoutine[0]===C&&!!cards[C].kitchen_ack_at);
 await hold(lkBtn());persist(W);await hold(lkBtn());persist(W);lkBack().click();await w(200);
 ok('C returns at Prep and still says the outcome is unknown',lockoutId===C&&lockoutStage==='prep'&&/No response/i.test(lkTxt()),lkTxt().split('\n').slice(0,4).join(' / '));
 await shot('2b-returned-timeout');
 await hold(lkBtn());persist(C);lkBack().click();await w(200);
 ok('C confirmed on retry; nothing else written',PREPW(C)===2&&!!cards[C].protocol_confirmed_at&&ACKW(C)===1);

 // ── (2c) ────────────────────────────────────────────────────────────────────────────────────
 H('(2c) A GUARDED PREP WRITE MATCHES NOTHING — the settle read is not interrupted');
 const D='d1000000-prep-norow',X='x1000000-arrival';
 ins(rowObj(D,{table_label:'T9',guest_name:'Already Done',created_at:minsAgo(20)}));
 await toPrep(D);
 // Another display already recorded Prep in the database; this display does not know yet.
 window.__ROWS.find(r=>r.id===D).protocol_confirmed_at=minsAgo(0.2);
 const _br=boardRead;const during=[];
 boardRead=async function(){ins(rowObj(X,{table_label:'T10',guest_name:'Arrives Mid-Settle'}));await w(600);during.push(lockoutId);return _br.apply(this,arguments)};
 await hold(lkBtn());await w(1200);boardRead=_br;
 ok('while the follow-up read was settling the write, D kept the screen',during.length===1&&during[0]===D,during.join());
 ok('D settled honestly ("already recorded"), then the owed arrival took the screen',lockoutId===X&&lockoutStage==='ack'&&!!cards[D].protocol_confirmed_at&&cards[D]._notice==='note.already_recorded'&&lockoutRoutine[0]===D);
 ok('the settle flag never persists',!cards[D]._settling);
 await clearAll();

 // ── (3) ─────────────────────────────────────────────────────────────────────────────────────
 H('(3) ARRIVAL MID-HOLD AT PREP — the hold is cancelled, nothing is written');
 const E='e1000000-mid-hold',Y='y1000000-arrival';
 ins(rowObj(E,{table_label:'SP15',zone_name:'Patio',guest_name:'Mid Hold',created_at:minsAgo(20)}));
 await toPrep(E);
 const idE=ident(E),nW=(window.__W__||[]).length,eb=lkBtn();
 md(eb);await w(400);
 ins(rowObj(Y,{table_label:'SP16',zone_name:'Patio',guest_name:'Arrives Mid-Hold'}));await w(50);
 ok('the arrival takes the screen at once (no write was in flight)',lockoutId===Y&&lockoutStage==='ack');
 ok('the Prep hold was cancelled',!holdTimers[E]);
 await w(HOLD_MS+400);mu(eb);await w(200);
 ok('…and wrote NOTHING — not to E, not to the arrival',(window.__W__||[]).length===nW&&PREPW(E)===0&&ACKW(Y)===0,(window.__W__||[]).slice(nW).map(x=>x.__target).join());
 ok('E unchanged and at the front of the routine queue',ident(E)===idE&&lockoutRoutine[0]===E);
 ok('the continued press did not start a hold on the arrival',!holdTimers[Y]&&!cards[Y].kitchen_ack_at);
 await shot('3-mid-hold-preempted');
 await hold(lkBtn());persist(Y);await hold(lkBtn());persist(Y);lkBack().click();await w(200);
 ok('E returns at Prep with nothing recorded',lockoutId===E&&lockoutStage==='prep'&&!cards[E].protocol_confirmed_at);
 await hold(lkBtn());persist(E);lkBack().click();await w(200);
 ok('E\'s Prep recorded once, by its own completed hold',PREPW(E)===1);

 // ── (4) ─────────────────────────────────────────────────────────────────────────────────────
 H('(4) FOREIGN ACKNOWLEDGEMENT OF THE PREEMPTING RECORD');
 const F='f1000000-prep',G='g1000000-preemptor',G2='g2000000-second';
 ins(rowObj(F,{table_label:'SP17',zone_name:'Patio',guest_name:'Preempted',created_at:minsAgo(20)}));
 await toPrep(F);
 a0=alarms.length;
 ins(rowObj(G,{table_label:'SP18',zone_name:'Patio',guest_name:'Preemptor'}));await w(200);
 ok('G preempts F',lockoutId===G&&lockoutRoutine[0]===F);
 const rG=window.__ROWS.find(x=>x.id===G);rG.kitchen_ack_at=new Date().toISOString();rG.kitchen_ack_by='Other Display';rG.status='acknowledged';
 const a1=alarms.length;upd(rG);await w(300);
 ok('G acknowledged elsewhere → the preempted F returns at Prep',lockoutId===F&&lockoutStage==='prep');
 ok('G is not lost: it waits in the routine queue at its Prep',lockoutRoutine.indexOf(G)>=0&&!!cards[G].kitchen_ack_at&&cards[G].kitchen_ack_by==='Other Display');
 ok('this display wrote no acknowledgement for G; no alarm on the return',ACKW(G)===0&&alarms.length===a1);
 await clearAll();
 H('(4b) …but if another owed record is waiting, it comes first');
 ins(rowObj(F+'b',{table_label:'SP19',zone_name:'Patio',guest_name:'Preempted 2',created_at:minsAgo(20)}));
 await toPrep(F+'b');
 ins(rowObj(G+'b',{table_label:'SP20',zone_name:'Terrace',guest_name:'Preemptor 2',created_at:minsAgo(0.5)}));
 ins(rowObj(G2,{table_label:'SP21',zone_name:'Terrace',guest_name:'Second Owed',created_at:minsAgo(0.2)}));await w(200);
 ok('the older owed record preempts',lockoutId===G+'b'&&lockoutQueue.indexOf(G2)>=0);
 const rG2=window.__ROWS.find(x=>x.id===G+'b');rG2.kitchen_ack_at=new Date().toISOString();rG2.status='acknowledged';upd(rG2);await w(300);
 ok('foreign ack → the other OWED record takes the screen, not a routine one',lockoutId===G2&&lockoutStage==='ack'&&lockoutRoutine.indexOf(F+'b')>=0&&lockoutRoutine.indexOf(G+'b')>=0);
 await clearAll();
 ok('board clear',!lkOn()&&lockoutRoutine.length===0);

 // ── (5) ─────────────────────────────────────────────────────────────────────────────────────
 H('(5) RECONCILE WITH MIXED STATES (socket dead)');
 const P='p1000000-prep',Q1='q1000000-newer',Q2='q2000000-older',Q3='q3000000-acked-elsewhere',Q4='q4000000-severe';
 ins(rowObj(P,{table_label:'T11',guest_name:'Prep Here',created_at:minsAgo(40)}));
 await toPrep(P);
 a0=alarms.length;
 window.__ROWS.push(rowObj(Q1,{table_label:'T12',guest_name:'Newer Owed',created_at:minsAgo(3)}),
   rowObj(Q2,{table_label:'T13',guest_name:'Older Owed',created_at:minsAgo(12)}),
   rowObj(Q3,{table_label:'T14',guest_name:'Acked Elsewhere',created_at:minsAgo(15),kitchen_ack_at:minsAgo(14),kitchen_ack_by:'Other Display',status:'acknowledged'}),
   rowObj(Q4,{table_label:'T15',guest_name:'Severe',severity:'severe',created_at:minsAgo(20)}));
 await until(()=>lockoutId!==P,RECONCILE_MS+2500);await w(200);
 ok('the OLDEST owed record takes the screen from Prep',lockoutId===Q2&&lockoutStage==='ack',lockoutId);
 ok('the newer owed record waits; P at the front of the routine queue',lockoutQueue.indexOf(Q1)>=0&&lockoutRoutine[0]===P);
 ok('records already acknowledged elsewhere, and non-anaphylaxis records, are never lockouts',lockoutQueue.indexOf(Q3)<0&&lockoutRoutine.indexOf(Q3)<0&&lockoutQueue.indexOf(Q4)<0&&lockoutId!==Q3);
 ok('nothing lost: every record on the board',[P,Q1,Q2,Q3,Q4].every(id=>!!document.querySelector('[data-k="card:'+id+'"]')));
 ok('one alarm for the read',alarms.length-a0===1,alarms.length-a0);
 const seen5=await clearAll();
 ok('owed first, oldest first; then the Prep steps, P last',seen5.join(' ')==='q20:ack q10:ack q10:prep q10:done q20:prep q20:done p10:prep p10:done',seen5.join(' '));
 ok('each written once; Q3 never written by this display',ACKW(Q1)===1&&ACKW(Q2)===1&&ACKW(P)===1&&MW(Q3).length===0);

 // ── (6) ─────────────────────────────────────────────────────────────────────────────────────
 H('(6) ALARM BEHAVIOUR UNCHANGED');
 const R='r1000000-prep',S='s1000000-owed';
 ins(rowObj(R,{table_label:'T16',guest_name:'Routine',created_at:minsAgo(20)}));
 await toPrep(R);await w(200);
 let z=alarms.length;await w(ALARM_REPEAT_MS+1200);
 ok('nothing owed (only a routine lockout) → no alarm',alarms.length===z&&!alarmPending());
 z=alarms.length;ins(rowObj(S,{table_label:'T17',guest_name:'Owed'}));await w(300);
 ok('owed arrival → alarm, and it takes the screen',alarms.length===z+1&&lockoutId===S);
 z=alarms.length;await w(ALARM_REPEAT_MS+1200);
 ok('repeats while it is owed',alarms.length>z);
 z=alarms.length;await hold(lkBtn());persist(S);await w(200);
 ok('confirmed acknowledgement → no alarm',alarms.length===z&&!alarmPending());
 await hold(lkBtn());persist(S);lkBack().click();await w(200);
 ok('the routine record returning → no alarm',lockoutId===R&&alarms.length===z);
 z=alarms.length;await w(ALARM_REPEAT_MS+1200);
 ok('…and the alarm stays silent while only routine steps remain',alarms.length===z);
 await clearAll();

 // ── (7) reload ─────────────────────────────────────────────────────────────────────────────
 H('(7) RELOAD WITH MIXED STATES — prepare');
 const L1='l1000000-newer-owed',L2='l2000000-older-owed',L3='l3000000-at-prep',L4='l4000000-done';
 const lrows=[rowObj(L1,{table_label:'SP22',zone_name:'Terrace',created_at:minsAgo(2)}),
   rowObj(L3,{table_label:'SP23',zone_name:'Terrace',created_at:minsAgo(30),kitchen_ack_at:minsAgo(29),kitchen_ack_by:'Kitchen Display',status:'acknowledged'}),
   rowObj(L2,{table_label:'SP24',zone_name:'Terrace',created_at:minsAgo(8)}),
   rowObj(L4,{table_label:'T18',created_at:minsAgo(40),kitchen_ack_at:minsAgo(39),kitchen_ack_by:'Kitchen Display',protocol_confirmed_at:minsAgo(38),protocol_confirmed_by:'Kitchen Display',status:'acknowledged'})];
 st.phase='reload';st.reloadIds={all:[L1,L2,L3,L4],oldest:L2,newer:L1,prep:L3,done:L4};
 sessionStorage.setItem(SS,JSON.stringify(st));
 sessionStorage.setItem('hc_fixture_rows',JSON.stringify(lrows));
 await w(100);
 location.reload();
}catch(e){ok('EXCEPTION '+e.message,false,e.stack);await done()}})();
