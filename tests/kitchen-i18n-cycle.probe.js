// EN → ES → 中文 → EN, in every situation a cook can be in. At every transition: the same
// declaration, the same workflow state, the same open surface, and zero AllergyShield writes.
// Offline fixture; B and C (the Tom stand-ins) are never acted on.
setTimeout(()=>{T.push('WATCHDOG');fetch('/__results',{method:'POST',body:T.join('\n')})},170000);
const T=[];let pass=0,fail=0;
const ok=(n,c,x)=>{c?pass++:fail++;T.push((c?'PASS  ':'FAIL  ')+n+(x!==undefined&&x!==''?'   → '+x:''))};
const H=s=>{T.push('');T.push('──── '+s+' ────')};
const w=ms=>new Promise(r=>setTimeout(r,ms)), hrs=h=>new Date(Date.now()-h*3600e3).toISOString();
const W=()=>window.__W__, sh=()=>document.getElementById('verifyContent'), lk=()=>document.getElementById('lockoutContent');
const shOn=()=>document.getElementById('verify').classList.contains('on'), lkOn=()=>document.getElementById('lockout').classList.contains('on');
const B='56a859b5-aaaa',C='7784ff89-bbbb';
function tap(l){const b=document.querySelector('.hdr .lang-b[data-l="'+l+'"]');b.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,cancelable:true}));b.click()}
function tapLockout(l){const b=document.querySelector('.lk-lang .lang-b[data-l="'+l+'"]');b.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,cancelable:true}));b.click()}
async function hold(b){b.dispatchEvent(new MouseEvent('mousedown',{bubbles:true}));await w(1400);b.dispatchEvent(new MouseEvent('mouseup',{bubbles:true}));await w(400)}
function echo(id){const r=window.__ROWS.find(x=>x.id===id),c=cards[id];['kitchen_ack_at','kitchen_ack_by','protocol_confirmed_at','protocol_confirmed_by','verified_at','verified_by','served_at','status'].forEach(k=>{if(c[k]!==undefined)r[k]=c[k]})}
const stateOf=id=>{const c=cards[id];return JSON.stringify([id,c.kitchen_ack_at,c.protocol_confirmed_at,c.verified_at,c.served_at,c.status,c.service_kind,c.superseded_at,c.closed_at])};
const allState=()=>JSON.stringify(Object.keys(cards).sort().map(stateOf));
const MARK={en:/Second Check|Needs You|In Progress|Confirm Received|Mark Served|REHEARSAL/,es:/Segunda revisión|Requiere acción|En curso|Confirmar recepción|Marcar como servida|ENSAYO/i,'zh-CN':/二次检查|需要处理|进行中|确认已收到|标记已出餐|演练/};
// one full cycle; `where` returns a fingerprint of what is open (sheet record + step, lockout record + stage)
async function cycle(label,where,surfaceText,useLockoutControl){
  const s0=allState(),f0=where(),w0=W().length,seq=['es','zh-CN','en'];
  for(const l of seq){
    (useLockoutControl?tapLockout:tap)(l); await w(250);
    ok(label+': → '+l+' applied',locale===l&&document.documentElement.lang===l);
    ok(label+': → '+l+' same open record + state',where()===f0,where());
    ok(label+': → '+l+' every record unchanged',allState()===s0);
    ok(label+': → '+l+' zero AllergyShield writes',W().length===w0,W().length-w0);
    ok(label+': → '+l+' surface drawn in '+l,MARK[l].test(surfaceText()));
    ok(label+': → '+l+' rehearsal still marked',/REHEARSAL|ENSAYO|演练/.test(surfaceText()));
  }
}
(async()=>{try{
 for(let i=0;i<80&&document.querySelectorAll('.row').length<3;i++)await w(100);
 await window.__realLoadVenue(); await w(150);
 const X='cyc0000-x', L='cyc0001-l';
 const base={asset_id:'a1',table_label:'P4',zone_name:'Terrace',guest_name:'Tom',allergens:['Fish','Tree Nuts'],severity:'anaphylaxis',
   cross_contact:true,notes:'I get sick',status:'acknowledged',created_at:hrs(.4),kitchen_ack_at:hrs(.3),kitchen_ack_by:'Kitchen Display',
   protocol_confirmed_at:hrs(.3),protocol_confirmed_by:'Kitchen Display',verified_at:null,verified_by:null,served_at:null,closed_at:null,
   superseded_at:null,supersedes_id:null,minimized_at:null,service_instance_id:'s1',service_kind:'rehearsal',is_open:true};
 window.__ROWS.push(Object.assign({id:X},base),Object.assign({id:L},base,{status:'pending',kitchen_ack_at:null,kitchen_ack_by:null,protocol_confirmed_at:null,protocol_confirmed_by:null,created_at:hrs(.01)}));
 await reconcile(); await w(300);
 ok('a rehearsal is active (every card is rehearsal)',Object.values(cards).every(c=>c.service_kind==='rehearsal'));
 const sheetAt=()=>shOn()?(recordOpenId+'|'+(owedStep(cards[recordOpenId])||{key:'served'}).key+'|'+(recordFlow?recordFlow.a+':'+recordFlow.phase:'-')):'closed';

 H('1 · BOARD OPEN');
 await cycle('board',()=>[...document.querySelectorAll('[data-k^="card:"]')].map(n=>n.dataset.k).join(','),()=>document.getElementById('cardArea').innerText);

 H('2 · RECORD SHEET OPEN — SECOND CHECK OWED (C, opened only)');
 openRecord(C); await w(250);
 ok('C owes Second Check',owedStep(cards[C]).key==='step.verify');
 await cycle('sheet / second check owed',sheetAt,()=>sh().innerText);
 closeRecord(); await w(100);

 H('3 · SECOND CHECK RECORDED (fixture X — one deliberate hold, before the cycle)');
 openRecord(X); await w(250); await hold(sh().querySelector('.vfy-go')); echo(X); await w(200);
 ok('X shows Second Check Recorded',recordFlow&&recordFlow.a==='verify'&&recordFlow.phase==='done');
 await cycle('second check recorded',sheetAt,()=>sh().innerText);

 H('4 · MARK SERVED OWED (X reopened)');
 closeRecord(); await w(100); openRecord(X); await w(250);
 ok('X owes Mark Served',owedStep(cards[X]).key==='step.serve');
 await cycle('mark served owed',sheetAt,()=>sh().innerText);
 closeRecord(); await w(100);

 H('5 · ANAPHYLAXIS LOCKOUT OPEN (L) — switched from the lockout\'s own control');
 renderLockout(L,'ack'); await w(250);
 const lockAt=()=>lkOn()?lockoutId+'|'+lockoutStage:'closed';
 ok('lockout up, received owed',lkOn()&&lockoutStage==='ack');
 await cycle('lockout',lockAt,()=>lk().innerText,true);
 ok('the lockout was never closed or replaced',lkOn()&&lockoutId===L);
 closeLockout();

 H('6 · STAND-INS');
 ok('B and C: zero writes',!W().some(v=>v.__target===B||v.__target===C));
 ok('only X written, exactly once (the deliberate Second Check)',W().length===1&&W()[0].__target===X&&'verified_at' in W()[0]);
}catch(e){T.push('THREW '+e.message+'\n'+(e.stack||''))}
 T.push(''); T.push(fail===0?('ALL '+pass+' CHECKS PASS'):(pass+' pass, '+fail+' FAIL'));
 try{await fetch('/__results',{method:'POST',body:T.join('\n')})}catch(e){}
})();
