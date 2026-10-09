// W1-3 Safety continuity — fault injection against the real board, all network stubbed.
//   node tests/harness/run.js tests/safety-continuity.probe.js --query=inst=1&rows=none --out=tests/safety-continuity.results.txt
// (a) realtime socket dead; the record is found ONLY by the board read → lockout within one
//     reconcile cycle, alarm, exactly one guarded delivered_to_kitchen_at write; the alarm repeats
//     until the acknowledgement is confirmed and then stops.
// (b) two anaphylaxis INSERTs in the same moment → two sequential lockouts, "1 of 2", both
//     acknowledged individually, neither lost or overwritten; labels from the board read, never
//     from the anonymous client.
// (c) reload with audio locked → blocking "Tap to enable allergy alarms" above the lockout; an
//     untrusted click cannot dismiss it; a real tap unlocks audio and the pending alarm sounds.
// (d) a write that hangs → bounded; state reverted; "Not confirmed — tap to check" on the row; the
//     record sheet says why; a retry with a working connection records exactly once.
// (e) a carried-over record renders in its own "From Earlier Service" band below Needs You,
//     labelled and actionable.
// (f, j, o, p, q, r) — no client-side merging, alarm-on-ack, stale writes, unknown state, hold
//     cancellation — live in safety-continuity-2.probe.js (same harness, split for run time).
// (g) a retry after a timed-out write that DID commit: guarded (IS NULL), matches nothing,
//     the board is re-read, "Already recorded — this hold changed nothing", timestamp unchanged.
// (h) alarms are single-flight: three lockouts in one board read = one alarm; slider volume intact.
// (i) cache-restored records are silent until the first board read, and a cached un-acked record
//     that the board read shows acknowledged never becomes a lockout.
// The realtime socket is "dead" throughout (a), (d), (e), (g), (h): no handler is ever invoked.
const SS='hc_probe_w13';
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
 if(st.phase==='c'&&!st.cold){
   H('(i) CACHE-RESTORED STATE IS SILENT UNTIL THE BOARD READ');
   const R9='i9000000-cache-acked-elsewhere',R10='ia000000-cache-gone';
   ok('before any board read: both cached records are on the board',!!cards[R9]&&!!cards[R10]&&lastReconcileOk===0);
   ok('...marked unconfirmed, raising no lockout',cards[R9]._fromCache===true&&!lkOn()&&!window.__LKLOG.some(x=>x.startsWith(R9)||x.startsWith(R10)),window.__LKLOG.join());
   ok('...and nothing escalates from them',!alarmPending());
   await until(()=>lastReconcileOk>0,8000);await w(300);
   ok('board read shows R9 acknowledged elsewhere: never a lockout, not even at Prep',!!cards[R9]&&!!cards[R9].kitchen_ack_at&&!window.__LKLOG.some(x=>x.startsWith(R9)),window.__LKLOG.join());
   ok('R10, absent from the board read, is gone and never locked out',!cards[R10]&&!window.__LKLOG.some(x=>x.startsWith(R10)));
   ok('R9 confirmed by the read',!cards[R9]._fromCache);
 }
 await until(()=>typeof reconcile==='function'&&paired()&&lastReconcileOk>0,8000);

 if(st.phase!=='c'){
 // ── unlock audio with a TRUSTED tap, exactly as a cook would ─────────────────────────────
 H('SETUP');
 const ap=document.getElementById('audioPrompt');
 ok('audio prompt is up at first paint',getComputedStyle(ap).display!=='none');
 const r0=ap.getBoundingClientRect();await tap(r0.left+r0.width/2,r0.top+r0.height/2);
 ok('a real tap unlocks audio',await until(()=>audioReady&&ctx&&ctx.state==='running',3000)>=0,ctx&&ctx.state);
 ok('prompt taken down only once audio runs',getComputedStyle(ap).display==='none');
 ok('board empty, nothing pending',Object.keys(cards).length===0&&!lkOn());
 const realtimeCalls=[];insertHandlers().forEach(h=>{const cb=h.cb;h.cb=function(){realtimeCalls.push(1);return cb.apply(this,arguments)}});

 // ── (a) ───────────────────────────────────────────────────────────────────────────────────
 H('(a) SOCKET DEAD — FOUND BY THE BOARD READ ONLY');
 const R1='a1000000-anaph-reconcile';
 const a0=alarms.length;
 window.__ROWS.push(rowObj(R1,{table_label:'T3',zone_name:'Main Hall',guest_name:'Socket Dead'}));
 const tLk=await until(()=>lkOn()&&lockoutId===R1,RECONCILE_MS+3000);
 ok('lockout within one reconcile cycle',tLk>=0&&tLk<=RECONCILE_MS+1500,tLk+'ms (cycle '+RECONCILE_MS+'ms)');
 ok('no realtime event was delivered',realtimeCalls.length===0);
 ok('lockout shows the record: T3 · Main Hall, allergens, ANAPHYLAXIS',/T3 · Main Hall/.test(lkTxt())&&/Sesame/.test(lkTxt())&&/ANAPHYLAXIS/.test(lkTxt()));
 ok('alarm sounded on arrival',alarms.length>a0,(alarms.length-a0)+' alarm(s)');
 ok('exactly one delivery write',DW(R1).length===1,DW(R1).length);
 ok('...delivered_to_kitchen_at + device_id, guarded IS NULL',!!DW(R1)[0]&&!!DW(R1)[0].delivered_to_kitchen_at&&DW(R1)[0].device_id==='Kitchen Display'&&(DW(R1)[0].__is||[]).join()==='delivered_to_kitchen_at is null');
 ok('...bounded (abort signal attached)',!!DW(R1)[0]&&DW(R1)[0].__signal===true);
 ok('no milestone was written by ingest',MW(R1).length===0);
 await shot('a-lockout-from-reconcile');
 const a1=alarms.length;
 await w(ALARM_REPEAT_MS+RECONCILE_MS+1200);
 ok('alarm repeats while unacknowledged',alarms.length>a1,(alarms.length-a1)+' repeat(s) in '+(ALARM_REPEAT_MS+RECONCILE_MS+1200)+'ms');
 ok('still exactly one delivery write after further board reads',DW(R1).length===1,DW(R1).length);
 // Refused acknowledgement does NOT stop the alarm.
 window.__WRITE_MODE='err';await hold(lkBtn());window.__WRITE_MODE='ok';
 ok('refused ack: lockout still asks for Confirm Received, error shown',lkOn()&&lockoutId===R1&&lockoutStage==='ack'&&!!document.querySelector('#lockoutContent .lk-err'));
 const a2=alarms.length;await w(ALARM_REPEAT_MS+1200);
 ok('alarm continues after a refused ack (not merely dismissed)',alarms.length>a2,(alarms.length-a2));
 await hold(lkBtn());persist(R1);
 ok('ack recorded once, to R1',MW(R1).filter(x=>'kitchen_ack_at' in x).length===2&&cards[R1].kitchen_ack_at,MW(R1).length+' attempts (1 refused, 1 accepted)');
 const a3=alarms.length;await w(ALARM_REPEAT_MS+1500);
 ok('alarm stops once the ack is confirmed',alarms.length===a3,(alarms.length-a3)+' after ack');
 ok('lockout moved to Prep on the SAME record',lkOn()&&lockoutId===R1&&lockoutStage==='prep');
 await hold(lkBtn());persist(R1);
 document.querySelector('#lockoutContent .lockout-back').click();await w(200);
 ok('lockout closed after Back',!lkOn());

 // ── (b) ───────────────────────────────────────────────────────────────────────────────────
 H('(b) TWO ANAPHYLAXIS INSERTS IN ONE MOMENT');
 const R2='b2000000-anaph-first',R3='b3000000-anaph-second';
 const raw=(id,o)=>{const r=rowObj(id,o);const x=Object.assign({},r);['table_label','zone_name','service_kind','is_open'].forEach(k=>delete x[k]);x.venue_id='v';return {row:r,raw:x}};
 const i2=raw(R2,{asset_id:'asset-p5',table_label:'P5',guest_name:'First Arrival',allergens:['Peanut']});
 const i3=raw(R3,{asset_id:'asset-p6',table_label:'P6',guest_name:'Second Arrival',allergens:['Shellfish']});
 window.__ROWS.push(i2.row,i3.row);
 const anon0=window.__ANON__.length,b0=alarms.length;
 insertHandlers().forEach(h=>{h.cb({new:i2.raw});h.cb({new:i3.raw})});
 await w(150);
 ok('first arrival is on the lockout',lkOn()&&lockoutId===R2&&/FIRST/.test(lkTxt()));
 ok('second arrival is queued, not lost and not overwriting',lockoutQueue.indexOf(R3)>=0&&!!cards[R3]);
 ok('"1 of 2" shown',/^1 of 2\b/.test(lkQ()),lkQ());
 ok('alarm sounded',alarms.length>b0);
 ok('one delivery write each',DW(R2).length===1&&DW(R3).length===1);
 ok('the anonymous client was never used for a label',window.__ANON__.length===anon0,window.__ANON__.slice(anon0).join());
 await until(()=>/P5 · Terrace/.test(lkTxt()),RECONCILE_MS+2000);
 ok('label comes from the board read (P5 · Terrace)',/P5 · Terrace/.test(lkTxt()));
 await shot('b-lockout-1-of-2');
 await hold(lkBtn());persist(R2);
 ok('R2 acknowledged — R3 untouched',MW(R2).length===1&&MW(R3).length===0);
 // W2-K1 (Product Owner, Oct 9 2026): an un-acknowledged record takes priority over a lockout at a
 // routine step. R2 is now at Prep, so R3 takes the screen; R2 waits at the FRONT of the routine queue.
 ok('R3 (un-acknowledged) takes the screen from R2 at Prep; R2 waits: "1 of 2"',lockoutId===R3&&lockoutStage==='ack'&&/SECOND/.test(lkTxt())&&lockoutRoutine[0]===R2&&/^1 of 2\b/.test(lkQ()),lockoutId+' '+lkQ());
 ok('R2 keeps its acknowledgement and is not written again',!!cards[R2].kitchen_ack_at&&MW(R2).length===1);
 const b1=alarms.length;await w(ALARM_REPEAT_MS+1200);
 ok('alarm continues: R3 is still unacknowledged',alarms.length>b1);
 await shot('b-lockout-second');
 await hold(lkBtn());persist(R3);
 ok('R3 acknowledged individually, exactly once',MW(R3).filter(x=>'kitchen_ack_at' in x).length===1&&MW(R2).filter(x=>'kitchen_ack_at' in x).length===1);
 ok('R3 confirmed in place (Prep); R2 still waiting',lockoutId===R3&&lockoutStage==='prep'&&/^1 of 2\b/.test(lkQ()),lkQ());
 await hold(lkBtn());persist(R3);document.querySelector('#lockoutContent .lockout-back').click();await w(200);
 ok('Back returns R2 at its own step (Prep)',lkOn()&&lockoutId===R2&&lockoutStage==='prep'&&/FIRST/.test(lkTxt()));
 ok('no queue line for the last one',lkQ()==='');
 await hold(lkBtn());persist(R2);
 document.querySelector('#lockoutContent .lockout-back').click();await w(200);
 ok('both handled, board clear of lockouts',!lkOn()&&lockoutQueue.length===0);

 // ── (d) ───────────────────────────────────────────────────────────────────────────────────
 H('(d) A WRITE THAT HANGS');
 const R4='d4000000-severe-hang';
 window.__ROWS.push(rowObj(R4,{severity:'severe',table_label:'T7',zone_name:'Main Hall',guest_name:'Hung Write'}));
 await until(()=>!!document.querySelector('[data-k="card:'+R4+'"] .hold-btn'),RECONCILE_MS+2000);
 const rb=()=>document.querySelector('[data-k="card:'+R4+'"] .row .hold-btn');
 window.__WRITE_MODE='hang';
 const t0=Date.now();await hold(rb());
 ok('write in flight: guarded',cards[R4]._writing===true);
 const tEnd=await until(()=>!cards[R4]._writing,WRITE_TIMEOUT_MS+3000,100);
 ok('bounded: released after the timeout',tEnd>=0&&Date.now()-t0<=WRITE_TIMEOUT_MS+2500,(Date.now()-t0)+'ms');
 ok('state reverted (no ack, no pending ack)',!cards[R4].kitchen_ack_at&&!cards[R4]._ackPending);
 await w(150);
 const retry=document.querySelector('[data-k="card:'+R4+'"] .row-retry');
 ok('row says the outcome is unknown: "Not confirmed — tap to check"',!!retry&&retry.textContent.trim()==='Not confirmed — tap to check',retry&&retry.textContent);
 ok('the hold is available again on the row',!!rb()&&/Confirm Received/.test(rb().textContent));
 ok('card still in Needs You',!!document.querySelector('[data-k="card:'+R4+'"]'));
 await shot('d-row-not-saved');
 await w(RECONCILE_MS+1500);
 ok('message persists across a board read (outcome still unknown)',!!document.querySelector('[data-k="card:'+R4+'"] .row-retry'));
 retry.click();await w(250);
 const sheet=document.getElementById('verifyContent').innerText;
 ok('tap opens the record, which explains and offers the hold',document.getElementById('verify').classList.contains('on')&&/No response — couldn't confirm\. Hold to try again\./.test(sheet)&&!!document.querySelector('#verifyContent .vfy-go'));
 await shot('d-sheet-not-saved');
 window.__WRITE_MODE='ok';
 const n4=MW(R4).length;await hold(document.querySelector('#verifyContent .vfy-go'));persist(R4);
 ok('retry with a working connection records exactly once',MW(R4).length===n4+1&&!!cards[R4].kitchen_ack_at);
 ok('message cleared by the success',!cards[R4]._error&&!document.querySelector('[data-k="card:'+R4+'"] .row-retry'));
 closeRecord();
 // A timed-out write that DID commit: the board read brings the truth back and clears the message.
 const R4b='d4100000-hang-committed';
 window.__ROWS.push(rowObj(R4b,{severity:'severe',table_label:'T8',zone_name:'Main Hall',guest_name:'Late Commit'}));
 await until(()=>!!document.querySelector('[data-k="card:'+R4b+'"] .row .hold-btn'),RECONCILE_MS+2000);
 window.__WRITE_MODE='hang';await hold(document.querySelector('[data-k="card:'+R4b+'"] .row .hold-btn'));
 await until(()=>!cards[R4b]._writing,WRITE_TIMEOUT_MS+3000,100);window.__WRITE_MODE='ok';
 window.__ROWS.find(x=>x.id===R4b).kitchen_ack_at=new Date().toISOString();
 await until(()=>!!cards[R4b].kitchen_ack_at,RECONCILE_MS+2000);
 ok('committed-after-timeout: board read restores the ack and clears the unknown-state message',!!cards[R4b].kitchen_ack_at&&!cards[R4b]._error);

 // ── (e) ───────────────────────────────────────────────────────────────────────────────────
 H('(e) CARRIED-OVER RECORD');
 const R5='e5000000-carried',R6='e6000000-current-needs',R7='e7000000-current-working';
 window.__ROWS.push(rowObj(R5,{severity:'severe',table_label:'SP21',zone_name:'Terrace',guest_name:'Yesterday Guest',created_at:ago(60*20),service_instance_id:'s0',carried_over:true}),
   rowObj(R6,{severity:'discomfort',table_label:'T1',zone_name:'Main Hall',guest_name:'Now Guest'}),
   rowObj(R7,{severity:'severe',table_label:'T2',zone_name:'Main Hall',guest_name:'Working Guest',kitchen_ack_at:ago(0.5),status:'acknowledged'}));
 await until(()=>!!document.querySelector('[data-k="card:'+R5+'"]'),RECONCILE_MS+2000);
 const keys=[...document.getElementById('cardArea').children].map(n=>n.dataset.k);
 const iN=keys.indexOf('sec:needs'),iC=keys.indexOf('sec:carried'),iW=keys.indexOf('sec:working'),iR=keys.indexOf('card:'+R5);
 ok('band order: Needs You → From Earlier Service → In Progress',iN>=0&&iC>iN&&iW>iC,keys.filter(k=>k.startsWith('sec')).join(' | '));
 ok('the carried record sits in its band',iR>iC&&iR<iW);
 const hd=document.querySelector('[data-k="sec:carried"]').innerText;
 ok('band labelled "From Earlier Service"',/From Earlier Service/i.test(hd),hd.replace(/\s+/g,' '));
 ok('band explains it is still open',/Still open from an earlier service/.test(document.querySelector('[data-k="carried-note"]').innerText));
 ok('carried record is actionable (Confirm Received hold)',!!document.querySelector('[data-k="card:'+R5+'"] .row .hold-btn'));
 ok('not collapsed, not dimmed',getComputedStyle(document.querySelector('[data-k="card:'+R5+'"]')).opacity==='1');
 await shot('e-carried-band');
 await hold(document.querySelector('[data-k="card:'+R5+'"] .row .hold-btn'));persist(R5);
 ok('acknowledging it writes once to it',MW(R5).length===1&&!!cards[R5].kitchen_ack_at);
 ok('one delivery write each for R4..R7',[R4,R4b,R5,R6,R7].every(id=>DW(id).length===1));

 // ── (g) ───────────────────────────────────────────────────────────────────────────────────
 H('(g) RETRY AFTER A TIMED-OUT WRITE THAT DID COMMIT');
 const G1='g1000000-anaph-late-commit';
 window.__ROWS.push(rowObj(G1,{table_label:'T9',zone_name:'Main Hall',guest_name:'Late Ack'}));
 await until(()=>lockoutId===G1,RECONCILE_MS+2000);
 window.__WRITE_MODE='hang';await hold(lkBtn());
 const hungAck=MW(G1).slice(-1)[0];
 ok('ack write is guarded IS NULL',!!hungAck&&(hungAck.__is||[]).indexOf('kitchen_ack_at is null')>=0);
 await until(()=>!cards[G1]._writing,WRITE_TIMEOUT_MS+3000,100);window.__WRITE_MODE='ok';
 window.__ROWS.find(x=>x.id===G1).kitchen_ack_at=hungAck.kitchen_ack_at;
 ok('timed out: lockout still asks for Confirm Received',lockoutId===G1&&lockoutStage==='ack'&&/No response — couldn't confirm/.test(lkTxt()));
 const ackChimes=[];const _cka=chimeAck;chimeAck=function(){ackChimes.push(1);return _cka.apply(this,arguments)};
 const nG=MW(G1).length;await hold(lkBtn());
 await until(()=>/Already recorded/.test(lkTxt()),RECONCILE_MS+4000);
 const retryG=MW(G1)[nG];
 ok('the retry was guarded and matched nothing',!!retryG&&(retryG.__is||[]).indexOf("kitchen_ack_at is null")>=0&&retryG.__noRow===1);
 ok('recorded time NOT rewritten (board read shows the committed one)',cards[G1].kitchen_ack_at===hungAck.kitchen_ack_at,cards[G1].kitchen_ack_at+' vs '+hungAck.kitchen_ack_at);
 ok('"Already recorded — this hold changed nothing." on the lockout',/Already recorded — this hold changed nothing\./.test(lkTxt()));
 ok('lockout shows the recorded state (Prep), no confirmation chime claimed',lockoutStage==='prep'&&ackChimes.length===0);
 await shot('g-already-recorded');
 chimeAck=_cka;
 await hold(lkBtn());persist(G1);document.querySelector('#lockoutContent .lockout-back').click();await w(200);

 // ── (h) ───────────────────────────────────────────────────────────────────────────────────
 H('(h) ALARM IS SINGLE-FLIGHT, VOLUME INTACT');
 setVolume(30);
 const h0=alarms.length,now=new Date().toISOString();
 ['h1000000-a','h2000000-b','h3000000-c'].forEach((id,i)=>window.__ROWS.push(rowObj(id,{created_at:now,table_label:'SP'+(22+i),zone_name:'Terrace',guest_name:'Burst '+i})));
 await until(()=>lockoutQueue.length>=2,RECONCILE_MS+2000);await w(800);
 ok('three lockouts in one board read → ONE alarm',alarms.length-h0===1,alarms.length-h0);
 ok('never more than one alarm sounding (3 tones)',anaphNodes.length<=3,anaphNodes.length);
 ok('slider volume untouched by the alarm',Math.abs(volume-0.3)<1e-9,volume);
 ok('"1 of 3"',/^1 of 3\b/.test(lkQ()),lkQ());
 setVolume(60);
 // W2-K1: each acknowledgement puts that record at Prep, so the next un-acknowledged one takes the
 // screen; the Prep steps follow once none is owed. Every record still handled one at a time.
 const hIds=['h1000000-a','h2000000-b','h3000000-c'],hSeen=[];
 for(let i=0;i<12&&lkOn();i++){const id=lockoutId;hSeen.push(id.slice(0,2)+':'+lockoutStage);
   if(lockoutStage==='done'){document.querySelector('#lockoutContent .lockout-back').click();await w(200)}
   else{await hold(lkBtn());persist(id)}}
 ok('burst: all three acknowledged before any Prep step is shown',hSeen.slice(0,3).every(x=>/:ack$/.test(x))&&new Set(hSeen.slice(0,3)).size===3,hSeen.join(' '));
 ok('burst cleared one at a time, each acknowledged once',!lkOn()&&lockoutQueue.length===0&&lockoutRoutine.length===0&&hIds.every(id=>MW(id).filter(x=>'kitchen_ack_at' in x).length===1&&MW(id).filter(x=>'protocol_confirmed_at' in x).length===1),hSeen.join(' '));

 // ── (c) prepare: reload with audio locked ─────────────────────────────────────────────────
 H('(c) RELOAD WITH AUDIO LOCKED');
 st.phase='c';sessionStorage.setItem(SS,JSON.stringify(st));
 // (i) setup: this tablet's cache holds two un-acknowledged anaphylaxis records. After the reload
 // the database holds R9 ACKNOWLEDGED (by another display) and does not return R10 at all.
 cacheCards();
 const R9='i9000000-cache-acked-elsewhere',R10='ia000000-cache-gone';
 const cc=JSON.parse(localStorage.getItem(CACHE_K)||'{}');
 cc[R9]=rowObj(R9,{table_label:'T5',zone_name:'Main Hall',guest_name:'Cached Acked'});
 cc[R10]=rowObj(R10,{table_label:'T6',zone_name:'Main Hall',guest_name:'Cached Gone'});
 localStorage.setItem(CACHE_K,JSON.stringify(cc));
 sessionStorage.setItem('hc_fixture_rows',JSON.stringify([rowObj(R9,{table_label:'T5',zone_name:'Main Hall',guest_name:'Cached Acked',kitchen_ack_at:minsAgo(0.5),kitchen_ack_by:'Other Display',status:'acknowledged'})]));
 sessionStorage.setItem('hc_fixture_delay_board','2500');
 location.reload();
 return;
 }

 // ── (c) after reload ────────────────────────────────────────────────────────────────────────
 // Headless Chrome does not enforce the autoplay policy (measured: an AudioContext created from an
 // untrusted click reports 'running' even in a fresh profile). On the cold run the policy is
 // EMULATED the way the real one decides it: a context created without user activation starts
 // suspended, and resume() only takes effect while navigator.userActivation.isActive — which a
 // synthetic .click() never sets and the harness's trusted /__tap does.
 if(st.cold){const RealAC=window.AudioContext;
   window.AudioContext=function(){const c=new RealAC();if(!navigator.userActivation.isActive){c.suspend();const r=c.resume.bind(c);
     c.resume=function(){return navigator.userActivation.isActive?r():new Promise(function(){})}}return c};
   T.push('      autoplay policy emulated (resume requires navigator.userActivation.isActive)')}
 const R8='c8000000-anaph-after-reload';
 window.__ROWS.push(rowObj(R8,{table_label:'P2',zone_name:'Patio',guest_name:'After Reload'}));
 await reconcile();await w(200);
 const ap=document.getElementById('audioPrompt');
 ok('prompt up after reload',getComputedStyle(ap).display!=='none');
 ok('reads "Tap to enable allergy alarms"',ap.innerText.trim()==='Tap to enable allergy alarms',ap.innerText.trim());
 const cx=innerWidth/2,cy=innerHeight/2;
 ok('it is blocking: covers the screen',ap.contains(document.elementFromPoint(cx,cy))&&ap.contains(document.elementFromPoint(5,5))&&ap.contains(document.elementFromPoint(innerWidth-5,innerHeight-5)));
 ok('above the lockout: the lockout is up behind it',lkOn()&&lockoutId===R8&&+getComputedStyle(ap).zIndex>+getComputedStyle(document.getElementById('lockout')).zIndex);
 ok('audio is NOT ready, so nothing has claimed to sound',!audioReady&&alarms.length===0);
 await shot('c-reload-audio-locked');
 ap.click();await w(600);
 if(st.cold)ok('an untrusted click cannot dismiss it (audio not granted)',getComputedStyle(ap).display!=='none'&&!audioReady&&(!ctx||ctx.state!=='running'),ctx?ctx.state:'no ctx');
 else{T.push('      untrusted click after reload: browser reports AudioContext '+(ctx?ctx.state:'none')+' (Chrome may grant audio to an origin already engaged this session)');
   ok('prompt is down ONLY if audio is actually running',(getComputedStyle(ap).display==='none')===(!!ctx&&ctx.state==='running'&&audioReady))}
 if(getComputedStyle(ap).display!=='none')await tap(cx,cy);
 ok('a real tap unlocks audio and removes it',await until(()=>audioReady&&getComputedStyle(ap).display==='none',3000)>=0);
 ok('the pending alarm sounds within one tick',await until(()=>alarms.length>0,2500)>=0,alarms.length);
 ok('delivery written once for the new record',DW(R8).length===1);
 ok('the lockout is there, unchanged',lkOn()&&lockoutId===R8&&lockoutStage==='ack');
 ok('no anonymous client use anywhere in the run',window.__ANON__.length===0,window.__ANON__.join());
 await shot('c-after-tap');
 await done();
}catch(e){T.push('EXCEPTION '+e.message+'\n'+e.stack);st.fail++;await done()}})();
