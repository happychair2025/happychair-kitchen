
if(location.search.indexOf('inst=1')>=0){
  window.__ERRS=[];
  window.addEventListener('error',function(e){window.__ERRS.push('ERROR '+e.message+' @'+e.lineno+':'+e.colno)});
  window.addEventListener('unhandledrejection',function(e){
    window.__ERRS.push('REJECT '+((e.reason&&e.reason.message)||e.reason)+'\n'+((e.reason&&e.reason.stack)||''))});
  window.__LOG__=[]; var t0=Date.now();
  window.__L=function(ev,d){window.__LOG__.push({t:Date.now()-t0,ev:ev,d:d===undefined?'':String(d)})};
  window.__W__=[];
  var ago=function(h){return new Date(Date.now()-h*3600e3).toISOString()};
  // The three exact records, ALL AT P4 (asset a1) — which is the live shape and is what makes
  // the duplicate marker count three. The prior fixture put Closure Test on another table, so
  // it never exercised the group at all.
  window.__ROWS=[
   // A · Closure Test — P4 — Sesame + Peanut. Unacknowledged, unrelated guest/session.
   {id:'ba65384b-cccc',asset_id:'a1',table_label:'P4',zone_name:'Terrace',guest_name:'Closure Test',
    allergens:['Sesame','Peanut'],severity:'anaphylaxis',cross_contact:false,notes:null,status:'pending',
    guest_session_id:'phase2b-closure-session',
    created_at:ago(146.3),kitchen_ack_at:null,kitchen_ack_by:null,
    protocol_confirmed_at:null,protocol_confirmed_by:null,
    verified_at:null,verified_by:null,served_at:null,closed_at:null,superseded_at:null,
    supersedes_id:null,minimized_at:null,service_instance_id:'s1',service_kind:'rehearsal',is_open:true},
   // B · Tom — P4 — Fish
   {id:'56a859b5-aaaa',asset_id:'a1',table_label:'P4',zone_name:'Terrace',guest_name:'Tom',
    allergens:['Fish'],severity:'anaphylaxis',cross_contact:true,notes:'Reacts badly to fish',
    status:'acknowledged',guest_session_id:'eda050cd-3e4f-4cb3-966d-1de7f65af8bc',
    created_at:ago(115.4),kitchen_ack_at:ago(90),kitchen_ack_by:'Kitchen Display',
    protocol_confirmed_at:ago(90),protocol_confirmed_by:'Kitchen Display',
    verified_at:null,verified_by:null,served_at:null,closed_at:null,superseded_at:null,
    supersedes_id:null,minimized_at:null,service_instance_id:'s1',service_kind:'rehearsal',is_open:true},
   // C · Tom — P4 — Fish + Tree Nuts. DIFFERENT guest session, no supersession.
   {id:'7784ff89-bbbb',asset_id:'a1',table_label:'P4',zone_name:'Terrace',guest_name:'Tom',
    allergens:['Fish','Tree Nuts'],severity:'anaphylaxis',cross_contact:true,notes:null,
    status:'acknowledged',guest_session_id:'c6f3e21e-8487-4bc3-ac2e-1a5c38f4790d',
    created_at:ago(113.4),kitchen_ack_at:ago(90),kitchen_ack_by:'Kitchen Display',
    protocol_confirmed_at:ago(90),protocol_confirmed_by:'Kitchen Display',
    verified_at:null,verified_by:null,served_at:null,closed_at:null,superseded_at:null,
    supersedes_id:null,minimized_at:null,service_instance_id:'s1',service_kind:'rehearsal',is_open:true}];
  var thenable=function(v){var o={retry:function(){return o},abortSignal:function(){return o},
    then:function(r,j){return Promise.resolve(v).then(r,j)}};return o};
  // This display's stored language (venue_devices.display_locale) — ?devlocale=es starts the
  // board as a display whose default is Spanish. set_own_display_locale is recorded, not sent.
  window.__DEVICE_LOCALE=(location.search.match(/devlocale=([A-Za-z-]+)/)||[])[1]||'en';
  window.__LOCALE_RPC=[];
  var stub={ rpc:function(fn,args){ __L('net.rpc',fn);
      if(fn==='set_own_display_locale'){window.__LOCALE_RPC.push(args);
        if(window.__LOCALE_FAIL)return thenable({data:null,error:{message:'refused'}});
        window.__DEVICE_LOCALE=args.p_locale;return thenable({data:args.p_locale,error:null})}
      return thenable(fn==='kitchen_board'?{data:JSON.parse(JSON.stringify(window.__ROWS)),error:null}:{data:[],error:null}) },
    from:function(tbl){return {
      select:function(){return {eq:function(){return {single:function(){
        return thenable(tbl==='venue_devices'?{data:{display_locale:window.__DEVICE_LOCALE},error:null}
                                           :{data:{name:'Happy Bistro'},error:null})}}}}},
      update:function(v){window.__W__.push(v);__L('net.update',Object.keys(v).join(','));
        return {eq:function(id,val){window.__W__[window.__W__.length-1].__target=val;
          return Promise.resolve({error:null})}}}
    }},
    // Handlers are KEPT so a probe can deliver a realtime event exactly as the socket would.
    channel:function(){return {on:function(ev,flt,cb){(window.__RT=window.__RT||[]).push({flt:flt,cb:cb});return this},
      subscribe:function(){return this}}},
    removeChannel:function(){}, realtime:{setAuth:function(){}}};
  vdExchange=async function(){ __L('token.exchange');
    vdJwt='stub';vdJwtExp=Date.now()+900000;venueId='v';
    vdIdentity={venue_id:'v',display_name:'Kitchen Display',device_role:'kitchen_display'};
    sbv=stub;vdRenderStatus();return vdJwt };
  vdToken={device_token:'stub',device_id:'d1'};
  window.__realLoadVenue=loadVenue;   // ux-pass drives the real device-credential read
  loadVenue=async function(){};
  var _rc=renderCards; renderCards=function(){ var r=_rc.apply(this,arguments);
    __L('renderCards','rows='+document.querySelectorAll('.row').length); return r };
  var _rv=renderRecord; renderRecord=function(){ __L('renderRecord','open='+String(recordOpenId).slice(0,8)); return _rv.apply(this,arguments) };
  var _ov=openRecord; openRecord=function(id){ __L('openRecord',String(id).slice(0,8)); return _ov.apply(this,arguments) };
  var _cv=closeRecord; closeRecord=function(){ __L('closeRecord','was='+String(recordOpenId).slice(0,8)); return _cv.apply(this,arguments) };
  new MutationObserver(function(ms){ms.forEach(function(m){
    __L('#verify.'+(m.type==='attributes'?m.attributeName:'children'),
        m.type==='attributes'?document.getElementById('verify').className:'content replaced')})})
    .observe(document.getElementById('verify'),{attributes:true,attributeFilter:['class','style'],childList:true,subtree:true});
}
