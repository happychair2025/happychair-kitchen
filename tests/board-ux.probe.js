const T=[];let pass=0,fail=0;
const ok=(n,c,x)=>{c?pass++:fail++;T.push((c?'PASS  ':'FAIL  ')+n+(x!==undefined&&x!==''?'   → '+x:''))};
const info=s=>T.push('      '+s);
const all=s=>[...document.querySelectorAll(s)];
const R=e=>e.getBoundingClientRect();
const W=()=>document.querySelector('#cardArea').getBoundingClientRect();
(async()=>{
 await new Promise(r=>setTimeout(r,600));
 const widths=[1280,1024,860,720];
 for(const w of widths){
   document.getElementById('cardArea').style.width=w+'px';
   await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
   await new Promise(r=>setTimeout(r,120));
   T.push(''); T.push('──── board width '+w+'px ────');
   all('.row').forEach(row=>{
     const rr=R(row), lbl=row.querySelector('.r-tbl').textContent.trim();
     const g=row.querySelector('.r-guest'), al=row.querySelector('.r-al'),
           sev=row.querySelector('.r-sev'), xc=row.querySelector('.r-xc'), act=row.querySelector('.r-act');
     const inside=e=>!e||(R(e).left>=rr.left-0.5&&R(e).right<=rr.right+0.5);
     ok('allergens fully inside the card · '+w+' · '+lbl, inside(al),
        '"'+al.textContent.trim().slice(0,34)+'"');
     ok('severity fully inside the card · '+w+' · '+lbl, inside(sev));
     ok('cross-contact inside the card · '+w+' · '+lbl, inside(xc));
     ok('action fully inside the card · '+w+' · '+lbl, inside(act),
        act?Math.round(R(act).left)+'–'+Math.round(R(act).right)+' in '+Math.round(rr.left)+'–'+Math.round(rr.right):'n/a');
     ok('action keeps a real tap target · '+w+' · '+lbl, !act||R(act).height>=44);
     if(g) ok('long guest name truncates, never overflows · '+w+' · '+lbl,
        R(g).width<=151 && R(g).right<=rr.right+0.5,
        Math.round(R(g).width)+'px "'+g.textContent.trim()+'"');
   });
 }
 document.getElementById('cardArea').style.width='';
 T.push(''); T.push('──── copy ────');
 const body=document.body.innerText;
 ok('XC shorthand is gone', !/\bXC\b/.test(body));
 ok('cross-contact spelled out on the row', all('.r-xc').every(e=>e.textContent.trim()==='CROSS-CONTACT'),
    all('.r-xc')[0]?.textContent.trim());
 ok('duplicate marker reads as kitchen language',
    all('.r-multi').every(e=>/ALLERGY RECORDS · CHECK BOTH/.test(e.textContent)),
    all('.r-multi')[0]?.textContent.trim());
 ok('no system/database wording left', !/SUBMISSIONS/i.test(body));
 ok('no food-safety claim in visible copy', !/\bsafe\b/i.test(body), (body.match(/.{0,20}safe.{0,20}/i)||[''])[0]);
 // expanded detail
 const row=all('.row')[2]; row.click();
 await new Promise(r=>setTimeout(r,260));
 const exp=document.body.innerText;
 ok('expanded shows the FULL guest name', /Bartholomew Fitzwilliam-Harrington/.test(exp));
 ok('expanded explains cross-contact in words', /asked for cross-contact precautions/.test(exp));
 ok('expanded rail no longer claims "Safe"', !/>Safe</.test(document.getElementById('cardArea').innerHTML));
 T.push(''); T.push('──── hold ────');
 const hb=document.querySelector('.row .r-act.hold-btn');
 ok('row action carries a progress fill', !!hb && !!hb.querySelector('.hold-fill'));
 ok('hold buttons are real buttons (focusable, keyboard)', all('.hold-btn').every(e=>e.tagName==='BUTTON'),
    all('.hold-btn').map(e=>e.tagName).join(','));
 ok('no duplicate fill ids', all('[id^="fill-"]').length===0);
 ok('hold duration is 1.0–1.25s', typeof HOLD_MS==='number'&&HOLD_MS>=1000&&HOLD_MS<=1250, HOLD_MS+'ms');
 // press and measure the fill growing, then release before completion
 const fill=hb.querySelector('.hold-fill');
 hb.dispatchEvent(new MouseEvent('mousedown',{bubbles:true}));
 await new Promise(r=>setTimeout(r,60));
 const early=parseFloat(getComputedStyle(fill).width);
 ok('feedback begins immediately', early>0, Math.round(early)+'px within 60ms');
 ok('button shows a held state', hb.classList.contains('holding'));
 await new Promise(r=>setTimeout(r,300));
 const mid=parseFloat(getComputedStyle(fill).width);
 ok('fill progresses left-to-right while held', mid>early, Math.round(early)+'px → '+Math.round(mid)+'px');
 hb.dispatchEvent(new MouseEvent('mouseup',{bubbles:true}));
 await new Promise(r=>setTimeout(r,260));
 ok('releasing early resets the fill', parseFloat(getComputedStyle(fill).width)<2,
    Math.round(parseFloat(getComputedStyle(fill).width))+'px');
 ok('releasing early performs NO write', !(window.__WROTE__),'no ack fired');
 ok('held state cleared on release', !hb.classList.contains('holding'));
 T.push(''); T.push(fail===0?('ALL '+pass+' CHECKS PASS'):(pass+' pass, '+fail+' FAIL'));
 try{await fetch('/__results',{method:'POST',body:T.join('\n')})}catch(e){}
})();
