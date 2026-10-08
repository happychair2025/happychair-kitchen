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
 ok('"1 of 2" — the second waits',/^1 of 2\b/.test(lkQ()),lkQ());
 await shot('f-two-records-one-table');
 const f1a=alarms.length;await w(ALARM_REPEAT_MS+1200);
 ok('alarm continues: the second is un-acknowledged',alarms.length>f1a);
 await hold(lkBtn());persist(F1);document.querySelector('#lockoutContent .lockout-back').click();await w(200);
 ok('Back → the second record\'s own lockout at Confirm Received',lockoutId===F2&&lockoutStage==='ack'&&/Peanut/.test(lkTxt())&&!/Sesame,/.test(lkTxt()));
 await hold(lkBtn());persist(F2);
 ok('second acknowledged separately, once',MW(F2).filter(x=>'kitchen_ack_at' in x).length===1&&MW(F1).filter(x=>'kitchen_ack_at' in x).length===1);
 await hold(lkBtn());persist(F2);document.querySelector('#lockoutContent .lockout-back').click();await w(200);
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
 ok('K · "Not saved" cleared by the read',!cards[K1]._error);
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
 persist(O1);await hold(lkBtn());persist(O1);document.querySelector('#lockoutContent .lockout-back').click();await w(200);
 await hold(lkBtn());persist(O2);await hold(lkBtn());persist(O2);document.querySelector('#lockoutContent .lockout-back').click();await w(200);

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

 await done();
}catch(e){T.push('EXCEPTION '+e.message+'\n'+e.stack);st.fail++;await done()}})();
