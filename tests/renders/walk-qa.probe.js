// Visual QA walk, one language per run (?qalocale=en|es|zh-CN). Captures every Kitchen state —
// board (with a long allergen combination), each Record Sheet step and completion, each lockout
// stage, a long-allergen sheet and lockout, a write error, offline, and pairing.
const OUTT={};const w=ms=>new Promise(r=>setTimeout(r,ms));
const hrs=h=>new Date(Date.now()-h*3600e3).toISOString();
const shot=n=>fetch('/__shot?n='+n);
const LOC=(location.search.match(/qalocale=([A-Za-z-]+)/)||[])[1]||'en';
const sh=()=>document.getElementById('verifyContent'), lk=()=>document.getElementById('lockoutContent');
async function hold(b){b.dispatchEvent(new MouseEvent('mousedown',{bubbles:true}));await w(1400);b.dispatchEvent(new MouseEvent('mouseup',{bubbles:true}));await w(400)}
function echo(id){const r=window.__ROWS.find(x=>x.id===id),c=cards[id];['kitchen_ack_at','kitchen_ack_by','protocol_confirmed_at','protocol_confirmed_by','verified_at','verified_by','served_at','status'].forEach(k=>{if(c[k]!==undefined)r[k]=c[k]})}
async function cap(name,el){await w(300);OUTT[name]=(el||document.body).innerText;await shot(name)}
const row=(id,o)=>Object.assign({id:id,asset_id:'a1',table_label:'P4',zone_name:'Terrace',guest_name:'Tom',allergens:['Fish','Tree Nuts'],
  severity:'anaphylaxis',cross_contact:true,notes:'I get sick',status:'pending',created_at:hrs(.3),kitchen_ack_at:null,kitchen_ack_by:null,
  protocol_confirmed_at:null,protocol_confirmed_by:null,verified_at:null,verified_by:null,served_at:null,closed_at:null,superseded_at:null,
  supersedes_id:null,minimized_at:null,service_instance_id:'s1',service_kind:'rehearsal',is_open:true},o);
(async()=>{try{
 for(let i=0;i<80&&document.querySelectorAll('.row').length<3;i++)await w(100);
 if(window.__realLoadVenue)await window.__realLoadVenue();
 document.getElementById('audioPrompt').click(); await w(200);
 if(LOC!=='en')switchLocale(LOC); await w(300);
 const W='qa0000-w',G='qa0001-long',L='qa0002-l';
 const LONG=['Milk','Eggs','Fish','Shellfish','Tree Nuts','Peanuts','Wheat','Soy','Sesame'];
 window.__ROWS.push(row(W),row(G,{table_label:'T12',zone_name:'Main Dining',guest_name:'Bartholomew Fitzwilliam-Harrington',allergens:LONG,
   notes:'Severe reaction to all of these — please use separate pans and fresh gloves, and check sauces and dressings.'}));
 await reconcile(); await w(300); await cap('00-board');
 openRecord(W); await w(300); await cap('01-received',sh());
 await hold(sh().querySelector('.vfy-go')); echo(W); await cap('02-received-done-prep',sh());
 await hold(sh().querySelector('.vfy-go')); echo(W); await cap('03-prep-done-second-check',sh());
 await hold(sh().querySelector('.vfy-go')); echo(W); await cap('04-second-check-recorded',sh());
 await hold(sh().querySelector('.vfy-go')); echo(W); await cap('05-served-recorded',sh());
 closeRecord(); await w(200);
 window.__ROWS.push(row(L,{created_at:hrs(.01)})); await reconcile(); await w(300);
 showLockout(L); await cap('06-lockout-received',lk());
 await hold(lk().querySelector('.hold-btn')); echo(L); await cap('07-lockout-prep',lk());
 await hold(lk().querySelector('.hold-btn')); echo(L); await cap('08-lockout-done',lk());
 closeLockout(); await w(150);
 openRecord(G); await w(300); await cap('09-long-allergens-sheet',sh()); closeRecord(); await w(150);
 showLockout(G); await w(250); await cap('10-long-allergens-lockout',lk()); closeLockout(); await w(150);
 const realFrom=sbv.from;
 sbv.from=function(){return {update:function(v){return {eq:function(){return Promise.resolve({error:{message:'refused'}})}}}}};
 openRecord(G); await w(250); await hold(sh().querySelector('.vfy-go')); await cap('11-error',sh());
 sbv.from=realFrom; closeRecord(); await w(150);
 setOnline(false); await cap('12-offline'); setOnline(true);
 openPair(); await w(200); document.getElementById('pairCode').value='12'; submitPair(); await w(300); await cap('13-pairing');
 closePair();
}catch(e){OUTT.__error=e.message+'\n'+e.stack}
 fetch('/__results',{method:'POST',body:JSON.stringify(OUTT)});
})();
