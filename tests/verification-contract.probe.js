const T=[];let pass=0,fail=0;
const ok=(n,c,x)=>{c?pass++:fail++;T.push((c?'PASS  ':'FAIL  ')+n+(x!==undefined&&x!==''?'   → '+x:''))};
const info=s=>T.push('      '+s);
const all=s=>[...document.querySelectorAll(s)];
const f=()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
const w=ms=>new Promise(r=>setTimeout(r,ms));
const rows=()=>all('.row');
const writes=()=>window.__WRITES__||[];
const onBoard=id=>!!document.getElementById('ex-'+id);
(async()=>{
 await w(500);
 const mode=(location.search.match(/writemode=([a-z]+)/)||[])[1]||'ok';
 T.push('════ write mode: '+mode+' ════');
 ok('two cards on the board', rows().length===2, rows().length+' rows');

 T.push(''); T.push('──── BLOCK A · Second Check is navigation, not a write ────');
 const nav=rows()[0].querySelector('.r-act');
 ok('the row action is a navigation control', !!nav && nav.className.includes('r-act--nav'), nav&&nav.className);
 ok('it is NOT styled as a press-and-hold', !!nav && !nav.className.includes('hold-btn'));
 ok('it carries no hold handlers', !!nav && !nav.getAttribute('ontouchstart'));
 ok('it reads as navigation', /Second Check/.test(nav.textContent) && /→|&rarr;/.test(nav.innerHTML));
 const before=writes().length;
 nav.click(); await f(); await w(250);
 ok('OPENING THE CHECK WROTE NOTHING', writes().length===before, writes().length-before+' writes');
 ok('the review screen opened', document.getElementById('verify').classList.contains('on'));

 T.push(''); T.push('──── the review shows what is being checked ────');
 const v=document.getElementById('verifyContent').innerText;
 ok('service point', /P4/.test(v));
 ok('guest name', /TOM/i.test(v));
 ok('allergens', /Fish/.test(v));
 ok('stated severity', /ANAPHYLAXIS/i.test(v));
 ok('cross-contact requirement', /CROSS-CONTACT REQUIRED/i.test(v) && /asked for cross-contact precautions/i.test(v));
 ok('what is already recorded — kitchen receipt', /Kitchen received/i.test(v));
 ok('what is already recorded — prep', /Prep area confirmed/i.test(v));
 ok('what the check is for', /Another team member should check the allergy preparation/i.test(v));

 T.push(''); T.push('──── BLOCK C · no unsubstantiated independence claim ────');
 const page=document.body.innerText;
 for (const claim of [/independently verified/i, /verified by another employee/i,
                      /second employee confirmed/i, /confirmed by a different/i]) {
   ok('never claims: '+claim.source, !claim.test(page));
 }
 ok('states plainly that identity is not proven',
    /does not prove who carried it out/i.test(v), 'honesty line present');

 T.push(''); T.push('──── BLOCK B · the write needs a deliberate hold ────');
 const go = document.querySelector('.vfy-go');
 ok('the recording control is a press-and-hold', !!go && /startHold/.test(go.getAttribute('ontouchstart')||''));
 ok('it carries a progress fill', !!go.querySelector('.hold-fill'));
 const b2 = writes().length;
 go.dispatchEvent(new MouseEvent('mousedown',{bubbles:true}));
 await w(70);
 const early = parseFloat(getComputedStyle(go.querySelector('.hold-fill')).width);
 ok('progress starts immediately', early>0, Math.round(early)+'px @70ms');
 go.dispatchEvent(new MouseEvent('mouseup',{bubbles:true}));
 await w(250);
 ok('RELEASING EARLY WRITES NOTHING', writes().length===b2, (writes().length-b2)+' writes');
 ok('early release resets the fill', parseFloat(getComputedStyle(go.querySelector('.hold-fill')).width)<2);

 // A completed hold MUST record — a gesture that cannot be finished is not a safeguard.
 if (mode==='ok') {
   const b3 = writes().length;
   go.dispatchEvent(new MouseEvent('mousedown',{bubbles:true}));
   await w(1350);
   ok('COMPLETING THE HOLD RECORDS THE SECOND CHECK', writes().length===b3+1,
      (writes().length-b3)+' write: '+JSON.stringify(writes()[writes().length-1]||{}));
   ok('it writes verified_at and verified_by only',
      Object.keys(writes()[writes().length-1]||{}).sort().join(',')==='verified_at,verified_by',
      Object.keys(writes()[writes().length-1]||{}).join(','));
   go.dispatchEvent(new MouseEvent('mouseup',{bubbles:true}));
   await w(300);
   ok('recording closes the review', !document.getElementById('verify').classList.contains('on'));
   ok('the card stays on the board after recording', onBoard('v1')&&onBoard('v2'), rows().length+' rows');
   ok('next action becomes Mark Served', /Mark Served/.test(document.body.innerText));
 }

 T.push(''); T.push('──── BLOCK D · a no-write click can never remove a card ────');
 document.querySelector('.vfy-x').click(); await f(); await w(150);
 ok('closing the review keeps both cards', rows().length===2 && onBoard('v1') && onBoard('v2'));
 // Baseline taken HERE: the completion hold above legitimately wrote once in 'ok' mode, so
 // comparing navigation against a pre-completion count would measure that write instead.
 const navBase = writes().length;
 // the exact reported gesture, repeated
 for (let i=0;i<3;i++){ rows()[0].querySelector('.r-act').click(); await f(); await w(120);
                        document.querySelector('.vfy-x').click(); await f(); await w(120) }
 ok('repeated open/close never removes a card', rows().length===2, rows().length+' rows');
 ok('repeated navigation still writes nothing', writes().length===navBase,
    (writes().length-navBase)+' writes from '+3+' open/close cycles');
 // the _writing latch: a card blocked by an earlier hung write
 cards['v1']._writing=true; renderCards(); await f(); await w(120);
 ok('a card with _writing latched stays on the board', onBoard('v1'), 'v1 present');
 await verifyDish('v1');
 await f(); await w(150);
 ok('verifyDish on a latched card is a no-op that removes nothing', onBoard('v1') && rows().length===2);
 delete cards['v1']._writing;
 // a failed write must revert and keep the card
 if (mode==='err') {
   await verifyDish('v2'); await f(); await w(250);
   ok('a FAILED verify keeps the card on the board', onBoard('v2'), 'v2 present');
   ok('a failed verify reverts verified_at', !cards['v2'].verified_at);
   ok('a failed verify surfaces an error', !!cards['v2']._error || /try again/i.test(document.body.innerText));
 }
 if (mode==='hang') {
   verifyDish('v2'); await f(); await w(400);
   ok('a HUNG verify keeps the card on the board', onBoard('v2'), 'v2 present');
   ok('the hung card shows optimistic state, not absence', rows().length===2);
 }
 T.push(''); T.push(fail===0?('ALL '+pass+' CHECKS PASS'):(pass+' pass, '+fail+' FAIL'));
 try{await fetch('/__results',{method:'POST',body:T.join('\n')})}catch(e){}
})();
