// Boot: a display starts in ITS stored language (venue_devices.display_locale), read once
// after the credential — no write. Run once per display (?devlocale=en / ?devlocale=es) in a
// fresh browser profile, which is two separate displays as far as the board is concerned.
const T=[];let pass=0,fail=0;
const ok=(n,c,x)=>{c?pass++:fail++;T.push((c?'PASS  ':'FAIL  ')+n+(x!==undefined&&x!==''?'   → '+x:''))};
const w=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{try{
 for(let i=0;i<80&&document.querySelectorAll('.row').length<3;i++)await w(100);
 await w(500);
 const want=(location.search.match(/devlocale=([A-Za-z-]+)/)||[])[1];
 T.push('      display stored default: '+want);
 ok('board started in this display\'s stored language',locale===want&&document.documentElement.lang===want);
 ok('board text matches',({es:/Requiere acción|En curso/i,'zh-CN':/需要处理|进行中/,en:/Needs You|In Progress/i})[want].test(document.getElementById('cardArea').innerText));
 ok('EN | ES control shows it',document.querySelector('#langSw .lang-b[data-l="'+want+'"]').getAttribute('aria-pressed')==='true');
 ok('reading the default wrote nothing (no locale save, no AllergyShield write)',window.__LOCALE_RPC.length===0&&window.__W__.length===0);
 const c=JSON.parse(localStorage.getItem('hc_k_locale')||'null');
 ok('cached for first paint on the next load',c&&c.l===want&&c.synced===true);
}catch(e){T.push('THREW '+e.message)}
 T.push(''); T.push(fail===0?('ALL '+pass+' CHECKS PASS'):(pass+' pass, '+fail+' FAIL'));
 try{await fetch('/__results',{method:'POST',body:T.join('\n')})}catch(e){}
})();
