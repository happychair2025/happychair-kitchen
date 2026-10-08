// Replaces the jsdelivr supabase-js bundle under the harness. Every client it creates is DEAD:
// no fetch, no socket, no write can leave the page. A call is recorded in window.__ANON__ and
// answered with an error, so code that reaches the anonymous client is visible in a probe
// instead of silently talking to production. The fixture replaces the authenticated client
// (sbv) with its own recording stub; this only ensures nothing else can get through.
(function(){
  window.__ANON__=[];
  function dead(path){
    var res={data:null,error:{message:'network disabled in harness ('+path+')'}};
    var b={then:function(r,j){return Promise.resolve(res).then(r,j)}};
    ['select','insert','update','upsert','delete','eq','neq','is','in','gte','lte','order','limit','single','maybeSingle','abortSignal','retry']
      .forEach(function(m){b[m]=function(){window.__ANON__.push(path+'.'+m);return b}});
    return b;
  }
  window.supabase={createClient:function(){return {
    from:function(t){window.__ANON__.push('from:'+t);return dead('from:'+t)},
    rpc:function(f){window.__ANON__.push('rpc:'+f);return dead('rpc:'+f)},
    channel:function(){return {on:function(){return this},subscribe:function(){return this}}},
    removeChannel:function(){},realtime:{setAuth:function(){}},
    auth:{getSession:function(){return Promise.resolve({data:{session:null}})}}
  }}};
})();
