/* ===== Technical analysis library (shared by built-in indicators and user scripts) ===== */
function TAF(){
  const A=n=>new Array(n).fill(null),bad=v=>v==null||v!==v||v===Infinity||v===-Infinity;
  const lift=(x,n)=>Array.isArray(x)?x:A(n).fill(x);
  const len=(...xs)=>{for(const x of xs)if(Array.isArray(x))return x.length;return 0};
  const map2=(a,b,f)=>{const n=len(a,b);a=lift(a,n);b=lift(b,n);const o=A(n);for(let i=0;i<n;i++){const x=a[i],y=b[i];if(!bad(x)&&!bad(y)){const r=f(x,y);o[i]=bad(r)?null:r}}return o};
  const map1=(a,f)=>a.map(x=>{if(bad(x))return null;const r=f(x);return bad(r)?null:r});
  const shift=(s,k=1)=>s.map((_,i)=>i-k>=0&&i-k<s.length?s[i-k]:null);
  function sum(s,n){const o=A(s.length);let acc=0,cnt=0;for(let i=0;i<s.length;i++){if(!bad(s[i])){acc+=s[i];cnt++}if(i>=n&&!bad(s[i-n])){acc-=s[i-n];cnt--}if(i>=n-1&&cnt===n)o[i]=acc}return o}
  const sma=(s,n)=>map1(sum(s,n),x=>x/n);
  function emaA(s,n,al){const o=A(s.length);let e=null,acc=0,cnt=0;for(let i=0;i<s.length;i++){const v=s[i];if(bad(v))continue;if(e==null){acc+=v;if(++cnt===n){e=acc/n;o[i]=e}}else{e=al*v+(1-al)*e;o[i]=e}}return o}
  const ema=(s,n)=>emaA(s,n,2/(n+1)),rma=(s,n)=>emaA(s,n,1/n);
  function wma(s,n){const o=A(s.length),d=n*(n+1)/2;for(let i=n-1;i<s.length;i++){let a=0,ok=true;for(let j=0;j<n;j++){const v=s[i-n+1+j];if(bad(v)){ok=false;break}a+=v*(j+1)}if(ok)o[i]=a/d}return o}
  const hma=(s,n)=>wma(map2(wma(s,Math.max(1,Math.floor(n/2))),wma(s,n),(a,b)=>2*a-b),Math.max(1,Math.floor(Math.sqrt(n))));
  const vwma=(s,v,n)=>map2(sma(map2(s,v,(a,b)=>a*b),n),sma(v,n),(a,b)=>b?a/b:null);
  const dema=(s,n)=>{const e=ema(s,n);return map2(e,ema(e,n),(a,b)=>2*a-b)};
  const tema=(s,n)=>{const e=ema(s,n),e2=ema(e,n),e3=ema(e2,n);return e.map((v,i)=>bad(v)||bad(e2[i])||bad(e3[i])?null:3*v-3*e2[i]+e3[i])};
  function stdev(s,n){const m=sma(s,n),o=A(s.length);for(let i=n-1;i<s.length;i++){if(m[i]==null)continue;let a=0;for(let j=i-n+1;j<=i;j++)a+=(s[j]-m[i])**2;o[i]=Math.sqrt(a/n)}return o}
  function ext(s,n,hi){const o=A(s.length);for(let i=n-1;i<s.length;i++){let m=hi?-Infinity:Infinity,ok=true;for(let j=i-n+1;j<=i;j++){const v=s[j];if(bad(v)){ok=false;break}if(hi?v>m:v<m)m=v}if(ok)o[i]=m}return o}
  const highest=(s,n)=>ext(s,n,true),lowest=(s,n)=>ext(s,n,false);
  const change=(s,k=1)=>map2(s,shift(s,k),(a,b)=>a-b);
  const roc=(s,k)=>map2(s,shift(s,k),(a,b)=>b?100*(a-b)/b:null);
  const tr=(h,l,c)=>h.map((_,i)=>i?Math.max(h[i]-l[i],Math.abs(h[i]-c[i-1]),Math.abs(l[i]-c[i-1])):h[i]-l[i]);
  const atr=(h,l,c,n)=>rma(tr(h,l,c),n);
  function rsi(s,n){const ch=change(s),up=rma(map1(ch,x=>Math.max(x,0)),n),dn=rma(map1(ch,x=>Math.max(-x,0)),n);return map2(up,dn,(u,d)=>d===0?100:u===0?0:100-100/(1+u/d))}
  function macd(s,f=12,sl=26,sg=9){const m=map2(ema(s,f),ema(s,sl),(a,b)=>a-b),g=ema(m,sg);return[m,g,map2(m,g,(a,b)=>a-b)]}
  function stoch(c,h,l,n){const hh=highest(h,n),ll=lowest(l,n);return c.map((v,i)=>bad(hh[i])||bad(ll[i])||bad(v)?null:hh[i]===ll[i]?50:100*(v-ll[i])/(hh[i]-ll[i]))}
  function cci(s,n){const m=sma(s,n),o=A(s.length);for(let i=n-1;i<s.length;i++){if(m[i]==null)continue;let d=0;for(let j=i-n+1;j<=i;j++)d+=Math.abs(s[j]-m[i]);d/=n;o[i]=d?(s[i]-m[i])/(.015*d):0}return o}
  function mfi(src,v,n){const ch=change(src),pos=src.map((x,i)=>ch[i]==null?null:ch[i]>0?x*v[i]:0),neg=src.map((x,i)=>ch[i]==null?null:ch[i]<0?x*v[i]:0);return map2(sum(pos,n),sum(neg,n),(u,d)=>d===0?100:100-100/(1+u/d))}
  function cum(s){let a=0;return s.map(x=>bad(x)?a:(a+=x))}
  function obv(c,v){let a=0;return c.map((x,i)=>{if(i)a+=x>c[i-1]?v[i]:x<c[i-1]?-v[i]:0;return a})}
  function accdist(h,l,c,v){let a=0;return c.map((x,i)=>{const r=h[i]-l[i];a+=r?((x-l[i])-(h[i]-x))/r*v[i]:0;return a})}
  function dmi(h,l,c,n=14,sm=14){const up=change(h),dn=map1(change(l),x=>-x);const pdm=up.map((u,i)=>u==null?null:(u>dn[i]&&u>0?u:0)),mdm=dn.map((d,i)=>d==null?null:(d>up[i]&&d>0?d:0));const t=rma(tr(h,l,c),n),p=map2(rma(pdm,n),t,(a,b)=>b?100*a/b:0),m=map2(rma(mdm,n),t,(a,b)=>b?100*a/b:0),dx=map2(p,m,(a,b)=>a+b?100*Math.abs(a-b)/(a+b):0);return[p,m,rma(dx,sm)]}
  function sar(h,l,st=.02,inc=.02,mx=.2){const n=h.length,o=A(n);if(n<2)return o;let up=h[1]>=h[0],af=st,ep=up?h[0]:l[0],s=up?l[0]:h[0];
    for(let i=1;i<n;i++){s=s+af*(ep-s);
      if(up){s=Math.min(s,l[i-1],i>1?l[i-2]:l[i-1]);if(l[i]<s){up=false;s=ep;ep=l[i];af=st}else if(h[i]>ep){ep=h[i];af=Math.min(af+inc,mx)}}
      else{s=Math.max(s,h[i-1],i>1?h[i-2]:h[i-1]);if(h[i]>s){up=true;s=ep;ep=h[i];af=st}else if(l[i]<ep){ep=l[i];af=Math.min(af+inc,mx)}}
      o[i]=s}return o}
  function supertrend(h,l,c,f=3,n=10){const a=atr(h,l,c,n),N=c.length,line=A(N),dir=A(N);let pu=null,pl=null,pline=null,d=-1;
    for(let i=0;i<N;i++){if(a[i]==null)continue;const m=(h[i]+l[i])/2;let u=m+f*a[i],b=m-f*a[i];
      if(pl!=null&&!(b>pl||c[i-1]<pl))b=pl;if(pu!=null&&!(u<pu||c[i-1]>pu))u=pu;
      if(pline==null)d=-1;else if(pline===pu)d=c[i]>u?1:-1;else d=c[i]<b?-1:1;
      line[i]=d===1?b:u;dir[i]=d;pu=u;pl=b;pline=line[i]}return[line,dir]}
  function bb(s,n=20,k=2){const m=sma(s,n),sd=stdev(s,n);return[m,map2(m,sd,(a,b)=>a+k*b),map2(m,sd,(a,b)=>a-k*b)]}
  function kc(h,l,c,n=20,k=1.5){const m=ema(c,n),r=ema(tr(h,l,c),n);return[m,map2(m,r,(a,b)=>a+k*b),map2(m,r,(a,b)=>a-k*b)]}
  function donchian(h,l,n=20){const u=highest(h,n),d=lowest(l,n);return[u,map2(u,d,(a,b)=>(a+b)/2),d]}
  function aroon(h,l,n=14){const N=h.length,u=A(N),d=A(N);for(let i=n;i<N;i++){let hi=i-n,lo=i-n;for(let j=i-n;j<=i;j++){if(h[j]>=h[hi])hi=j;if(l[j]<=l[lo])lo=j}u[i]=100*(n-(i-hi))/n;d[i]=100*(n-(i-lo))/n}return[u,d]}
  function linreg(s,n,off=0){const o=A(s.length),sx=n*(n-1)/2,sxx=(n-1)*n*(2*n-1)/6;for(let i=n-1;i<s.length;i++){let sy=0,sxy=0,ok=true;for(let j=0;j<n;j++){const v=s[i-n+1+j];if(bad(v)){ok=false;break}sy+=v;sxy+=j*v}if(!ok)continue;const den=n*sxx-sx*sx,sl=den?(n*sxy-sx*sy)/den:0,ic=(sy-sl*sx)/n;o[i]=ic+sl*(n-1-off)}return o}
  function crossover(a,b){const n=len(a,b);a=lift(a,n);b=lift(b,n);return a.map((x,i)=>i>0&&!bad(x)&&!bad(b[i])&&!bad(a[i-1])&&!bad(b[i-1])&&x>b[i]&&a[i-1]<=b[i-1])}
  const crossunder=(a,b)=>crossover(b,a);
  const cross=(a,b)=>{const x=crossover(a,b),y=crossunder(a,b);return x.map((v,i)=>v||y[i])};
  function barssince(c){let last=null;return c.map((v,i)=>{if(v)last=i;return last==null?null:i-last})}
  function valuewhen(c,src,occ=0){const hits=[];return c.map((v,i)=>{if(v)hits.push(i);const k=hits[hits.length-1-occ];return k==null?null:src[k]})}
  function pivot(s,lb,rb,hi){const o=A(s.length);for(let i=lb+rb;i<s.length;i++){const p=i-rb,v=s[p];if(bad(v))continue;let ok=true;for(let j=p-lb;j<=p+rb&&ok;j++){if(j===p)continue;const w=s[j];if(bad(w)||(hi?(j<p?w>v:w>=v):(j<p?w<v:w<=v)))ok=false}if(ok)o[i]=v}return o}
  function percentrank(s,n){const o=A(s.length);for(let i=n;i<s.length;i++){if(bad(s[i]))continue;let c=0;for(let j=i-n;j<i;j++)if(s[j]<=s[i])c++;o[i]=100*c/n}return o}
  const swma=s=>s.map((v,i)=>i<3||[0,1,2,3].some(k=>bad(s[i-k]))?null:(s[i-3]+2*s[i-2]+2*s[i-1]+s[i])/6);
  const rising=(s,n)=>{const h=shift(highest(s,n),1);return s.map((v,i)=>!bad(v)&&!bad(h[i])&&v>h[i])};
  const falling=(s,n)=>{const l=shift(lowest(s,n),1);return s.map((v,i)=>!bad(v)&&!bad(l[i])&&v<l[i])};
  const nz=(s,v=0)=>Array.isArray(s)?s.map(x=>bad(x)?v:x):bad(s)?v:s;
  const wpr=(h,l,c,n)=>{const hh=highest(h,n),ll=lowest(l,n);return c.map((v,i)=>bad(hh[i])||hh[i]===ll[i]?null:100*(v-hh[i])/(hh[i]-ll[i]))};
  return{sma,ema,rma,wma,hma,vwma,dema,tema,stdev,highest,lowest,change,mom:change,roc,tr,atr,rsi,macd,stoch,cci,mfi,obv,accdist,cum,dmi,sar,supertrend,bb,kc,donchian,aroon,linreg,
    crossover,crossunder,cross,barssince,valuewhen,pivothigh:(s,l,r)=>pivot(s,l,r,true),pivotlow:(s,l,r)=>pivot(s,l,r,false),percentrank,swma,sum,rising,falling,nz,wpr,shift,
    add:(a,b)=>map2(a,b,(x,y)=>x+y),sub:(a,b)=>map2(a,b,(x,y)=>x-y),mul:(a,b)=>map2(a,b,(x,y)=>x*y),div:(a,b)=>map2(a,b,(x,y)=>y?x/y:null),
    max:(a,b)=>map2(a,b,Math.max),min:(a,b)=>map2(a,b,Math.min),abs:a=>map1(a,Math.abs),log:a=>map1(a,Math.log),map:map1,map2};
}

/* ===== Backtester: signals evaluated on bar close, filled at next bar's open (or same close) ===== */
function BT(B,cfg,orders){
  const n=B.c.length,ent=orders.filter(o=>o.k==='entry'),cls=orders.filter(o=>o.k==='close'),exs=orders.filter(o=>o.k==='exit');
  const comm=(+cfg.commission||0)/100,slip=(+cfg.slippage||0)/100,cap=+cfg.capital||10000;
  let cash=cap,pos=null,pend=null,peak=cap,mdd=0,mddPct=0;const trades=[],eq=new Array(n).fill(null),markers=[];
  const unreal=px=>pos?pos.dir*pos.qty*(px-pos.price):0;
  function openPos(dir,price,i,id,qty){price*=1+dir*slip;const base=cash;let q=qty!=null?+qty:cfg.sizeType==='cash'?cfg.size/price:cfg.sizeType==='qty'?+cfg.size:base*cfg.size/100/price;if(!(q>0))return;const fee=q*price*comm;cash-=fee;pos={dir,qty:q,price,i,id,t:B.t[i],fee,best:price,mfe:0,mae:0};markers.push({i,dir,k:'in',id,price})}
  function closePos(price,i,why){price*=1-pos.dir*slip;const fee=pos.qty*price*comm,gross=pos.dir*pos.qty*(price-pos.price);cash+=gross-fee;const pnl=gross-fee-pos.fee;
    trades.push({n:trades.length+1,dir:pos.dir,id:pos.id,ei:pos.i,et:pos.t,ep:pos.price,xi:i,xt:B.t[i],xp:price,qty:pos.qty,pnl,pct:pnl/(pos.qty*pos.price)*100,why,mfe:pos.mfe,mae:pos.mae,bars:i-pos.i});
    markers.push({i,dir:-pos.dir,k:'out',id:why,price});pos=null}
  for(let i=0;i<n;i++){
    if(pend){const o=B.o[i];if(pend.close&&pos)closePos(o,i,pend.why);if(pend.open&&!pos)openPos(pend.open.dir,o,i,pend.open.id,pend.open.qty);pend=null}
    if(pos){const x=exs.find(e=>e.id===pos.id)||exs.find(e=>e.id==null||e.id==='*');
      if(x){const d=pos.dir,ep=pos.price;let stop=null,lim=null;
        if(x.stopPct!=null)stop=ep*(1-d*x.stopPct/100);if(x.stop&&i>0&&x.stop[i-1]!=null)stop=x.stop[i-1];
        if(x.takePct!=null)lim=ep*(1+d*x.takePct/100);if(x.limit&&i>0&&x.limit[i-1]!=null)lim=x.limit[i-1];
        if(x.trailPct!=null){const ts=pos.best*(1-d*x.trailPct/100);stop=stop==null?ts:d>0?Math.max(stop,ts):Math.min(stop,ts)}
        const hs=stop!=null&&(d>0?B.l[i]<=stop:B.h[i]>=stop),hl=lim!=null&&(d>0?B.h[i]>=lim:B.l[i]<=lim);
        if(hs)closePos(d>0?Math.min(stop,B.o[i]):Math.max(stop,B.o[i]),i,x.trailPct!=null?'Trail':'Stop');
        else if(hl)closePos(d>0?Math.max(lim,B.o[i]):Math.min(lim,B.o[i]),i,'Target')}}
    if(pos){pos.best=pos.dir>0?Math.max(pos.best,B.h[i]):Math.min(pos.best,B.l[i]);pos.mfe=Math.max(pos.mfe,(pos.dir>0?B.h[i]-pos.price:pos.price-B.l[i])*pos.qty);pos.mae=Math.max(pos.mae,(pos.dir>0?pos.price-B.l[i]:B.h[i]-pos.price)*pos.qty)}
    const p={};
    for(const c of cls)if(c.when[i]&&pos&&(c.id==null||c.id===pos.id)){p.close=true;p.why=c.id==null?'Close all':'Close';break}
    for(const e of ent){if(!e.when[i])continue;if(pos&&pos.dir===e.dir&&!p.close)continue;if(pos&&pos.dir!==e.dir){p.close=true;p.why='Reverse'}p.open={dir:e.dir,id:e.id,qty:e.qty};break}
    if(p.close||p.open){if(cfg.fill==='close'){if(p.close&&pos)closePos(B.c[i],i,p.why);if(p.open&&!pos)openPos(p.open.dir,B.c[i],i,p.open.id,p.open.qty)}else if(i<n-1)pend=p}
    const e=cash+unreal(B.c[i]);eq[i]=e;if(e>peak)peak=e;const dd=peak-e;if(dd>mdd)mdd=dd;if(peak&&dd/peak>mddPct)mddPct=dd/peak;
  }
  const open=pos?{dir:pos.dir,id:pos.id,ei:pos.i,et:pos.t,ep:pos.price,qty:pos.qty,pnl:unreal(B.c[n-1])-pos.fee}:null;
  return STATS(B,cap,trades,eq,markers,open,{capital:cap,size:cfg.size,sizeType:cfg.sizeType,commission:cfg.commission,slippage:cfg.slippage||0,fill:cfg.fill});
}

/* ===== Shared performance statistics ===== */
function STATS(B,cap,trades,eq,markers,open,cfgOut,extra){
  const n=eq.length;
  function summary(list){const w=list.filter(t=>t.pnl>0),l=list.filter(t=>t.pnl<=0),gp=w.reduce((a,t)=>a+t.pnl,0),gl=-l.reduce((a,t)=>a+t.pnl,0),net=gp-gl;
    return{count:list.length,wins:w.length,losses:l.length,winRate:list.length?w.length/list.length*100:0,gp,gl,net,netPct:net/cap*100,pf:gl?gp/gl:(gp?Infinity:0),avg:list.length?net/list.length:0,
      avgPct:list.length?list.reduce((a,t)=>a+t.pct,0)/list.length:0,avgWin:w.length?gp/w.length:0,avgLoss:l.length?gl/l.length:0,ratio:l.length&&w.length?(gp/w.length)/(gl/l.length):0,
      largestWin:w.length?Math.max(...w.map(t=>t.pnl)):0,largestLoss:l.length?Math.min(...l.map(t=>t.pnl)):0,avgBars:list.length?list.reduce((a,t)=>a+t.bars,0)/list.length:0}}
  let cumP=0;for(const t of trades){cumP+=t.pnl;t.cum=cumP}
  let first=-1,last=-1,peak=-Infinity,mdd=0,mddPct=0;const rets=[];
  for(let i=0;i<n;i++){const v=eq[i];if(v==null)continue;if(first<0)first=i;else if(eq[last])rets.push(v/eq[last]-1);last=i;if(v>peak)peak=v;const dd=peak-v;if(dd>mdd)mdd=dd;if(peak>0&&dd/peak>mddPct)mddPct=dd/peak}
  const mean=rets.reduce((a,b)=>a+b,0)/(rets.length||1),sd=Math.sqrt(rets.reduce((a,b)=>a+(b-mean)**2,0)/(rets.length||1));
  const barMs=n>1?(B.t[n-1]-B.t[0])/(n-1):864e5,perYear=31536e6/barMs,dsd=Math.sqrt(rets.filter(r=>r<0).reduce((a,b)=>a+b*b,0)/(rets.length||1));
  const final=last>=0?eq[last]:cap,yrs=first>=0?(B.t[last]-B.t[first])/31556952000:0;
  return{trades,equity:eq,markers,open,cfg:cfgOut,
    stats:Object.assign({all:summary(trades),long:summary(trades.filter(t=>t.dir>0)),short:summary(trades.filter(t=>t.dir<0)),final,ret:(final/cap-1)*100,cagr:yrs>0&&final>0?((final/cap)**(1/yrs)-1)*100:0,mdd,mddPct:mddPct*100,
      bh:first>=0?(B.c[last]/B.c[first]-1)*100:0,sharpe:sd?mean/sd*Math.sqrt(perYear):0,sortino:dsd?mean/dsd*Math.sqrt(perYear):0,openPnl:open?open.pnl:0,
      from:first>=0?B.t[first]:null,to:last>=0?B.t[last]:null},extra||{})};
}

/* ===== Bar-by-bar strategy engine: your function runs on every bar and manages the position ===== */
function BTP(B,cfg,fn,o){
  o=o||{};const n=B.c.length,cap=+(o.capital??cfg.capital)||10000,cost=o.cost!=null?+o.cost:((+cfg.commission||0)+(+cfg.slippage||0))/100;
  const barMs=n>1?B.t[1]-B.t[0]:864e5,fund=(+o.funding8h||0)*barMs/288e5,fsm=o.fundingShortMult??1;
  const pd=s=>{if(s==null||s==='')return null;const t=typeof s==='number'?s:Date.parse(s);return isFinite(t)?t:null};
  const from=pd(o.from)??-Infinity,to=pd(o.to)??Infinity,warm=+o.warmup||0;
  let eq=cap,pend=null,fundTot=0;const trades=[],markers=[],events=[],equity=new Array(n).fill(null),stopLine=new Array(n).fill(null),tpLine=new Array(n).fill(null);
  const s={pos:0,qty:0,entry:0,stop:null,tag:'',barsIn:0,i:0,data:{},targets:[],get equity(){return eq}};
  const side=x=>x==='short'||x<0?-1:1,EPS=1e-12;
  s.order=(d,a={})=>{pend=Object.assign({side:side(d)},a)};
  s.buy=(a={})=>s.order(1,a);s.sell=(a={})=>s.order(-1,a);
  s.setStop=p=>{s.stop=p==null||!isFinite(p)?null:+p};
  s.charge=x=>{eq-=+x||0};
  let cur=null;
  const ev=(i,type,x)=>events.push(Object.assign({i,t:B.t[i],type,dir:s.pos||x.dir,tag:s.tag},x));
  const mkTargets=(list,dir,entry,stop,q0)=>(list||[]).map(t=>{const dist=stop!=null?Math.abs(entry-stop):0,price=t.price!=null?+t.price:t.r!=null&&dist?entry+dir*t.r*dist:null;
    return price==null?null:{price,qty:q0*Math.min(1,Math.max(0,(t.pct??100)/100)),why:t.why||'TP',moveStop:t.moveStop||null,r:t.r,hit:false}}).filter(Boolean).sort((a,b)=>dir*(a.price-b.price));
  function close(qty,price,i,why,kind){
    qty=Math.min(qty,s.qty);if(!(qty>EPS))return;const px=price*(1-(cur.cost??cost)*s.pos),pnl=qty*(px-s.entry)*s.pos,full=s.qty-qty<=s.qty*1e-9;eq+=pnl;
    trades.push({n:trades.length+1,dir:s.pos,id:s.tag||(s.pos>0?'Long':'Short'),ei:cur.i,et:B.t[cur.i],ep:s.entry,xi:i,xt:B.t[i],xp:px,qty,pnl,pct:pnl/(qty*s.entry)*100,why,partial:!full,mfe:cur.mfe*qty/cur.q0,mae:cur.mae*qty/cur.q0,bars:i-cur.i,funding:full?cur.fund:0});
    markers.push({i,dir:-s.pos,k:'out',id:why,price:px});
    ev(i,kind||'exit',{price,qty,why,pnl,entry:s.entry,remaining:full?0:s.qty-qty,stop:s.stop,q0:cur.q0});
    if(full){s.pos=0;s.qty=0;s.stop=null;s.tag='';s.barsIn=0;s.data={};s.targets=[];cur=null}else s.qty-=qty;
  }
  s.exit=(price,why)=>{if(s.pos)close(s.qty,price??B.c[s.i],s.i,why||'Exit','exit')};
  s.exitPart=(pct,price,why)=>{if(s.pos)close(cur.q0*pct/100,price??B.c[s.i],s.i,why||'Partial exit','tp')};
  s.setTargets=list=>{if(s.pos)s.targets=mkTargets(list,s.pos,s.entry,cur.stop0,cur.q0)};
  const stopKind=()=>cur&&s.stop!=null&&Math.abs(s.stop-s.entry)<=Math.abs(s.entry)*1e-9?'Breakeven stop':cur&&s.stop!==cur.stop0?'Trailing stop':'Stop loss';
  for(let i=warm;i<n;i++){
    const ts=B.t[i];if(ts<from||ts>=to)continue;s.i=i;
    if(pend&&!s.pos){const p=pend,oc=p.cost!=null?+p.cost:cost,px=B.o[i]*(1+oc*p.side);let q=null;
      if(p.qty!=null)q=+p.qty;
      else if(p.riskPct!=null&&p.stop!=null){const dist=Math.abs(px-p.stop);if(dist>0){let notional=eq*(p.riskPct/100)/(dist/px);if(p.maxLev!=null)notional=Math.min(notional,eq*p.maxLev);q=notional/px}}
      else{const pct=p.pct??(cfg.sizeType==='percent'?cfg.size:100);q=cfg.sizeType==='cash'&&p.pct==null?cfg.size/px:eq*pct/100/px}
      if(q>0){s.pos=p.side;s.qty=q;s.entry=px;s.stop=p.stop??null;s.tag=p.tag||'';s.barsIn=0;s.data={};cur={i,mfe:0,mae:0,fund:0,q0:q,stop0:s.stop,lastAlert:s.stop,cost:oc,noFund:!!p.noFunding};s.targets=mkTargets(p.targets,p.side,px,s.stop,q);
        markers.push({i,dir:p.side,k:'in',id:p.side>0?'Long':'Short',price:px});ev(i,'entry',{dir:p.side,price:px,qty:q,stop:s.stop,targets:s.targets.map(t=>({price:t.price,pct:t.qty/q*100,why:t.why})),risk:p.riskPct})}}
    pend=null;
    if(s.pos){s.barsIn++;const f=cur.noFund?0:s.qty*B.c[i]*fund*(s.pos>0?1:fsm);eq-=f;fundTot+=f;cur.fund+=f;
      cur.mfe=Math.max(cur.mfe,(s.pos>0?B.h[i]-s.entry:s.entry-B.l[i])*cur.q0);cur.mae=Math.max(cur.mae,(s.pos>0?s.entry-B.l[i]:B.h[i]-s.entry)*cur.q0);
      if(s.stop!=null&&((s.pos>0&&B.l[i]<=s.stop)||(s.pos<0&&B.h[i]>=s.stop))){const k=stopKind();close(s.qty,s.pos>0?Math.min(B.o[i],s.stop):Math.max(B.o[i],s.stop),i,k==='Stop loss'?'Stop':k==='Trailing stop'?'Trail':'Breakeven','sl')}
      else for(const t of s.targets){if(!s.pos)break;if(t.hit)continue;
        if((s.pos>0&&B.h[i]>=t.price)||(s.pos<0&&B.l[i]<=t.price)){t.hit=true;const px=s.pos>0?Math.max(B.o[i],t.price):Math.min(B.o[i],t.price),last=s.targets.every(x=>x.hit)&&t.qty>=s.qty*(1-1e-9);
          const be=t.moveStop==='breakeven'&&t.qty<s.qty*(1-1e-9)&&(s.stop==null||s.pos*(s.entry-s.stop)>0),prev=s.stop;if(be)s.stop=s.entry;close(t.qty,px,i,t.why,'tp');if(be&&s.pos){ev(i,'stop_move',{stop:s.stop,prev,why:'Stop moved to breakeven',price:B.c[i]});cur.lastAlert=s.stop}}}}
    const before=s.pos?s.stop:null,wasPos=s.pos;
    fn(i,s);
    if(o.stopMoveEvents&&wasPos&&s.pos===wasPos&&before!=null&&s.stop!=null&&Math.abs(s.stop-before)>Math.abs(before)*1e-6){const ref=cur.lastAlert??before;if(Math.abs(s.stop-ref)/Math.abs(ref)*100>=(+o.stopMoveMinPct||0)){ev(i,'stop_move',{stop:s.stop,prev:ref,why:'Trailing stop moved',price:B.c[i]});cur.lastAlert=s.stop}}
    if(pend&&!s.pos){const c=B.c[i],dist=pend.stop!=null?Math.abs(c-pend.stop):0;ev(i,'signal',{dir:pend.side,price:c,stop:pend.stop??null,risk:pend.riskPct,pct:pend.pct??null,tag:pend.tag||'',targets:mkTargets(pend.targets,pend.side,c,pend.stop,1).map(t=>({price:t.price,pct:t.qty*100,why:t.why}))})}
    if(s.pos){stopLine[i]=s.stop;const nt=s.targets.find(t=>!t.hit);if(nt)tpLine[i]=nt.price}
    equity[i]=eq+(s.pos?s.qty*(B.c[i]-s.entry)*s.pos:0);
  }
  const li=n-1,open=s.pos?{dir:s.pos,id:s.tag||(s.pos>0?'Long':'Short'),ei:cur.i,et:B.t[cur.i],ep:s.entry,qty:s.qty,pnl:s.qty*(B.c[li]-s.entry)*s.pos,stop:s.stop,targets:s.targets.filter(t=>!t.hit).map(t=>({price:t.price,why:t.why}))}:null;
  const res=STATS(B,cap,trades,equity,markers,open,{capital:cap,mode:'bar',cost:cost*100,funding8h:(+o.funding8h||0)*100,fill:'open'},{funding:fundTot});
  res.stopLine=stopLine;res.tpLine=tpLine;res.events=events;res.alertInfo=o.alertInfo||null;return res;
}

/* ===== Multi-strategy engine: several strategies, one shared balance (each trade sized from the current total) ===== */
function MBTP(B,cfg,parts,o){
  o=o||{};const n=B.c.length,cap=+(o.capital??cfg.capital)||10000,barMs=n>1?B.t[1]-B.t[0]:864e5,EPS=1e-12;
  const pd=s=>{if(s==null||s==='')return null;const t=typeof s==='number'?s:Date.parse(s);return isFinite(t)?t:null};
  const from=pd(o.from)??-Infinity,to=pd(o.to)??Infinity;
  let eq=cap,fundTot=0;const trades=[],markers=[],events=[],equity=new Array(n).fill(null);
  const side=x=>x==='short'||x<0?-1:1;
  const unreal=(st,px)=>st.s.pos?st.s.qty*(px-st.s.entry)*st.s.pos:0;
  const openRisk=ex=>Sl.reduce((a,st)=>st===ex||!st.s.pos?a:a+st.s.qty*(st.s.stop!=null?Math.max(0,st.s.pos*(st.s.entry-st.s.stop)):st.s.entry),0);
  const openNotional=(ex,px)=>Sl.reduce((a,st)=>st===ex||!st.s.pos?a:a+st.s.qty*px,0);
  const Sl=parts.map(p=>{const po=p.opts||{};const st={p,name:p.name,short:p.short||p.name,cost:po.cost??o.cost??0,fund:(+(po.funding8h??o.funding8h)||0)*barMs/288e5,fsm:po.fundingShortMult??o.fundingShortMult??1,
      noFund:!!po.noFunding,pend:null,cur:null,stopLine:new Array(n).fill(null),tpLine:new Array(n).fill(null),fundTot:0,stopMove:po.stopMoveEvents,stopMin:+po.stopMoveMinPct||0};
    const s=st.s={pos:0,qty:0,entry:0,stop:null,tag:'',barsIn:0,i:0,data:{},targets:[],get equity(){return eq}};
    const ev=(i,type,x)=>events.push(Object.assign({i,t:B.t[i],type,dir:s.pos||x.dir,tag:s.tag,sleeve:st.name},x));st.ev=ev;
    st.mkT=(list,dir,entry,stop,q0)=>(list||[]).map(t=>{const dist=stop!=null?Math.abs(entry-stop):0,price=t.price!=null?+t.price:t.r!=null&&dist?entry+dir*t.r*dist:null;
      return price==null?null:{price,qty:q0*Math.min(1,Math.max(0,(t.pct??100)/100)),why:t.why||'TP',moveStop:t.moveStop||null,hit:false}}).filter(Boolean).sort((a,b)=>dir*(a.price-b.price));
    st.close=(qty,price,i,why,kind)=>{qty=Math.min(qty,s.qty);if(!(qty>EPS))return;const cur=st.cur,px=price*(1-st.cost*s.pos),pnl=qty*(px-s.entry)*s.pos,full=s.qty-qty<=s.qty*1e-9;eq+=pnl;
      trades.push({n:0,dir:s.pos,id:st.name,sleeve:st.name,ei:cur.i,et:B.t[cur.i],ep:s.entry,xi:i,xt:B.t[i],xp:px,qty,pnl,pct:pnl/(qty*s.entry)*100,why,partial:!full,mfe:cur.mfe*qty/cur.q0,mae:cur.mae*qty/cur.q0,bars:i-cur.i,funding:full?cur.fund:0});
      markers.push({i,dir:-s.pos,k:'out',id:st.short+' '+why,price:px});ev(i,kind||'exit',{price,qty,why,pnl,entry:s.entry,remaining:full?0:s.qty-qty,stop:s.stop,q0:cur.q0});
      if(full){s.pos=0;s.qty=0;s.stop=null;s.tag='';s.barsIn=0;s.data={};s.targets=[];st.cur=null}else s.qty-=qty};
    s.order=(d,a={})=>{st.pend=Object.assign({side:side(d)},a)};s.buy=(a={})=>s.order(1,a);s.sell=(a={})=>s.order(-1,a);
    s.setStop=v=>{s.stop=v==null||!isFinite(v)?null:+v};
    s.exit=(price,why)=>{if(s.pos)st.close(s.qty,price??B.c[s.i],s.i,why||'Exit','exit')};
    s.exitPart=(pct,price,why)=>{if(s.pos)st.close(st.cur.q0*pct/100,price??B.c[s.i],s.i,why||'Partial exit','tp')};
    return st});
  for(let i=0;i<n;i++){
    const ts=B.t[i];if(ts<from||ts>=to)continue;
    for(const st of Sl){const s=st.s;s.i=i;const p=st.pend;st.pend=null;if(!p||s.pos)continue;
      const oc=p.cost!=null?+p.cost:st.cost,px=B.o[i]*(1+oc*p.side);let q=null;
      if(p.qty!=null)q=+p.qty;
      else if(p.riskPct!=null&&p.stop!=null){const dist=Math.abs(px-p.stop);if(dist>0){let notional=eq*(p.riskPct/100)/(dist/px);if(p.maxLev!=null)notional=Math.min(notional,eq*p.maxLev);q=notional/px}}
      else q=eq*(p.pct??100)/100/px;
      if(q>0&&o.maxRiskPct!=null&&p.stop!=null){const room=eq*o.maxRiskPct/100-openRisk(st),r1=Math.abs(px-p.stop);if(room<=0)q=0;else q=Math.min(q,room/r1)}
      if(q>0&&o.maxExposure!=null){const room=eq*o.maxExposure-openNotional(st,px);q=room<=0?0:Math.min(q,room/px)}
      if(q>0&&p.minQty!=null&&q<p.minQty)q=0;
      if(!(q>0)){st.ev(i,'skipped',{dir:p.side,why:'Risk cap reached',price:px});continue}
      s.pos=p.side;s.qty=q;s.entry=px;s.stop=p.stop??null;s.tag=p.tag||'';s.barsIn=0;s.data={};st.cur={i,mfe:0,mae:0,fund:0,q0:q,stop0:s.stop,lastAlert:s.stop,cost:oc,noFund:!!p.noFunding||st.noFund};s.targets=st.mkT(p.targets,p.side,px,s.stop,q);
      markers.push({i,dir:p.side,k:'in',id:st.short+' '+(p.side>0?'Long':'Short'),price:px});st.ev(i,'entry',{dir:p.side,price:px,qty:q,stop:s.stop,risk:p.riskPct})}
    for(const st of Sl){const s=st.s,cur=st.cur;if(!s.pos)continue;s.barsIn++;
      const f=cur.noFund?0:s.qty*B.c[i]*st.fund*(s.pos>0?1:st.fsm);eq-=f;fundTot+=f;cur.fund+=f;st.fundTot+=f;
      cur.mfe=Math.max(cur.mfe,(s.pos>0?B.h[i]-s.entry:s.entry-B.l[i])*cur.q0);cur.mae=Math.max(cur.mae,(s.pos>0?s.entry-B.l[i]:B.h[i]-s.entry)*cur.q0);
      if(s.stop!=null&&((s.pos>0&&B.l[i]<=s.stop)||(s.pos<0&&B.h[i]>=s.stop))){const k=Math.abs(s.stop-s.entry)<=Math.abs(s.entry)*1e-9?'Breakeven':s.stop!==cur.stop0?'Trail':'Stop';st.close(s.qty,s.pos>0?Math.min(B.o[i],s.stop):Math.max(B.o[i],s.stop),i,k,'sl')}
      else for(const t of s.targets){if(!s.pos)break;if(t.hit)continue;if((s.pos>0&&B.h[i]>=t.price)||(s.pos<0&&B.l[i]<=t.price)){t.hit=true;const px=s.pos>0?Math.max(B.o[i],t.price):Math.min(B.o[i],t.price);
        const be=t.moveStop==='breakeven'&&t.qty<s.qty*(1-1e-9)&&(s.stop==null||s.pos*(s.entry-s.stop)>0),prev=s.stop;if(be)s.stop=s.entry;st.close(t.qty,px,i,t.why,'tp');if(be&&s.pos){st.ev(i,'stop_move',{stop:s.stop,prev,why:'Stop moved to breakeven',price:B.c[i]});st.cur.lastAlert=s.stop}}}}
    for(const st of Sl){const s=st.s,before=s.pos?s.stop:null,was=s.pos;st.p.fn(i,s);
      if(st.stopMove&&was&&s.pos===was&&before!=null&&s.stop!=null&&Math.abs(s.stop-before)>Math.abs(before)*1e-6){const ref=st.cur.lastAlert??before;if(Math.abs(s.stop-ref)/Math.abs(ref)*100>=st.stopMin){st.ev(i,'stop_move',{stop:s.stop,prev:ref,why:'Trailing stop moved',price:B.c[i]});st.cur.lastAlert=s.stop}}
      const p=st.pend;if(p&&!s.pos){const c=B.c[i];st.ev(i,'signal',{dir:p.side,price:c,stop:p.stop??null,risk:p.riskPct,pct:p.pct??null,tag:p.tag||'',targets:[]})}
      if(s.pos){st.stopLine[i]=s.stop;const nt=s.targets.find(t=>!t.hit);if(nt)st.tpLine[i]=nt.price}}
    equity[i]=eq+Sl.reduce((a,st)=>a+unreal(st,B.c[i]),0);
  }
  trades.sort((a,b)=>a.xi-b.xi||a.ei-b.ei);trades.forEach((t,k)=>t.n=k+1);
  const li=n-1,opens=Sl.filter(st=>st.s.pos).map(st=>({dir:st.s.pos,id:st.name,sleeve:st.name,ei:st.cur.i,et:B.t[st.cur.i],ep:st.s.entry,qty:st.s.qty,pnl:unreal(st,B.c[li]),stop:st.s.stop}));
  const res=STATS(B,cap,trades,equity,markers,opens.length?{pnl:opens.reduce((a,x)=>a+x.pnl,0)}:null,{capital:cap,mode:'bar',cost:(o.costLabel??0),funding8h:(o.fundingLabel??0),fill:'open',shared:true},{funding:fundTot});
  res.opens=opens;res.events=events;res.alertInfo=o.alertInfo||null;
  res.sleeves=Sl.map(st=>{const tr=trades.filter(t=>t.sleeve===st.name),w=tr.filter(t=>t.pnl>0),net=tr.reduce((a,t)=>a+t.pnl,0);let pk=0;
    return{name:st.name,stopLine:st.stopLine,tpLine:st.tpLine,stats:{ret:net/cap*100,all:{count:tr.length,wins:w.length,winRate:tr.length?w.length/tr.length*100:0},mddPct:NaN,funding:st.fundTot}}});
  return res;
}

/* ===== Script runner (inside a Web Worker) ===== */
function RUN(e){
  const {code,bars,inputs}=e.data,n=bars.c.length;
  const out={title:'My script',overlay:true,plots:[],shapes:[],hlines:[],bgs:[],fills:[],inputs:[],alerts:[],strategy:null,orders:[],error:null,logs:[]};
  const clean=v=>v===true?1:v===false?0:typeof v==='number'&&isFinite(v)?v:null;
  const toArr=x=>Array.isArray(x)?x:typeof x==='function'?Array.from({length:n},(_,i)=>{try{return x(i)}catch(err){return null}}):new Array(n).fill(x);
  const open=bars.o,high=bars.h,low=bars.l,close=bars.c,volume=bars.v,time=bars.t;
  const hl2=high.map((v,i)=>(v+low[i])/2),hlc3=high.map((v,i)=>(v+low[i]+close[i])/3),ohlc4=high.map((v,i)=>(open[i]+v+low[i]+close[i])/4),bar_index=close.map((_,i)=>i);
  const series=fn=>toArr(fn).map(v=>typeof v==='boolean'?v:clean(v));
  const indicator=(t,o={})=>{out.title=String(t);if(o.overlay!=null)out.overlay=!!o.overlay};
  const strategy=(t,o={})=>{out.title=String(t);out.overlay=o.overlay??true;out.strategy=Object.assign({capital:10000,size:100,sizeType:'percent',commission:0.05,slippage:0,fill:'open'},o)};
  strategy.entry=(id,dir,when,o={})=>out.orders.push({k:'entry',id:String(id),dir:dir==='short'||dir===-1?-1:1,when:toArr(when),qty:o.qty});
  strategy.close=(id,when)=>out.orders.push({k:'close',id:String(id),when:toArr(when)});
  strategy.closeAll=when=>out.orders.push({k:'close',id:null,when:toArr(when)});
  strategy.exit=(id,o={})=>out.orders.push({k:'exit',id:id==null?null:String(id),stopPct:o.stopPct,takePct:o.takePct,trailPct:o.trailPct,stop:o.stop!=null?toArr(o.stop):null,limit:o.limit!=null?toArr(o.limit):null});
  strategy.runMulti=(parts,o={})=>{if(!out.strategy)strategy(out.title);out.bt=MBTP(bars,out.strategy,parts,o);out.manual=true;return out.bt};
  strategy.report=res=>{if(!out.strategy)strategy(out.title);out.bt=res;out.manual=true;return res};
  strategy.combine=(parts,o={})=>{const cap=+(o.capital??(out.strategy&&out.strategy.capital)??10000),eq=new Array(n).fill(null);let trades=[],markers=[],events=[];const opens=[];
    for(const p of parts){const r=p.bt,base=r.cfg.capital;for(const t of r.trades)trades.push(Object.assign({},t,{sleeve:p.name,id:p.name}));
      for(const m of r.markers)markers.push(Object.assign({},m,{id:p.short+' '+m.id}));for(const ev of r.events||[])events.push(Object.assign({},ev,{sleeve:p.name}));
      if(r.open)opens.push(Object.assign({},r.open,{sleeve:p.name,id:p.name}))}
    for(let i=0;i<n;i++){let v=cap,any=false;for(const p of parts){const x=p.bt.equity[i];if(x!=null){v+=x-p.bt.cfg.capital;any=true}}eq[i]=any?v:null}
    trades.sort((a,b)=>a.xi-b.xi||a.ei-b.ei);trades.forEach((t,k)=>t.n=k+1);events.sort((a,b)=>a.i-b.i);
    const fund=parts.reduce((s,p)=>s+(p.bt.stats.funding||0),0),openPnl=opens.reduce((s,x)=>s+x.pnl,0);
    const res=STATS(bars,cap,trades,eq,markers,opens.length?{pnl:openPnl}:null,{capital:cap,mode:'bar',cost:o.costLabel??0,funding8h:o.fundingLabel??0,fill:'open',parts:parts.map(p=>p.name)},{funding:fund});
    res.opens=opens;res.events=events;res.alertInfo=o.alertInfo||null;res.sleeves=parts.map(p=>({name:p.name,stats:p.bt.stats}));return res};
  strategy.simulate=(b,fn,o={})=>BTP(b,out.strategy||{capital:10000,size:100,sizeType:'percent',commission:0.05},fn,o);
  strategy.run=(fn,o={})=>{if(!out.strategy)strategy(out.title);out.bt=BTP(bars,out.strategy,fn,o);out.manual=true;return out.bt};
  const input=(name,def,o={})=>{const v=inputs&&inputs[name]!==undefined?inputs[name]:def;out.inputs.push({name,def,options:o.options||null,min:o.min,max:o.max,step:o.step});return v};
  const plot=(s,title='Plot',color='#2962ff',o={})=>{out.plots.push({n:String(title),d:toArr(s).map(clean),c:color,t:o.style||'line',w:o.width||1.5,o:o.offset||0});return out.plots.length-1};
  const plotshape=(cond,title='Signal',o={})=>{out.shapes.push({n:String(title),d:toArr(cond).map(Boolean),loc:o.location||'abovebar',c:o.color||'#2962ff',shape:o.shape||(o.location==='belowbar'?'triangleup':'triangledown'),text:o.text||''})};
  const hline=(price,title='',color='#787b86')=>out.hlines.push({p:+price,n:title,c:color});
  const bgcolor=(cond,color='#2962ff')=>out.bgs.push({d:toArr(cond).map(Boolean),c:color});
  const fill=(a,b,color='#2962ff')=>out.fills.push([a,b,color]);
  const alertcondition=(cond,title='Alert')=>out.alerts.push({d:toArr(cond).map(Boolean),n:String(title)});
  const log=(...a)=>{if(out.logs.length<200)out.logs.push(a.map(x=>typeof x==='object'?JSON.stringify(x):String(x)).join(' '))};
  try{
    new Function('open','high','low','close','volume','time','hl2','hlc3','ohlc4','bar_index','ta','series','input','indicator','strategy','plot','plotshape','hline','bgcolor','fill','alertcondition','log','na','nz','Math',
      '"use strict";\n'+code)(open,high,low,close,volume,time,hl2,hlc3,ohlc4,bar_index,ta,series,input,indicator,strategy,plot,plotshape,hline,bgcolor,fill,alertcondition,log,null,ta.nz,Math);
  }catch(err){const m=/<anonymous>:(\d+):(\d+)/.exec(err&&err.stack||'');out.error=(err&&err.message||String(err))+(m?` (line ${m[1]-3})`:'')}
  if(!out.error&&!out.manual&&out.orders.length){if(!out.strategy)strategy(out.title);try{out.bt=BT(bars,out.strategy,out.orders)}catch(err){out.error='Backtest failed: '+err.message}}
  delete out.orders;postMessage(out);
}
