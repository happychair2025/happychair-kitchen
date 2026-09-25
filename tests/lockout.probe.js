const T=[];let pass=0,fail=0;
const ok=(n,c,x)=>{c?pass++:fail++;T.push((c?'PASS  ':'FAIL  ')+n+(x!==undefined?'   → '+x:''))};
(async()=>{
 await new Promise(r=>setTimeout(r,800));
 const lc=document.getElementById('lockoutContent')||document.querySelector('.lockout');
 const t=(lc||document.body).innerText;
 ok('lockout modal rendered', !!lc && /Hold to Confirm/i.test(t));
 ok('XC shorthand gone from the lockout', !/\bXC\b/.test(t));
 ok('cross-contact spelled out in the lockout', /CROSS-CONTACT/.test(t));
 const hb=(lc||document).querySelector('.hold-btn');
 ok('lockout hold is a real button', !!hb && hb.tagName==='BUTTON', hb&&hb.tagName);
 ok('lockout hold has a progress fill', !!hb && !!hb.querySelector('.hold-fill'));
 ok('lockout hold wired to startHold', !!hb && /startHold/.test(hb.getAttribute('ontouchstart')||''));
 ok('no XC anywhere on the page', !/\bXC\b/.test(document.body.innerText));
 T.push(''); T.push(fail===0?('ALL '+pass+' CHECKS PASS'):(pass+' pass, '+fail+' FAIL'));
 try{await fetch('/__results',{method:'POST',body:T.join('\n')})}catch(e){}
})();
