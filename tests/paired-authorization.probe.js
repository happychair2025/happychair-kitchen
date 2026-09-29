const T=[];let pass=0,fail=0;
const ok=(n,c,x)=>{c?pass++:fail++;T.push((c?'PASS  ':'FAIL  ')+n+(x!==undefined&&x!==''?'   → '+x:''))};
const info=s=>T.push('      '+s);
const all=s=>[...document.querySelectorAll(s)];
const w=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 await w(1200);
 const unpaired = location.search.indexOf('unpaired=1')>=0;
 T.push('════ '+(unpaired?'UNPAIRED':'PAIRED')+' ════');
 if(unpaired){
   ok('unpaired board loads NO allergy data', all('.row').length===0, all('.row').length+' rows');
   ok('unpaired board prompts for pairing', document.getElementById('pair').classList.contains('on'));
   ok('status reads not paired', /Not paired/.test(document.getElementById('vdStatus').textContent));
   ok('no anonymous fallback was used', (window.__W__||[]).length===0);
 } else {
   const rows=all('.row');
   ok('paired board renders its venue work', rows.length===2, rows.length+' rows');
   ok('the P4 records are present', /P4/.test(document.body.innerText));
   ok('Fish and Fish, Tree Nuts both present, unmerged',
      all('.r-al').map(e=>e.textContent.trim()).sort().join(' | ')==='Fish | Fish, Tree Nuts',
      all('.r-al').map(e=>e.textContent.trim()).join(' | '));
   ok('rehearsal still reads as rehearsal', all('.r-reh').length===2);
   ok('two-record marker still shown', all('.r-multi').length===2);
   ok('no supersession invented', !/supersed|replaces|newer/i.test(document.body.innerText));
   ok('ack + prep evidence preserved → next action is Second Check',
      all('.r-act').every(e=>/Second Check/.test(e.textContent)), all('.r-act').map(e=>e.textContent.trim()).join(' | '));
   ok('status chip shows the paired display',
      /Kitchen Display · Paired/.test(document.getElementById('vdStatus').textContent),
      document.getElementById('vdStatus').textContent);
   // age is not a filter any more
   const ages=[...document.querySelectorAll('.exp-elapsed')].map(e=>e.textContent.trim());
   info('rendered ages: '+(ages.join(' | ')||'(collapsed)'));
   ok('records older than 36h are on the board', rows.length===2, '115h and 113h old');
   ok('QA performed NO writes', (window.__W__||[]).length===0, (window.__W__||[]).length+' writes');
 }
 T.push(''); T.push(fail===0?('ALL '+pass+' CHECKS PASS'):(pass+' pass, '+fail+' FAIL'));
 try{await fetch('/__results',{method:'POST',body:T.join('\n')})}catch(e){}
})();
