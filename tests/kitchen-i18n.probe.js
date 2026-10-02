// Kitchen localization (EN | ES) — acceptance. Offline fixture; Supabase blackholed by the
// harness. B and C (the Tom stand-ins) are only ever OPENED here, never acted on.
setTimeout(()=>{T.push('WATCHDOG');fetch('/__results',{method:'POST',body:T.join('\n')})},170000);
const T=[];let pass=0,fail=0;
const ok=(n,c,x)=>{c?pass++:fail++;T.push((c?'PASS  ':'FAIL  ')+n+(x!==undefined&&x!==''?'   → '+x:''))};
const H=s=>{T.push('');T.push('──── '+s+' ────')};
const w=ms=>new Promise(r=>setTimeout(r,ms)), hrsAgo=h=>new Date(Date.now()-h*3600e3).toISOString();
const A='ba65384b-cccc',B='56a859b5-aaaa',C='7784ff89-bbbb',X='i18n0000-x',Y='i18n0001-y';
const W=()=>window.__W__, sh=()=>document.getElementById('verifyContent'), shOn=()=>document.getElementById('verify').classList.contains('on');
const lk=()=>document.getElementById('lockoutContent'), lkOn=()=>document.getElementById('lockout').classList.contains('on');
const board=()=>document.getElementById('cardArea').innerText, all=()=>document.body.innerText;
const langBtn=l=>document.querySelector('#langSw .lang-b[data-l="'+l+'"]');
function tap(l){const b=langBtn(l);const pd=new PointerEvent('pointerdown',{bubbles:true,cancelable:true});b.dispatchEvent(pd);b.click();return pd.defaultPrevented}
const snap=()=>JSON.stringify(Object.keys(cards).sort().map(id=>{const c=cards[id];return [id,c.kitchen_ack_at,c.protocol_confirmed_at,c.verified_at,c.served_at,c.status,c.service_kind,c.superseded_at,c.closed_at]}));
const ids=()=>[...document.querySelectorAll('[data-k^="card:"]')].map(n=>n.dataset.k).join(',');
const CLAIM=/segur|libre de|sin al[eé]rgenos|garantiz|certificad|protegid|verificad|apto para/i;
function row0(id,o){return Object.assign({id:id,asset_id:'a3',table_label:'T7',zone_name:'Main',guest_name:'Ana',allergens:['Sesame'],
  severity:'anaphylaxis',cross_contact:false,notes:null,status:'pending',created_at:hrsAgo(.2),kitchen_ack_at:null,kitchen_ack_by:null,
  protocol_confirmed_at:null,protocol_confirmed_by:null,verified_at:null,verified_by:null,served_at:null,closed_at:null,superseded_at:null,
  supersedes_id:null,minimized_at:null,service_instance_id:'s1',service_kind:'rehearsal',is_open:true},o)}
function echo(id){const r=window.__ROWS.find(x=>x.id===id),c=cards[id];['kitchen_ack_at','kitchen_ack_by','protocol_confirmed_at','protocol_confirmed_by','verified_at','verified_by','served_at','status'].forEach(k=>{if(c[k]!==undefined)r[k]=c[k]});
  const raw=Object.assign({},r);['service_kind','table_label','zone_name','is_open'].forEach(k=>delete raw[k]);raw.venue_id='v';
  (window.__RT||[]).filter(h=>h.flt&&h.flt.event==='UPDATE').forEach(h=>h.cb({new:raw}))}

(async()=>{try{
 for(let i=0;i<80&&document.querySelectorAll('.row').length<3;i++)await w(100);
 await window.__realLoadVenue(); await w(200);
 window.__ROWS.push(row0(X,{guest_name:'Ana',kitchen_ack_at:hrsAgo(.1),kitchen_ack_by:'Kitchen Display',protocol_confirmed_at:hrsAgo(.1),protocol_confirmed_by:'Kitchen Display',status:'acknowledged'}),
                    row0(Y,{guest_name:'Luis',notes:'sin gluten por favor'}));
 await reconcile(); await w(300);

 H('0 · CATALOG');
 ok('boot parity check clean, no failure banner',i18nParity().length===0&&!document.getElementById('i18nFail'),i18nParity().join('; '));
 ok('starts in English (display default en)',locale==='en'&&document.documentElement.lang==='en');
 ok('EN | ES control present, EN pressed',langBtn('en').getAttribute('aria-pressed')==='true'&&langBtn('es').getAttribute('aria-pressed')==='false');

 H('1 · EN → ES WITH THE BOARD OPEN');
 const s0=snap(),i0=ids(),w0=W().length;
 const prevented=tap('es'); await w(300);
 ok('language switched in one action',locale==='es'&&document.documentElement.lang==='es');
 ok('the control takes no focus (pointerdown prevented)',prevented);
 ok('same records, same states',snap()===s0);
 ok('same rows, same order',ids()===i0);
 ok('zero AllergyShield writes',W().length===w0,W().length-w0);
 ok('section headings in Spanish',/Requiere acción/i.test(board())&&/En curso/i.test(board()));
 ok('row actions in Spanish',/Confirmar recepción/.test(board())&&/Segunda revisión →/.test(board()));
 ok('summary in Spanish with agreement',/mesa/.test(document.getElementById('summaryBar').innerText)&&/alergias/.test(document.getElementById('summaryBar').innerText),document.getElementById('summaryBar').innerText);
 ok('rehearsal still visible on every row (ENSAYO)',[...document.querySelectorAll('.row')].every(r=>r.querySelector('.r-reh')&&/ENSAYO/.test(r.querySelector('.r-reh').textContent)));
 ok('header, offline banner and status follow',/Cocina/.test(document.getElementById('venueName').textContent)&&/SIN CONEXIÓN/.test(document.getElementById('offlineBanner').textContent)&&/Vinculada/.test(document.getElementById('vdStatus').textContent));
 ok('persisted for this display (one set_own_display_locale, es)',window.__LOCALE_RPC.length===1&&window.__LOCALE_RPC[0].p_locale==='es');
 await w(200);
 const cache=JSON.parse(localStorage.getItem('hc_k_locale')||'null');
 ok('local copy marked saved',cache&&cache.l==='es'&&cache.synced===true,JSON.stringify(cache));

 H('2 · ES WITH THE SECOND CHECK SHEET OPEN (C, opened only)');
 tap('en'); await w(200); openRecord(C); await w(300);
 const stepEN=owedStep(cards[C]).key; const wC=W().length;
 tap('es'); await w(300);
 ok('same declaration still open',shOn()&&recordOpenId===C);
 ok('same step',owedStep(cards[C]).key===stepEN&&stepEN==='step.verify');
 ok('title + hold in Spanish',sh().querySelector('.vfy-t').textContent.trim()==='Segunda revisión'&&sh().querySelector('.vfy-go').textContent.trim()==='Mantén presionado para registrar la segunda revisión');
 ok('instruction + provenance in Spanish',/Pide a otro miembro del equipo/.test(sh().innerText)&&/registra la pantalla, no a la persona/.test(sh().innerText));
 ok('rehearsal marker in Spanish',/ENSAYO · NO ES UN HUÉSPED REAL/.test(sh().innerText));
 ok('allergens, reference lists, guest name, table stay data (English)',/Fish, Tree Nuts/.test(sh().innerText)&&/Cod · Salmon/.test(sh().innerText)&&/P4/.test(sh().innerText)&&/Tom/.test(sh().innerText));
 ok('says the reference data is untranslated',/sin traducir/.test(sh().innerText));
 ok('wait line localised, timer still ticking in place',/Segunda revisión: esperando /.test(sh().querySelector('.vfy-el').textContent)&&!!document.getElementById('timer-'+C));
 ok('no stronger claim than English',!CLAIM.test(sh().innerText),(sh().innerText.match(CLAIM)||[''])[0]);
 ok('opening + switching wrote nothing',W().length===wC);

 H('3 · ES → EN REVERSIBLE');
 tap('en'); await w(300);
 ok('back to English, same record, same step',shOn()&&recordOpenId===C&&sh().querySelector('.vfy-t').textContent.trim()==='Second Check'&&owedStep(cards[C]).key==='step.verify');
 ok('state untouched across the round trip',snap()===s0&&W().length===w0);
 closeRecord(); await w(100);

 H('4 · LOCKOUT IN BOTH LANGUAGES (A, opened only)');
 showLockout(A); await w(200); tap('es'); await w(300);
 ok('lockout still up on the same record and stage',lkOn()&&lockoutId===A&&lockoutStage==='ack');
 ok('lockout in Spanish, rehearsal first',/^ENSAYO · NO ES UN HUÉSPED REAL/.test(lk().innerText.trim())&&/Mantén presionado para confirmar que se recibió la alergia/.test(lk().innerText));
 ok('lockout data untranslated',/Sesame, Peanut/.test(lk().innerText)&&/Sesame oil/.test(lk().innerText));
 ok('lockout: Check ingredients localised, allergen kept',/Peanut — Revisa los ingredientes/i.test(lk().innerText));
 tap('en'); await w(200);
 ok('lockout back in English, same stage',lkOn()&&lockoutStage==='ack'&&/Hold to Confirm Allergy Received/.test(lk().innerText));
 closeLockout(); await w(100);

 H('5 · A HELD SAFETY ACTION CANNOT BE DISTURBED');
 tap('es'); await w(200);
 openRecord(X); await w(300);
 let hb=sh().querySelector('.vfy-go'); const wX=W().length;
 hb.dispatchEvent(new MouseEvent('mousedown',{bubbles:true})); await w(400);
 tap('en'); await w(80);
 ok('mid-hold switch refused',locale==='es');
 ok('…and says so',/Termina primero el paso actual/.test(document.getElementById('langMsg').textContent));
 ok('the held button was not replaced',sh().querySelector('.vfy-go')===hb&&document.body.contains(hb));
 ok('the hold was not cancelled (still filling)',parseFloat(hb.querySelector('.hold-fill').style.width)>4);
 await w(900); hb.dispatchEvent(new MouseEvent('mouseup',{bubbles:true})); await w(300);
 ok('the hold completed exactly once',W().length===wX+1&&W()[W().length-1].__target===X&&'verified_at' in W()[W().length-1]);
 ok('provenance unchanged by language (verified_by is the display name)',W()[W().length-1].verified_by==='Kitchen Display');
 ok('success state shown, in Spanish',/Segunda revisión registrada/.test(sh().innerText));
 echo(X); await w(100);
 // keyboard hold: the control cannot steal focus, so it cannot blur (end) the hold
 hb=sh().querySelector('.vfy-go'); hb.focus(); const wX2=W().length;
 hb.dispatchEvent(new KeyboardEvent('keydown',{key:' ',bubbles:true})); await w(400);
 const p2=tap('en'); await w(80);
 ok('keyboard hold: switch refused, focus never left the hold',locale==='es'&&p2&&document.activeElement===hb);
 await w(900); hb.dispatchEvent(new KeyboardEvent('keyup',{key:' ',bubbles:true})); await w(300);
 ok('keyboard hold completed exactly once (Mark Served)',W().length===wX2+1&&'served_at' in W()[W().length-1]);
 echo(X); closeRecord(); await w(100);
 H('6 · POLLS, TOKEN REFRESH AND LIVE UPDATES DO NOT RESET LANGUAGE');
 await w(5600); ok('after a real 5s poll',locale==='es'&&/Requiere acción|En curso/i.test(board()));
 await vdExchange(); await w(200); ok('after a token refresh',locale==='es');
 echo(B); await w(200); ok('after a live UPDATE event',locale==='es'&&document.documentElement.lang==='es');
 ok('server value is not re-read on refresh',window.__LOCALE_RPC.every(a=>a.p_locale))

 H('7 · PERSISTENCE');
 window.__LOCALE_FAIL=true; tap('en'); await w(300);
 ok('failed save keeps the choice on screen',locale==='en');
 ok('…says it was not saved',/Language not saved to this display/.test(document.getElementById('langMsg').textContent));
 const c2=JSON.parse(localStorage.getItem('hc_k_locale'));
 ok('…and is marked unsent',c2.l==='en'&&c2.synced===false);
 window.__LOCALE_FAIL=false; window.__DEVICE_LOCALE='es'; localeBootDone=false; const nR=window.__LOCALE_RPC.length;
 await loadDeviceLocale(); await w(300);
 ok('next boot: the unsent choice wins over the stored default and is sent',locale==='en'&&window.__LOCALE_RPC.length===nR+1&&window.__LOCALE_RPC[nR].p_locale==='en');

 H('8 · MISSING TRANSLATION FAILS VISIBLY');
 const keep=I18N.es['ok.ack']; delete I18N.es['ok.ack']; locale='es';
 ok('development shows the gap, not a guess',tt('ok.ack')==='⟦es:ok.ack⟧');
 ok('parity check names it',i18nParity().some(x=>/es:ok\.ack missing/.test(x)));
 I18N_DEV=false; ok('production falls back to the English meaning',tt('ok.ack')==='Allergy Received'); I18N_DEV=true;
 I18N.es['ok.ack']=keep; locale='en'; applyLocale('en');
 ok('catalog restored',i18nParity().length===0);

 H('9 · NO STRONGER CLAIMS IN SPANISH');
 const bad=Object.entries(I18N.es).filter(([k,v])=>CLAIM.test(v)).map(([k])=>k);
 ok('no es string claims safe / allergen-free / guaranteed / certified / protected / verified',bad.length===0,bad.join(','));
 H('10 · A MILESTONE WRITE IN FLIGHT (last: it is left hung on purpose)');
 tap('es'); await w(200);
 const realFrom=sbv.from;
 sbv.from=function(){return {update:function(v){W().push(Object.assign({__hung:1},v));return {eq:function(){return new Promise(function(){})}}}}};
 openRecord(Y); await w(200); const hy=sh().querySelector('.vfy-go'); hy.dispatchEvent(new MouseEvent('mousedown',{bubbles:true})); await w(1400); hy.dispatchEvent(new MouseEvent('mouseup',{bubbles:true})); await w(200);
 tap('en'); await w(80);
 ok('switch refused while a milestone write is in flight',locale==='es'&&writeInFlight());
 ok('the in-flight write was not duplicated',W().filter(v=>v.__hung).length===1);
 sbv.from=realFrom; closeRecord(); await w(100);

 ok('stand-ins B and C untouched',!W().some(v=>v.__target===B||v.__target===C));
}catch(e){T.push('THREW '+e.message+'\n'+(e.stack||''))}
 T.push(''); T.push(fail===0?('ALL '+pass+' CHECKS PASS'):(pass+' pass, '+fail+' FAIL'));
 try{await fetch('/__results',{method:'POST',body:T.join('\n')})}catch(e){}
})();
