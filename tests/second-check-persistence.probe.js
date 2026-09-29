const T=[];let pass=0,fail=0;
const ok=(n,c,x)=>{c?pass++:fail++;T.push((c?'PASS  ':'FAIL  ')+n+(x!==undefined&&x!==''?'   → '+x:''))};
const info=s=>T.push('      '+s);
const w=ms=>new Promise(r=>setTimeout(r,ms));
const f=()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
const open_=()=>document.getElementById('verify').classList.contains('on');
const txt=()=>document.getElementById('verifyContent').innerText;
const W=()=>window.__W__||[];
const TARGET='7784ff89', SIB='56a859b5';
(async()=>{
 await w(1400);
 T.push('════ Second Check review must persist ════');
 const btn=[...document.querySelectorAll('.row')].find(r=>r.innerHTML.includes(TARGET))?.querySelector('.r-act')
        || document.querySelectorAll('.row .r-act')[0];
 btn.click(); await f(); await w(150);
 ok('1 · opens', open_());
 ok('1 · opening wrote nothing', W().length===0, W().length+' writes');
 info('open for declaration: '+verifyOpenId);

 for(let i=0;i<6;i++){ await reconcile(); await f(); await w(40) }
 ok('2 · survives 6 reconcile cycles', open_());
 await w(6000);           // at least one real 5s interval tick
 ok('2 · survives the real 5s polling interval', open_());
 await vdExchange(); await f(); await w(100);
 ok('3 · survives a paired-token refresh', open_());

 // another card changes underneath
 cards[SIB].kitchen_ack_by='Changed Elsewhere'; cards[SIB].protocol_confirmed_at=new Date().toISOString();
 renderCards(); await f(); await w(100);
 ok('4 · survives an unrelated card update', open_());
 ok('4 · board kept refreshing behind it', /Changed Elsewhere/.test(JSON.stringify(cards[SIB])));
 ok('4 · review still shows ITS declaration', /Fish, Tree Nuts|Fish/.test(txt()), txt().split('\n')[2]||'');

 // early-release hold
 const go=document.querySelector('.vfy-go');
 go.dispatchEvent(new MouseEvent('mousedown',{bubbles:true})); await w(300);
 ok('5 · a rebuild is suppressed mid-hold', verifyHolding===true);
 await reconcile(); await f(); await w(60);
 ok('5 · review survives a poll DURING the hold', open_());
 go.dispatchEvent(new MouseEvent('mouseup',{bubbles:true})); await w(250);
 ok('6 · early release: still open', open_());
 ok('6 · early release: zero writes', W().length===0, W().length+' writes');

 // close / back
 document.querySelector('.vfy-x').click(); await f(); await w(120);
 ok('7 · Close returns to the board', !open_() && verifyOpenId===null);
 ok('7 · Close wrote nothing', W().length===0);

 // complete the hold
 document.querySelectorAll('.row .r-act')[0].click(); await f(); await w(150);
 const id=verifyOpenId;
 const go2=document.querySelector('.vfy-go');
 go2.dispatchEvent(new MouseEvent('mousedown',{bubbles:true}));
 await w(1400);
 go2.dispatchEvent(new MouseEvent('mouseup',{bubbles:true}));
 await w(400);
 ok('8 · completing the hold records EXACTLY one write', W().length===1, JSON.stringify(W()));
 ok('8 · it wrote only verified_at/verified_by',
    Object.keys(W()[0]||{}).sort().join(',')==='verified_at,verified_by', Object.keys(W()[0]||{}).join(','));
 ok('8 · for the intended declaration', cards[id] && !!cards[id].verified_at, 'target '+id);
 const sib = id===TARGET?SIB:TARGET;
 ok('9 · the sibling record is untouched',
    !cards[sib].verified_at && !cards[sib].served_at && !cards[sib].closed_at && !cards[sib].superseded_at);
 ok('9 · nothing served/closed/superseded/minimized anywhere',
    Object.keys(cards).every(k=>!cards[k].served_at&&!cards[k].closed_at&&!cards[k].superseded_at&&!cards[k].minimized_at));
 T.push(''); T.push(fail===0?('ALL '+pass+' CHECKS PASS'):(pass+' pass, '+fail+' FAIL'));
 try{await fetch('/__results',{method:'POST',body:T.join('\n')})}catch(e){}
})();
