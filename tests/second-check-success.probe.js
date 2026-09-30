// Second Check success state + rehearsal identity through Second Check → Mark Served.
// Offline fixture (record-sheet.fixture.js): B = Tom · Fish, C = Tom · Fish + Tree Nuts (sibling).
const T=[];let pass=0,fail=0;
const ok=(n,c,x)=>{c?pass++:fail++;T.push((c?'PASS  ':'FAIL  ')+n+(x!==undefined&&x!==''?'   → '+x:''))};
const w=ms=>new Promise(r=>setTimeout(r,ms));
const B='56a859b5-aaaa',C='7784ff89-bbbb';
const sheetOn=()=>document.getElementById('verify').classList.contains('on');
const sheet=()=>document.getElementById('verifyContent');
const sheetTxt=()=>sheet().innerText;
const row=id=>{const x=document.querySelector('[data-k="card:'+id+'"]');return x?x.querySelector('.row'):null};
const badge=id=>{const r=row(id);return !!(r&&r.querySelector('.r-reh')&&/REHEARSAL/.test(r.querySelector('.r-reh').textContent))};
const rowAct=id=>{const r=row(id);return r&&r.querySelector('.r-act')?r.querySelector('.r-act').textContent.trim():''};
const W=()=>window.__W__;
const writesFor=id=>W().filter(x=>x.__target===id);
const railDone=label=>{const p=[...sheet().querySelectorAll('.prog .ps')].find(s=>s.querySelector('.plbl').textContent===label);
  return !!(p&&/\bd[vg]\b/.test(p.querySelector('.pd').className)&&p.querySelector('svg'))};
async function hold(btn,ms){
  btn.dispatchEvent(new MouseEvent('mousedown',{bubbles:true}));await w(ms);
  btn.dispatchEvent(new MouseEvent('mouseup',{bubbles:true}));}
function deliverUpdate(rowObj){ // exactly what postgres_changes delivers: table columns only
  const raw=Object.assign({},rowObj);
  ['service_kind','table_label','zone_name','is_open'].forEach(k=>delete raw[k]);
  raw.venue_id='v';
  (window.__RT||[]).filter(h=>h.flt&&h.flt.event==='UPDATE').forEach(h=>h.cb({new:raw}));
}
(async()=>{
 try{
 for(let i=0;i<80&&document.querySelectorAll('.row').length<3;i++)await w(100);
 await window.__realLoadVenue(); await w(100);
 const W0=W().length, Cbefore=JSON.stringify(cards[C]);

 T.push('──── 0 · BEFORE ────');
 ok('B shows REHEARSAL badge at Second Check', badge(B));
 ok('C shows REHEARSAL badge at Second Check', badge(C));
 ok('B row action is Second Check →', /Second Check/.test(rowAct(B)), rowAct(B));

 T.push(''); T.push('──── 1 · OPEN AND HOLD ────');
 row(B).querySelector('.r-act--nav').click(); await w(250);
 ok('review open on B', sheetOn() && recordOpenId===B);
 ok('opening wrote nothing', W().length===W0);
 const hb=sheet().querySelector('.vfy-go');
 ok('hold is Record Second Check', /Hold to Record Second Check/.test(hb.textContent));
 await hold(hb,1400); await w(300);

 T.push(''); T.push('──── 2 · WRITE CONTRACT ────');
 const nw=W().slice(W0);
 ok('exactly one write', nw.length===1, nw.length);
 ok('write targets B', nw[0]&&nw[0].__target===B, nw[0]&&nw[0].__target);
 ok('write is verified_at + verified_by only', nw[0]&&Object.keys(nw[0]).filter(k=>k!=='__target').sort().join(',')==='verified_at,verified_by',
    nw[0]&&Object.keys(nw[0]).join(','));
 ok('no served write', !W().some(x=>'served_at' in x));
 ok('sibling C: zero writes', writesFor(C).length===0);
 ok('sibling C: state identical', JSON.stringify(cards[C])===Cbefore);

 T.push(''); T.push('──── 3 · SUCCESS STATE ────');
 const t=sheetTxt();
 ok('sheet stayed open', sheetOn());
 ok('selected declaration is still B', recordOpenId===B);
 ok('title: Second Check Recorded', sheet().querySelector('.vfy-t').textContent.trim()==='Second Check Recorded');
 ok('rehearsal marker on the success sheet', /REHEARSAL · NOT A GUEST/.test(t));
 ok('identity: P4 · Terrace / Tom / Fish', /P4 · Terrace/.test(t)&&/Tom/.test(t)&&sheet().querySelector('.vfy-al').textContent==='Fish');
 ok('rail: Second Check complete (check mark)', railDone('Second Check'));
 ok('rail: Served NOT complete', !railDone('Served'));
 ok('Ready to Serve heading', /Ready to Serve/i.test(t));
 ok('explanatory copy', /The second check has been recorded\. The next Kitchen step is to mark this allergy record served when the dish leaves the kitchen\./.test(t));
 ok('device-not-person disclosure', /authenticated to Happy Bistro, but it does not identify the person who performed the check/.test(t));
 ok('no personal / different-person claim', !/(checked|verified|confirmed) by|independent/i.test(t));
 const ms=sheet().querySelector('.vfy-go'), back=sheet().querySelector('.vfy-back');
 ok('Mark Served offered as the primary (hold) action', !!ms && /Mark Served/.test(ms.textContent) && ms.classList.contains('hold-btn'));
 ok('Mark Served is a hold, not a click', !!ms && !ms.getAttribute('onclick') && /startHold\([^)]*'serve'\)/.test(ms.getAttribute('onmousedown')));
 ok('Back to Kitchen Board offered as secondary', !!back && back.textContent.trim()==='Back to Kitchen Board');
 ok('no toast used as confirmation', !document.querySelector('.toast,.flash'));

 T.push(''); T.push('──── 4 · REHEARSAL IDENTITY THROUGH THE REALTIME ECHO ────');
 const dbRow=window.__ROWS.find(r=>r.id===B); dbRow.verified_at=cards[B].verified_at; dbRow.verified_by=cards[B].verified_by;
 deliverUpdate(dbRow); await w(200);
 ok('B row action advanced to Mark Served', /Mark Served/.test(rowAct(B)), rowAct(B));
 ok('B keeps REHEARSAL badge after the UPDATE event (regression)', badge(B));
 ok('B card still carries service_kind', cards[B].service_kind==='rehearsal', cards[B].service_kind);
 ok('success sheet survives the UPDATE event', sheetOn() && /Second Check Recorded/.test(sheetTxt()) && /REHEARSAL · NOT A GUEST/.test(sheetTxt()));
 ok('C still at Second Check → with badge', /Second Check/.test(rowAct(C)) && badge(C));

 T.push(''); T.push('──── 5 · POLL / TOKEN REFRESH CANNOT ERASE IT ────');
 await w(5600);   // one real RECONCILE_MS cycle
 ok('after a real poll: still success on B', sheetOn() && recordOpenId===B && /Second Check Recorded/.test(sheetTxt()));
 await vdExchange(); await w(300);
 ok('after a token refresh: still success on B', sheetOn() && /Second Check Recorded/.test(sheetTxt()));
 renderCards(); renderCards(); await w(100);
 ok('after forced re-renders: still success, badge intact', /Second Check Recorded/.test(sheetTxt()) && badge(B));
 ok('still exactly one write overall', W().length-W0===1);

 T.push(''); T.push('──── 6 · MARK SERVED IS NOT EXECUTED ────');
 await hold(sheet().querySelector('.vfy-go'),300); await w(250);
 ok('an early release on Mark Served writes nothing', W().length-W0===1 && !cards[B].served_at);
 ok('...and the success sheet is still up', sheetOn() && /Second Check Recorded/.test(sheetTxt()));

 T.push(''); T.push('──── 7 · BACK ────');
 sheet().querySelector('.vfy-back').click(); await w(200);
 ok('Back closes the sheet', !sheetOn() && recordOpenId===null);
 ok('Back wrote nothing', W().length-W0===1);
 ok('board: B at Mark Served with badge, C at Second Check with badge', /Mark Served/.test(rowAct(B))&&badge(B)&&/Second Check/.test(rowAct(C))&&badge(C));
 openRecord(B); await w(200);
 ok('reopening B shows the ordinary record, not a stale success', !/Second Check Recorded/.test(sheetTxt()) && /Hold to Mark Served/.test(sheetTxt()));
 ok('reopened record still marked rehearsal', /REHEARSAL · NOT A GUEST/.test(sheetTxt()));
 closeRecord(); await w(100);

 T.push(''); T.push('──── 8 · FAILED AND HUNG WRITES (fixture C only) ────');
 const realFrom=sbv.from;
 sbv.from=function(){return {update:function(v){W().push(Object.assign({__fail:1},v));return {eq:function(){return Promise.resolve({error:{message:'refused'}})}}}}};
 openRecord(C); await w(200); await hold(sheet().querySelector('.vfy-go'),1400); await w(300);
 ok('refused write: no success state', !/Second Check Recorded/.test(sheetTxt()));
 ok('refused write: back on the review with the hold, error shown', /Hold to Record Second Check/.test(sheetTxt()) && /Couldn.t verify/.test(sheetTxt()));
 ok('refused write: C verified_at reverted', !cards[C].verified_at);
 closeRecord(); delete cards[C]._error; await w(100);
 sbv.from=function(){return {update:function(v){W().push(Object.assign({__hang:1},v));return {eq:function(){return new Promise(function(){})}}}}};
 openRecord(C); await w(200); await hold(sheet().querySelector('.vfy-go'),1400); await w(600);
 ok('hung write: never claims success', !/Second Check Recorded/.test(sheetTxt()));
 ok('hung write: never offers the next step early', !/Mark (as )?Served/.test(sheetTxt()), (sheetTxt().match(/Hold[^\n]*/)||[''])[0]);
 sbv.from=realFrom;
 }catch(e){T.push('THREW '+e.message+'\n'+(e.stack||''))}
 T.push(''); T.push(fail===0?('ALL '+pass+' CHECKS PASS'):(pass+' pass, '+fail+' FAIL'));
 try{await fetch('/__results',{method:'POST',body:T.join('\n')})}catch(e){}
})();
