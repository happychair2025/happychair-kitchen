// Phase 1 copy + layout contract. One fixture record walked through every Record Sheet state
// and every lockout stage; each state is checked against the same hierarchy and the same
// redundancy rules. Offline fixture; B and C (the Tom stand-ins) are never acted on.
setTimeout(()=>{T.push('WATCHDOG');fetch('/__results',{method:'POST',body:T.join('\n')})},150000);
const T=[];let pass=0,fail=0;
const ok=(n,c,x)=>{c?pass++:fail++;T.push((c?'PASS  ':'FAIL  ')+n+(x!==undefined&&x!==''?'   → '+x:''))};
const w=ms=>new Promise(r=>setTimeout(r,ms)), hrs=h=>new Date(Date.now()-h*3600e3).toISOString();
const sh=()=>document.getElementById('verifyContent'), lk=()=>document.getElementById('lockoutContent');
async function hold(b){b.dispatchEvent(new MouseEvent('mousedown',{bubbles:true}));await w(1400);b.dispatchEvent(new MouseEvent('mouseup',{bubbles:true}));await w(400)}
function echo(id){const r=window.__ROWS.find(x=>x.id===id),c=cards[id];['kitchen_ack_at','kitchen_ack_by','protocol_confirmed_at','protocol_confirmed_by','verified_at','verified_by','served_at','status'].forEach(k=>{if(c[k]!==undefined)r[k]=c[k]})}
const topOf=(root,q)=>{const e=root.querySelector(q);return e?e.getBoundingClientRect().top:null};
const BANNED=/\bsafe\b|safely|guarantee|protected|risk-free|independent|verified by|checked by/i;
function sheetContract(name,{title,served,wait,instr,hold:holdLbl,back}){
  const r=sh(),t=r.innerText;
  T.push('');T.push('──── '+name+' ────');
  ok('title is the current step / state',r.querySelector('.vfy-t').textContent.trim()===title,r.querySelector('.vfy-t').textContent.trim());
  ok('REHEARSAL marker',/REHEARSAL · NOT A GUEST/.test(t));
  ok('cross-contact stated exactly once (chip)',(t.match(/CROSS-CONTACT/g)||[]).length===1&&!/asked for cross-contact/.test(t));
  ok('no section heading for a single instruction',!r.querySelector('.vfy-sec'));
  ok('exactly one instruction line',r.querySelectorAll('.vfy-do').length===1&&r.querySelector('.vfy-do').textContent.trim()===instr,r.querySelector('.vfy-do')&&r.querySelector('.vfy-do').textContent.trim());
  ok('exactly one provenance line, display not person',r.querySelectorAll('.vfy-prov').length===1&&/records the display, not the person\./.test(r.querySelector('.vfy-prov').textContent));
  ok('provenance is subordinate (smaller than the instruction)',parseFloat(getComputedStyle(r.querySelector('.vfy-prov')).fontSize)<parseFloat(getComputedStyle(r.querySelector('.vfy-do')).fontSize));
  ok(wait?'wait line names the owed step':'no wait line once served',wait?new RegExp('^'+wait+' waiting ').test((r.querySelector('.vfy-el')||{}).textContent||''):!r.querySelector('.vfy-el'));
  ok(served?'reference lists gone once served':'Avoid all + guest notes present',served?!r.querySelector('.avoid')&&!/Guest notes/i.test(t):!!r.querySelector('.avoid')&&/Guest notes/i.test(t)&&/I get sick/.test(t));
  const order=served?['.vfy-reh','.vfy-t','.vfy-tbl','.vfy-guest','.vfy-al','.vfy-marks','.prog','.vfy-do','.vfy-prov']
                    :['.vfy-reh','.vfy-t','.vfy-tbl','.vfy-guest','.vfy-al','.vfy-marks','.vfy-el','.prog','.avoid','.al-notes','.vfy-do','.vfy-go','.vfy-prov'];
  const ys=order.map(q=>topOf(r,q));
  ok('hierarchy order: '+order.join(' → '),ys.every((y,i)=>y!==null&&(i===0||y>=ys[i-1])),ys.map(Math.round).join(' '));
  if(holdLbl)ok('one action: '+holdLbl,r.querySelectorAll('.vfy-go').length===1&&r.querySelector('.vfy-go').textContent.trim()===holdLbl);
  if(back)ok('Back to Kitchen Board',/Back to Kitchen Board/.test(r.querySelector('.vfy-back').textContent));
  ok('no prohibited claims',!BANNED.test(t),(t.match(BANNED)||[''])[0]);
}
(async()=>{try{
 for(let i=0;i<80&&document.querySelectorAll('.row').length<3;i++)await w(100);
 await window.__realLoadVenue();
 const X='copy0000-x';
 window.__ROWS.push({id:X,asset_id:'a1',table_label:'P4',zone_name:'Terrace',guest_name:'Tom',allergens:['Fish','Tree Nuts'],
   severity:'anaphylaxis',cross_contact:true,notes:'I get sick',status:'pending',created_at:hrs(0.3),kitchen_ack_at:null,kitchen_ack_by:null,
   protocol_confirmed_at:null,protocol_confirmed_by:null,verified_at:null,verified_by:null,served_at:null,closed_at:null,superseded_at:null,
   supersedes_id:null,minimized_at:null,service_instance_id:'s1',service_kind:'rehearsal',is_open:true});
 await reconcile(); await w(300); const W0=window.__W__.length;
 openRecord(X); await w(300);
 sheetContract('RECEIVED',{title:'Confirm Received',wait:'Confirm Received',instr:'Confirm the kitchen has received this allergy.',hold:'Hold to Confirm Allergy Received'});
 await hold(sh().querySelector('.vfy-go')); echo(X);
 sheetContract('PREP (after Received)',{title:'Prep Confirmation',wait:'Prep Confirmation',instr:'Clear and separate the prep area, utensils and surfaces.',hold:'Hold to Confirm Prep Area Cleared'});
 ok('Received confirmation shown once, in place',sh().querySelectorAll('.vfy-ok').length===1&&/Allergy Received/.test(sh().querySelector('.vfy-ok').textContent));
 await hold(sh().querySelector('.vfy-go')); echo(X);
 sheetContract('SECOND CHECK (after Prep)',{title:'Second Check',wait:'Second Check',instr:'Have another team member check the allergy preparation.',hold:'Hold to Record Second Check'});
 await hold(sh().querySelector('.vfy-go')); echo(X);
 sheetContract('SECOND CHECK RECORDED',{title:'Second Check Recorded',wait:'Mark Served',instr:'Mark served when the dish leaves the kitchen.',hold:'Hold to Mark Served',back:true});
 await hold(sh().querySelector('.vfy-go')); echo(X);
 sheetContract('SERVED RECORDED',{title:'Served Recorded',served:true,instr:'Kitchen steps complete.',back:true});
 ok('served: rail carries the served time (not repeated as prose)',!/Served at/.test(sh().innerText)&&/\d/.test(sh().querySelectorAll('.prog .ptm')[3].textContent));
 closeRecord(); openRecord(X); await w(300);
 ok('a served record reopened later shows the same completed state',sh().querySelector('.vfy-t').textContent.trim()==='Served Recorded');
 closeRecord();
 ok('walk wrote exactly the four milestones, to X only',window.__W__.slice(W0).map(v=>v.__target).every(id=>id===X)&&window.__W__.length-W0===4,window.__W__.length-W0);

 const L='copy0001-l';
 // W2-K1 (lockout priority): an owed anaphylaxis record takes the screen from a lockout at a routine
 // step, so the fixture's un-acknowledged Closure Test record would replace L at Prep. This section
 // checks COPY at every stage of one lockout, so that record is acknowledged (elsewhere) first.
 Object.assign(window.__ROWS.find(x=>x.id==='ba65384b-cccc'),{kitchen_ack_at:hrs(0.02),kitchen_ack_by:'Kitchen Display',status:'acknowledged'});
 window.__ROWS.push(Object.assign({},window.__ROWS.find(x=>x.id===X),{id:L,served_at:null,verified_at:null,protocol_confirmed_at:null,kitchen_ack_at:null,status:'pending',created_at:hrs(0.01)}));
 await reconcile(); await w(300);
 for(const [stage,sub] of [['ack','Confirm the kitchen has received this allergy.'],['prep','Clear and separate the prep area, utensils and surfaces.'],['done','Next: Second Check.']]){
   if(stage==='ack')renderLockout(L,'ack'); await w(200);
   const r=lk(),t=r.innerText; T.push('');T.push('──── LOCKOUT '+stage.toUpperCase()+' ────');
   ok('REHEARSAL first',/^REHEARSAL · NOT A GUEST/.test(t.trim()));
   ok('one instruction line',r.querySelectorAll('.lockout-sub').length===1&&r.querySelector('.lockout-sub').textContent.trim()===sub,r.querySelector('.lockout-sub').textContent.trim());
   ok('guest notes shown verbatim',/Guest notes/i.test(t)&&/I get sick/.test(t));
   ok('Avoid all kept',!!/AVOID ALL — FISH/i.test(t));
   ok('provenance line, display not person',/records the display, not the person\./.test(t));
   ok('no prohibited claims',!BANNED.test(t));
   if(stage!=='done'){await hold(r.querySelector('.hold-btn'));echo(L)}
 }
 ok('board rows still carry the REHEARSAL badge',[...document.querySelectorAll('.row')].every(r=>r.querySelector('.r-reh')));
}catch(e){T.push('THREW '+e.message+'\n'+(e.stack||''))}
 T.push(''); T.push(fail===0?('ALL '+pass+' CHECKS PASS'):(pass+' pass, '+fail+' FAIL'));
 try{await fetch('/__results',{method:'POST',body:T.join('\n')})}catch(e){}
})();
