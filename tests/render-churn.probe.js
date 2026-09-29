const T=[];let pass=0,fail=0;
const ok=(n,c,x)=>{c?pass++:fail++;T.push((c?'PASS  ':'FAIL  ')+n+(x!==undefined&&x!==''?'   → '+x:''))};
const info=s=>T.push('      '+s);
const w=ms=>new Promise(r=>setTimeout(r,ms));
const open_=()=>document.getElementById('verify').classList.contains('on');
const sc=()=>[...document.querySelectorAll('.row .r-act')].find(b=>/Second Check/.test(b.textContent));
const W=()=>window.__W__||[];
(async()=>{
 await w(1600);
 T.push('════ A · DOM CHURN (the hover stutter) ════');
 info('rows '+document.querySelectorAll('.row').length+' · bands '+
      [...document.querySelectorAll('.sec-l')].map(e=>e.textContent.trim().replace(/\s+/g,' ')).join(' / '));
 let node=sc(), rowNode=document.querySelector('.row'), replaced=0, rowRepl=0;
 for(let i=0;i<5;i++){ await reconcile(); await w(60);
   if(sc()!==node)replaced++; if(document.querySelector('.row')!==rowNode)rowRepl++;
   node=sc(); rowNode=document.querySelector('.row') }
 ok('A1 · Second Check node survives 5 polls untouched', replaced===0, replaced+' replacements');
 ok('A2 · card rows survive 5 polls untouched', rowRepl===0, rowRepl+' replacements');
 // Reconciliation must not go too far: a card whose data DID change must still update.
 const wrap=()=>document.querySelector('[data-k="card:7784ff89-bbbb"]');
 const beforeNode=wrap(), beforeTxt=wrap().innerText;
 cards['7784ff89-bbbb'].verified_at=new Date().toISOString();
 renderCards(); await w(100);
 ok('A3 · a card WITH changed data updates in place',
    wrap() === beforeNode && wrap().innerText !== beforeTxt,
    'node kept: '+(wrap()===beforeNode)+', content changed: '+(wrap().innerText!==beforeTxt));
 ok('A3b · its next action advanced to Mark Served',
    /Mark Served/.test(wrap().innerText), (wrap().querySelector('.r-act')||{}).textContent);
 cards['7784ff89-bbbb'].verified_at=null; renderCards(); await w(100);
 ok('A3c · and reverts when the data reverts', /Second Check/.test(wrap().innerText));

 T.push(''); T.push('════ B · SECOND CHECK LIFECYCLE ════');
 window.__LOG__.length=0;
 const b=sc(); info('clicking: "'+b.textContent.trim()+'"');
 b.dispatchEvent(new PointerEvent('pointerenter',{bubbles:true}));
 b.click(); await w(350);
 ok('B1 · one click opens the review', open_());
 ok('B2 · opening wrote nothing', W().length===0, W().length+'');
 const flashes=window.__LOG__.filter(e=>e.ev.indexOf('#verify.class')===0).length;
 ok('B3 · no open/close/open flash', flashes<=1, flashes+' class transitions');
 await w(11000);
 ok('B4 · open across two real 5s polling cycles', open_());
 await vdExchange(); await w(120);
 ok('B5 · open across a token refresh', open_());
 ok('B6 · nothing called closeVerify', window.__LOG__.filter(e=>e.ev==='closeVerify').length===0);
 info('renderCards during the open window: '+window.__LOG__.filter(e=>e.ev==='renderCards'&&e.d==='enter').length);
 // background polling continues
 ok('B7 · board kept polling behind the review',
    window.__LOG__.filter(e=>e.ev==='net.rpc').length>=2,
    window.__LOG__.filter(e=>e.ev==='net.rpc').length+' board reads');

 T.push(''); T.push('════ C · THE HOLD ════');
 const go=document.querySelector('.vfy-go');
 go.dispatchEvent(new MouseEvent('mousedown',{bubbles:true})); await w(300);
 await reconcile(); await w(60);
 ok('C1 · review survives a poll mid-hold', open_());
 go.dispatchEvent(new MouseEvent('mouseup',{bubbles:true})); await w(250);
 ok('C2 · early release keeps it open', open_());
 ok('C3 · early release wrote nothing', W().length===0, W().length+'');
 document.querySelector('.vfy-x').click(); await w(120);
 ok('C4 · Close returns to the board', !open_() && verifyOpenId===null);
 ok('C5 · Close wrote nothing', W().length===0);
 // complete it
 sc().click(); await w(200);
 const id=verifyOpenId;
 const go2=document.querySelector('.vfy-go');
 go2.dispatchEvent(new MouseEvent('mousedown',{bubbles:true})); await w(1400);
 go2.dispatchEvent(new MouseEvent('mouseup',{bubbles:true})); await w(400);
 ok('C6 · completed hold writes exactly once', W().length===1, JSON.stringify(W()));
 ok('C7 · only verified_at/verified_by', Object.keys(W()[0]||{}).sort().join(',')==='verified_at,verified_by');
 const sib=Object.keys(cards).find(k=>k!==id);
 ok('C8 · sibling untouched', !cards[sib].verified_at && !cards[sib].served_at);
 ok('C9 · nothing served/closed/superseded/minimized',
    Object.keys(cards).every(k=>!cards[k].served_at&&!cards[k].closed_at&&!cards[k].superseded_at&&!cards[k].minimized_at));
 T.push(''); T.push(fail===0?('ALL '+pass+' CHECKS PASS'):(pass+' pass, '+fail+' FAIL'));
 try{await fetch('/__results',{method:'POST',body:T.join('\n')})}catch(e){}
})();
