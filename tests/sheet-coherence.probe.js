// Post-serve coherence: the ordinary record, Second Check Recorded and Served Recorded are one
// component advancing. Offline fixture; fixture B is driven through Second Check → Served, C is
// the ordinary-record reference and is never acted on.
setTimeout(()=>{T.push('WATCHDOG');fetch('/__results',{method:'POST',body:T.join('\n')})},120000);
const T=[];let pass=0,fail=0;
const ok=(n,c,x)=>{c?pass++:fail++;T.push((c?'PASS  ':'FAIL  ')+n+(x!==undefined&&x!==''?'   → '+x:''))};
const w=ms=>new Promise(r=>setTimeout(r,ms));
const B='56a859b5-aaaa',C='7784ff89-bbbb';
const sh=()=>document.getElementById('verifyContent'), shOn=()=>document.getElementById('verify').classList.contains('on');
const BLOCKS=['.vfy-reh','.vfy-t','.vfy-tbl','.vfy-guest','.vfy-al','.vfy-marks','.vfy-note','.vfy-el','.prog'];
function layout(){const tops=BLOCKS.map(q=>{const e=sh().querySelector(q);return e?e.getBoundingClientRect():null});
  return {present:tops.map(Boolean),order:tops.every((r,i)=>!r||i===0||!tops[i-1]||r.top>=tops[i-1].bottom-1),
    gaps:tops.slice(1).map((r,i)=>r&&tops[i]?Math.round(r.top-tops[i].bottom):null),
    height:Math.round(sh().getBoundingClientRect().height)}}
function rail(){return [...sh().querySelectorAll('.prog .ps')].map(p=>({l:p.querySelector('.plbl').textContent,
  ok:p.querySelector('.pd').classList.contains('dv')&&p.querySelector('.plbl').classList.contains('v')&&!!p.querySelector('.pd svg'),
  grey:/\b(dg|da)\b/.test(p.querySelector('.pd').className)||/\b[ga]\b/.test(p.querySelector('.plbl').className.replace('plbl','')),
  ts:(p.querySelector('.ptm')||{}).textContent||''}))}
async function hold(b,ms){b.dispatchEvent(new MouseEvent('mousedown',{bubbles:true}));await w(ms);b.dispatchEvent(new MouseEvent('mouseup',{bubbles:true}));await w(300)}
(async()=>{try{
 for(let i=0;i<80&&document.querySelectorAll('.row').length<3;i++)await w(100);
 await window.__realLoadVenue(); await w(100);
 openRecord(C); await w(200); const L0=layout(), R0=rail(); closeRecord();
 openRecord(B); await w(200); await hold(sh().querySelector('.vfy-go'),1400);
 const L1=layout(), R1=rail(), t1=sh().innerText;
 await hold(sh().querySelector('.vfy-go'),1400);
 const L2=layout(), R2=rail(), t2=sh().innerText;
 T.push('      ordinary C        gaps '+JSON.stringify(L0.gaps)+'  h='+L0.height);
 T.push('      Second Check Rec. gaps '+JSON.stringify(L1.gaps)+'  h='+L1.height);
 T.push('      Served Recorded   gaps '+JSON.stringify(L2.gaps)+'  h='+L2.height);

 T.push('──── 1 · COMPLETED RAIL READS COMPLETED ────');
 ok('Served Recorded: all four stages complete',R2.length===4&&R2.every(s=>s.ok),R2.map(s=>s.l+(s.ok?'✓':'✗')).join(' '));
 ok('...none grey/disabled',R2.every(s=>!s.grey));
 ok('...every stage keeps its timestamp',R2.every(s=>/\d/.test(s.ts)),R2.map(s=>s.ts).join(' | '));
 ok('...connectors between completed stages use the success class',[...sh().querySelectorAll('.prog .pln')].every(l=>l.classList.contains('v')));
 ok('Second Check Recorded: three complete, Served pending (not green)',R1.slice(0,3).every(s=>s.ok)&&!R1[3].ok&&!R1[3].grey&&R1[3].ts==='');
 ok('ordinary record: completed stages green, owed ones neutral',R0[0].ok&&R0[1].ok&&!R0[2].ok&&!R0[3].ok&&R0.every(s=>!s.grey));
 ok('no new colour: completed = existing --ok',getComputedStyle(sh().querySelector('.prog .pd.dv')).backgroundColor==='rgb(16, 185, 129)');

 T.push(''); T.push('──── 1 · SERVED STATE KEEPS EVERYTHING ────');
 ok('✓ Served Recorded',sh().querySelector('.vfy-t').textContent.trim()==='Served Recorded'&&!!sh().querySelector('.vfy-t svg'));
 ok('REHEARSAL · NOT A GUEST',/REHEARSAL · NOT A GUEST/.test(t2));
 ok('Kitchen Steps Complete',/Kitchen Steps Complete/i.test(t2));
 ok('display-not-person disclosure',/a display authenticated to Happy Bistro\. It does not identify the person who marked this served\./.test(t2));
 ok('Back to Kitchen Board, no auto-close',/Back to Kitchen Board/.test(t2)&&shOn());
 await w(5600); ok('still open after a real poll',shOn()&&/Served Recorded/.test(sh().innerText));

 T.push(''); T.push('──── 2 · ONE COMPONENT, THREE STATES ────');
 ok('same blocks present in all three',JSON.stringify(L0.present)===JSON.stringify(L1.present)&&JSON.stringify(L1.present)===JSON.stringify(L2.present),JSON.stringify(L2.present));
 ok('same top-to-bottom order in all three',L0.order&&L1.order&&L2.order);
 ok('identical vertical gaps between shared blocks',JSON.stringify(L0.gaps)===JSON.stringify(L1.gaps)&&JSON.stringify(L1.gaps)===JSON.stringify(L2.gaps));
 ok('badges (severity + cross-contact) present after Served',/ANAPHYLAXIS/.test(t2)&&/CROSS-CONTACT REQUIRED/.test(t2));
 ok('context line: Served at <time>',/Served at \d/.test(t2));
 ok('context line before Served: the owed step',/Mark Served waiting /.test(t1));
}catch(e){T.push('THREW '+e.message+'\n'+(e.stack||''))}
 T.push(''); T.push(fail===0?('ALL '+pass+' CHECKS PASS'):(pass+' pass, '+fail+' FAIL'));
 try{await fetch('/__results',{method:'POST',body:T.join('\n')})}catch(e){}
})();
