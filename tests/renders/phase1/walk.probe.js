// Walks one fixture record through every Kitchen state, capturing the rendered text and a
// screenshot of each. Works against old and new builds (generic selectors only).
const OUTT={};const w=ms=>new Promise(r=>setTimeout(r,ms));
const hrs=h=>new Date(Date.now()-h*3600e3).toISOString();
const shot=n=>fetch('/__shot?n='+n);
const sh=()=>document.getElementById('verifyContent'), lk=()=>document.getElementById('lockoutContent');
async function hold(b){b.dispatchEvent(new MouseEvent('mousedown',{bubbles:true}));await w(1400);b.dispatchEvent(new MouseEvent('mouseup',{bubbles:true}));await w(400)}
function echo(id){const r=window.__ROWS.find(x=>x.id===id),c=cards[id];['kitchen_ack_at','kitchen_ack_by','protocol_confirmed_at','protocol_confirmed_by','verified_at','verified_by','served_at','status'].forEach(k=>{if(c[k]!==undefined)r[k]=c[k]})}
async function cap(name,el){await w(300);OUTT[name]=el.innerText;await shot(name)}
(async()=>{try{
 for(let i=0;i<80&&document.querySelectorAll('.row').length<3;i++)await w(100);
 if(window.__realLoadVenue)await window.__realLoadVenue();
 document.getElementById('audioPrompt').click(); await w(200);   // a real cook taps this first
 const W='walk0000-e';
 window.__ROWS.push({id:W,asset_id:'a1',table_label:'P4',zone_name:'Terrace',guest_name:'Tom',allergens:['Fish','Tree Nuts'],
   severity:'anaphylaxis',cross_contact:true,notes:'I get sick',status:'pending',created_at:hrs(0.3),kitchen_ack_at:null,kitchen_ack_by:null,
   protocol_confirmed_at:null,protocol_confirmed_by:null,verified_at:null,verified_by:null,served_at:null,closed_at:null,superseded_at:null,
   supersedes_id:null,minimized_at:null,service_instance_id:'s1',service_kind:'rehearsal',is_open:true});
 await reconcile(); await w(300); await cap('00-board',document.body);
 openRecord(W); await w(300); await cap('01-received',sh());
 await hold(sh().querySelector('.vfy-go')); echo(W); await cap('02-received-done-prep',sh());
 await hold(sh().querySelector('.vfy-go')); echo(W); await cap('03-prep-done-second-check',sh());
 await hold(sh().querySelector('.vfy-go')); echo(W); await cap('04-second-check-recorded',sh());
 await hold(sh().querySelector('.vfy-go')); echo(W); await cap('05-served-recorded',sh());
 closeRecord(); await w(200);
 const L='walk0001-l';
 window.__ROWS.push(Object.assign({},window.__ROWS.find(x=>x.id===W),{id:L,served_at:null,verified_at:null,protocol_confirmed_at:null,kitchen_ack_at:null,status:'pending',created_at:hrs(0.01)}));
 await reconcile(); await w(300);
 showLockout(L); await cap('06-lockout-received',lk());
 await hold(lk().querySelector('.hold-btn')); echo(L); await cap('07-lockout-prep',lk());
 const pb=lk().querySelector('.hold-btn'); if(pb&&pb.tagName==='BUTTON'){await hold(pb)}else if(pb){pb.click();await w(400)}
 await cap('08-lockout-done',lk());
}catch(e){OUTT.__error=e.message+'\n'+e.stack}
 fetch('/__results',{method:'POST',body:JSON.stringify(OUTT)});
})();
