const T=[];let pass=0,fail=0;
const ok=(n,c,x)=>{c?pass++:fail++;T.push((c?'PASS  ':'FAIL  ')+n+(x!==undefined&&x!==''?'   → '+x:''))};
const info=s=>T.push('      '+s);
const txt=()=>document.body.innerText;
const all=s=>[...document.querySelectorAll(s)];
(async()=>{
 const t0=Date.now();
 while(Date.now()-t0<25000){if(document.querySelector('#heartbeat.ok'))break;await new Promise(r=>setTimeout(r,400))}
 await new Promise(r=>setTimeout(r,2500));
 const rows=all('.row');
 info('cache at load: '+(window.__SEEDED__||'?'));
 info('sections: '+(all('.sec-l').map(e=>e.textContent.replace(/\s+/g,' ').trim()).join('  |  ')||'(none)'));
 info('cache now holds: '+Object.keys(JSON.parse(localStorage.getItem('hc_k_cards_v2')||'{}')).join(', '));
 ok('ESC-TEST cache residue gone from the board', !/ESC-TEST/.test(txt()));
 ok('39-day-old stale card gone', !document.getElementById('timer-stale-esc'));
 ok('4-day-old stale card gone', !document.getElementById('timer-stale-4d'));
 ok('other-venue cache card gone', !/Elsewhere/.test(txt()));
 ok('stale rows pruned from the cache itself', !/stale-/.test(localStorage.getItem('hc_k_cards_v2')||''));
 ok('live rehearsal work IS on the board', /P4/.test(txt()));
 ok('both current declarations render', rows.length===2, rows.length+' rows');
 ok('NEEDS YOU leads the board', /Needs You/i.test((all('.sec-l')[0]||{}).textContent||''));
 ok('four unlabelled dots gone', all('.stages').length===0&&all('.stg').length===0);
 ok('one next action per row', all('.row .r-act').length===rows.length);
 ok('action is held, not tapped', all('.row .r-act').every(e=>/startHold/.test(e.getAttribute('ontouchstart')||'')));
 ok('multi-submission marker on both', all('.r-multi').length===2, all('.r-multi')[0]?.textContent);
 ok('no ordering/supersession implied', !/supersed|replaces|newer|current version/i.test(txt()));
 ok('no union — submissions stay separate',
    all('.r-al').map(e=>e.textContent.trim()).sort().join(' | ')==='Fish | Fish, Tree Nuts',
    all('.r-al').map(e=>e.textContent.trim()).join(' | '));
 ok('rehearsal distinction preserved', all('.r-reh').length===2);
 ok('venue logo from authoritative branding', !!document.querySelector('.hdr-logo-img'));
 ok('elapsed timer moved to expanded, still ticking target', all('.exp-elapsed').length===rows.length
    && all('.row .r-tm').length===0);
 ok('expanded provenance rail intact', /Received/.test(document.getElementById('cardArea').innerHTML));
 // geometry: nothing clipped, action on the same line as the allergens
 let clipped=0, wrapped=0;
 rows.forEach(r=>{const rr=r.getBoundingClientRect();
   const a=r.querySelector('.r-act'), al=r.querySelector('.r-al');
   if(a){const ar=a.getBoundingClientRect();
     if(ar.right>rr.right+0.5||ar.left<rr.left-0.5)clipped++;
     if(Math.abs(ar.top-al.getBoundingClientRect().top)>28)wrapped++;}});
 ok('action never clipped by the card', clipped===0, clipped+' clipped');
 ok('action sits on the row, not a second line', wrapped===0, wrapped+' wrapped');
 ok('allergens render on one line', all('.r-al').every(e=>e.getBoundingClientRect().height<40),
    all('.r-al').map(e=>Math.round(e.getBoundingClientRect().height)+'px').join(', '));
 T.push(''); T.push(fail===0?('ALL '+pass+' CHECKS PASS'):(pass+' pass, '+fail+' FAIL'));
 try{await fetch('/__results',{method:'POST',body:T.join('\n')})}catch(e){}
})();
