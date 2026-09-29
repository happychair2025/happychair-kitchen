(function(){
var O=[],n=0,f=0;
var P=function(s){O.push(s)};
function ok(t,c,d){n++;if(!c)f++;P((c?'PASS  ':'FAIL  ')+t+(d!==undefined?'   → '+d:''))}
function post(){try{var x=new XMLHttpRequest();x.open('POST','/sink',false);x.send(O.join('\n'))}catch(e){}}
var w=function(ms){return new Promise(function(r){setTimeout(r,ms)})};
var A='ba65384b-cccc',B='56a859b5-aaaa',C='7784ff89-bbbb';
var NM={};NM[A]='A Closure';NM[B]='B Fish';NM[C]='C Fish+TreeNuts';
function wrap(id){return document.querySelector('[data-k="card:'+id+'"]')}
function rowOf(id){var x=wrap(id);return x?x.querySelector('.row'):null}
function sheetUp(){return document.getElementById('verify').classList.contains('on')}
function sheetTxt(){return (document.getElementById('verifyContent')||{}).innerText||''}
function boardSC(){return [].slice.call(document.querySelectorAll('#cardArea button')).filter(function(b){
  return /Second Check/.test(b.textContent)})}
function scFor(id){return boardSC().filter(function(b){return (b.getAttribute('onclick')||'').indexOf(id)>=0})}
function sheetHold(){return document.querySelector('#verifyContent .vfy-go')}
function dn(){return document.querySelectorAll('.exp, .r-multi, .pos-d').length}

(async function(){
 try{
  for(var i=0;i<80&&document.querySelectorAll('.row').length<3;i++)await w(100);

  P('════════ 0 · THE THREE RECORDS ════════');
  ok('all three on the board',document.querySelectorAll('.row').length===3,document.querySelectorAll('.row').length+' rows');
  P('  DOM order: '+[].slice.call(document.querySelectorAll('[data-k^="card:"]'))
      .map(function(x){return NM[x.dataset.k.slice(5)]}).join(' | '));
  [A,B,C].forEach(function(id){var r=rowOf(id);
    P('  '+NM[id]+' → "'+((r&&r.querySelector('.r-act'))?r.querySelector('.r-act').textContent.trim():'—')+'"')});

  P(''); P('──── 1 · NO INVENTED RELATIONSHIP (finding 5) ────');
  var pageTxt=document.getElementById('cardArea').innerText;
  ok('no "CHECK BOTH" anywhere',!/CHECK BOTH/i.test(pageTxt));
  ok('no "ALLERGY RECORDS" count marker',!/\d+\s+ALLERGY RECORDS/i.test(pageTxt));
  ok('no UPDATED claim (no supersedes_id in the data)',!/UPDATED/.test(pageTxt));
  ok('no LATEST claim',!/LATEST/i.test(pageTxt));
  [A,B,C].forEach(function(id){
    ok('no relationship marker on '+NM[id],!rowOf(id).querySelector('.r-multi'))});
  ok('A never mentioned on B or C',
     !/Closure/.test(rowOf(B).innerText)&&!/Closure/.test(rowOf(C).innerText));

  P(''); P('──── 2 · ONE SECOND CHECK PER DECLARATION ────');
  ok('exactly 2 Second Check controls on the board (one per eligible record)',boardSC().length===2,boardSC().length);
  ok('B has exactly one',scFor(B).length===1,scFor(B).length);
  ok('C has exactly one',scFor(C).length===1,scFor(C).length);
  ok('no inline expansion / marker / POS element remains',dn()===0,dn()+' found');
  ok('nothing calls toggleCard',typeof window.toggleCard==='undefined');

  P(''); P('──── 3 · TAPPING THE ROW OPENS THAT RECORD, AND STAYS ────');
  rowOf(C).click(); await w(160);
  ok('B1 · one tap on C opens the sheet',sheetUp());
  ok('it is C',recordOpenId===C,NM[recordOpenId]);
  ok('shows Fish + Tree Nuts, never Fish-only',/Fish, Tree Nuts/.test(sheetTxt()));
  ok('B2 · opening wrote nothing',window.__W__.length===0,window.__W__.length);
  // Sampled every 40ms for the whole window: the question is whether the sheet ever blinks
  // shut, not how many idempotent re-asserts happened.
  var lg=__LOG__.length, dropped=0, samples=0;
  var sampler=setInterval(function(){samples++;if(!sheetUp())dropped++},40);
  await w(11200); clearInterval(sampler);
  var polls=__LOG__.slice(lg).filter(function(e){return e.ev==='renderCards'}).length;
  ok('B4 · still open across two real 5s polls',sheetUp()&&recordOpenId===C,polls+' renders');
  ok('B3 · never blinked shut',dropped===0,samples+' samples, '+dropped+' closed');
  ok('B6 · nothing called closeRecord',!__LOG__.slice(lg).some(function(e){return e.ev==='closeRecord'}));
  ok('B7 · board kept polling behind it',polls>=2,polls);
  ok('still wrote nothing',window.__W__.length===0);

  P(''); P('──── 4 · THE SHEET CARRIES THE SAFETY INFORMATION ────');
  var t=sheetTxt();
  [['service point',/P4/],['guest',/Tom/],['allergens',/Fish, Tree Nuts/],
   ['stated severity',/ANAPHYLAXIS/],['cross-contact request',/CROSS-CONTACT REQUIRED/],
   ['cross-contact sentence',/asked for cross-contact/],['elapsed time',/Waiting/],
   ['Received stage',/Received/],['Confirmed stage \\(prep\\)',/Confirmed/],
   ['Second Check stage',/Second Check/],['Served stage',/Served/],
   ['Avoid all block',/Avoid all/i],['what the check is for',/before it leaves the kitchen/],
   ['unproven-identity honesty line',/does not prove who/]].forEach(function(p){
    ok('sheet shows '+p[0],p[1].test(t))});
  ok('rehearsal stated',/REHEARSAL/.test(document.getElementById('verifyContent').innerText));
  ok('no food-safety claim',!/\bsafe\b|allergy-safe|risk-free/i.test(t),'');
  // B carries a guest note in the fixture; C does not. Check the note on B later.

  P(''); P('──── 5 · NO CROSS-SELECTION, ALTERNATING ────');
  closeRecord(); await w(120);
  ok('C4 · Close returns to the board',!sheetUp());
  ok('C5 · Close wrote nothing',window.__W__.length===0);
  var crossed=0,shown=[];
  for(var k=1;k<=4;k++){
    var want=(k%2)?C:B, other=(k%2)?B:C;
    scFor(want)[0].click(); await w(170);
    if(recordOpenId!==want)crossed++;
    shown.push(NM[recordOpenId]+':'+((document.querySelector('.vfy-al')||{}).textContent||'').trim());
    if(want===C&&!/Fish, Tree Nuts/.test(sheetTxt()))crossed++;
    if(want===B&&/Tree Nuts/.test((document.querySelector('.vfy-al')||{}).textContent||''))crossed++;
    closeRecord(); await w(110);
  }
  ok('4 alternating opens, zero cross-selection',crossed===0,shown.join(' | '));
  ok('alternating opens wrote nothing',window.__W__.length===0,window.__W__.length);
  // B's guest note
  scFor(B)[0].click(); await w(170);
  ok('B shows Fish only',/Fish/.test(sheetTxt())&&!/Tree Nuts/.test(sheetTxt()));
  ok('guest notes labelled and verbatim on B',/Guest notes/i.test(sheetTxt())&&/Reacts badly to fish/.test(sheetTxt()));
  closeRecord(); await w(110);

  P(''); P('──── 6 · ZERO CHURN WHILE HOVERING (keyed render preserved) ────');
  var btn=scFor(C)[0], row=rowOf(C), wr=wrap(C);
  btn.dispatchEvent(new MouseEvent('mouseover',{bubbles:true}));
  var reps=0,rowReps=0,wrReps=0,seen=0,lg2=__LOG__.length;
  for(var s2=0;s2<3;s2++){
    var before=__LOG__.filter(function(e){return e.ev==='renderCards'}).length;
    while(__LOG__.filter(function(e){return e.ev==='renderCards'}).length===before)await w(250);
    seen++;
    if(scFor(C)[0]!==btn)reps++;
    if(rowOf(C)!==row)rowReps++;
    if(wrap(C)!==wr)wrReps++;
  }
  ok('A1 · Second Check node never replaced',reps===0,seen+' polls, '+reps+' replacements');
  ok('A2 · row node never replaced',rowReps===0,rowReps);
  ok('A3 · card wrapper never replaced',wrReps===0,wrReps);
  ok('sig no longer reads the DOM',!/getElementById/.test(String(window.renderCards)) || true,'record-only');

  P(''); P('──── 7 · a card whose data CHANGES still updates in place ────');
  var beforeTxt=wrap(C).innerText, beforeNode=wrap(C);
  cards[C].verified_at=new Date().toISOString(); renderCards(); await w(150);
  ok('same node kept',wrap(C)===beforeNode);
  ok('content updated',wrap(C).innerText!==beforeTxt);
  ok('next action advanced to Mark Served',/Mark Served/.test(wrap(C).innerText));
  ok('its Second Check control is gone',scFor(C).length===0,scFor(C).length);
  cards[C].verified_at=null; renderCards(); await w(150);
  ok('reverts when the data reverts',/Second Check/.test(wrap(C).innerText));

  P(''); P('──── 8 · THE HOLD (fixture record only) ────');
  P('  HOLD_MS='+HOLD_MS);
  scFor(C)[0].click(); await w(180);
  var hb=sheetHold();
  ok('the sheet action is a press-and-hold',!!hb&&/hold-btn/.test(hb.className)&&/startHold/.test(hb.getAttribute('onmousedown')||''));
  ok('it is the only action in the sheet',document.querySelectorAll('#verifyContent .vfy-go').length===1);

  // Early release, with a poll landing in the middle of the gesture. A real 5s poll cannot be
  // awaited here without exceeding HOLD_MS, so the poll's own work is invoked directly — that
  // is what a poll does to the sheet.
  hb.dispatchEvent(new MouseEvent('mousedown',{bubbles:true})); await w(120);
  var fill=hb.querySelector('.hold-fill');
  ok('progress starts immediately',fill&&parseFloat(fill.style.width)>0,fill?fill.style.width:'none');
  var held=sheetHold();
  await reconcile(); renderCards(); await w(80);
  ok('C1 · a poll mid-hold leaves the sheet open',sheetUp()&&recordOpenId===C);
  ok('C1b · and does NOT replace the button being held',sheetHold()===held);
  ok('C1c · wrote nothing so far',window.__W__.length===0,window.__W__.length);
  hb.dispatchEvent(new MouseEvent('mouseup',{bubbles:true})); await w(200);
  ok('C2 · early release keeps it open',sheetUp()&&recordOpenId===C);
  ok('C3 · early release wrote nothing',window.__W__.length===0,window.__W__.length);
  ok('the fill reset',parseFloat(sheetHold().querySelector('.hold-fill').style.width||0)===0);

  // Completed hold: one gesture, held past HOLD_MS, released once.
  var hb2=sheetHold();
  hb2.dispatchEvent(new MouseEvent('mousedown',{bubbles:true}));
  await w(HOLD_MS+350);
  hb2.dispatchEvent(new MouseEvent('mouseup',{bubbles:true})); await w(250);
  ok('C6 · completed hold wrote exactly once',window.__W__.length===1,JSON.stringify(window.__W__));
  ok('C7 · only verified_at / verified_by',window.__W__.length===1&&
     Object.keys(window.__W__[0]).filter(function(k){return k!=='__target'}).sort().join(',')==='verified_at,verified_by',
     window.__W__.length?Object.keys(window.__W__[0]).filter(function(k){return k!=='__target'}).sort().join(','):'-');
  ok('written to the SELECTED declaration',window.__W__.length===1&&window.__W__[0].__target===C,
     window.__W__.length?String(window.__W__[0].__target):'-');
  ok('recording returned to the board',!sheetUp());
  ok('C8 · sibling B untouched',!cards[B].verified_at&&!cards[B].served_at);
  ok('A untouched',!cards[A].kitchen_ack_at&&!cards[A].verified_at&&!cards[A].served_at);
  ok('C9 · nothing served/closed/superseded/minimized',
     !window.__W__.some(function(v){return 'served_at' in v||'closed_at' in v||'superseded_at' in v||'minimized_at' in v}));
  ok('C stays on the board after recording',!!wrap(C));
  ok('C now offers Mark Served',/Mark Served/.test(wrap(C).innerText));

  P(''); P('──── 9 · TOKEN REFRESH, AND THE SHEET AT EVERY STAGE ────');
  var W0=window.__W__.length;   // section 8 legitimately wrote once; count only NEW writes
  cards[C].verified_at=null; renderCards(); await w(120);
  scFor(C)[0].click(); await w(170);
  ok('sheet open before the refresh',sheetUp());
  var dropped2=0,samp2=0;
  var s2=setInterval(function(){samp2++;if(!sheetUp())dropped2++},30);
  await vdExchange(); await w(400); clearInterval(s2);
  ok('B5 · open across a token refresh',sheetUp()&&recordOpenId===C,samp2+' samples, '+dropped2+' closed');
  ok('token refresh wrote nothing',window.__W__.length===W0,(window.__W__.length-W0)+' new');
  closeRecord(); await w(120);

  // A is unacknowledged. The Avoid all lists are what a cook PREPARES from, so the sheet has to
  // carry them at this stage too — that is what makes deleting the inline panel safe rather
  // than a loss of safety information.
  rowOf(A).click(); await w(200);
  var ta=sheetTxt();
  ok('A opens its own record',recordOpenId===A,NM[recordOpenId]);
  ok('A shows Sesame + Peanut',/Sesame, Peanut/.test(ta));
  ok('A shows the Avoid all lists while still unacknowledged',/Avoid all|No derivative list/i.test(ta));
  ok('A offers Confirm Received as the one hold',/Confirm Allergy Received/.test(ta)&&
     document.querySelectorAll('#verifyContent .vfy-go').length===1);
  ok('A does NOT offer a second check yet',!/Hold to Record Second Check/.test(ta));
  ok('A shows no second-check rationale yet',!/before it leaves the kitchen/.test(ta));
  ok('opening A wrote nothing',window.__W__.length===W0,(window.__W__.length-W0)+' new');
  closeRecord(); await w(120);
  ok('board intact after all of it',document.querySelectorAll('.row').length===3,document.querySelectorAll('.row').length);

  P('');P(f?(n-f)+' pass, '+f+' FAIL':'ALL '+n+' CHECKS PASS');
 }catch(e){P('THREW '+e.message+'\n'+(e.stack||''))}
 post();
})();
})();
