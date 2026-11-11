/* 練習紀錄與💩 */
(function(){
const UNITS=[
 {id:"u0",n:0,file:"week00.html",name:"文法術語 Gramática",title:"學語言常用的文法詞：西／英／中＋例子（工具單元）",count:"23 個術語",types:["cards","quiz","speak"]},
 {id:"u1",n:1,file:"week01.html",name:"冠詞",title:"定冠詞 el / la / los / las、不定冠詞 un / una / unos / unas",count:"24 個單字",types:["cards","quiz","speak"]},
 {id:"u2",n:2,file:"week02.html",name:"冠詞＋單字",title:"用冠詞認識新單字、短文 Un día de playa con Pepe",count:"29 個單字",types:["cards","quiz","speak","hang","story"]},
 {id:"u3",n:3,file:"week03.html",name:"動詞 Verbos 1",title:"10 個常用動詞的現在式變化＋現在分詞",count:"10 個動詞",types:["cards","quiz","speak"]},
 {id:"u4",n:4,file:"week04.html",name:"Estar + Gerundio",title:"正在做…：看圖說「Hay … en la foto. … está …」",count:"11 組造句",types:["cards","quiz","speak"]},
 {id:"u5",n:5,file:"week05.html",name:"Ser + 形容詞・顏色",title:"形容詞性數一致、顏色、動詞 Ser",count:"顏色＋Pronuncia＋Ser",types:["cards","quiz","speak"]}];
const TN={cards:"圖卡聆聽",quiz:"小測驗",speak:"口說練習",hang:"吊人遊戲",story:"短文跟讀"};
const RULE={cards:"每張圖卡的發音都聽過一次（點圖卡、念一次或回音法都算）",quiz:"同一次練習中作答滿 10 題，且正確率 ≥ 80%",speak:"在 5 張不同的卡／題目上按「念這句」或「看答案」並跟著說",hang:"猜對 3 個不同的單字",story:"短文每一句都聽過（全文連播一次即可）"};
const KEY="esRW1";let MEM=null,LSOK=true;try{localStorage.setItem("__t","1");localStorage.removeItem("__t")}catch(e){LSOK=false}
const ld=()=>{if(!LSOK)return MEM||(MEM={});try{return JSON.parse(localStorage.getItem(KEY))||{}}catch(e){return MEM||{}}};
const sv=d=>{MEM=d;if(LSOK)try{localStorage.setItem(KEY,JSON.stringify(d))}catch(e){LSOK=false}};
const POO=n=>n?"💩".repeat(Math.min(n,4)):"";const pget=k=>((ld().pm||{})[k])||0;
const last={};function emit(o){try{window.dispatchEvent(new CustomEvent("rwx",{detail:o}))}catch(e){}}
function pinc(k,force){const t=Date.now();if(!force&&last[k]&&t-last[k]<2500)return 0;last[k]=t;const d=ld();d.pm=d.pm||{};const was=d.pm[k]||0;d.pm[k]=Math.min(was+1,4);sv(d);toast("+💩");return was?2:1}
function toast(m){let e=document.getElementById("rw-t");if(!e){e=document.createElement("div");e.id="rw-t";document.body.appendChild(e)}e.textContent=m;e.className="";void e.offsetWidth;e.className="on"}
function verCheck(){const pv=window.PAGEVER;if(!pv)return;fetch("version.txt?"+Date.now(),{cache:"no-store"}).then(r=>r.ok?r.text():"").then(v=>{v=(v||"").trim();if(v&&v!==pv){const b=document.createElement("div");b.className="rw-ban";b.innerHTML="有新版本 ✨ <button>點我更新</button>";b.querySelector("button").onclick=()=>location.replace(location.pathname+"?v="+v);document.body.prepend(b)}}).catch(()=>{})}
function tst(u,t){const x=((ld()[u]||{})[t])||{};return x.c?2:x.s?1:0}
function ust(U){const a=U.types.map(t=>tst(U.id,t));return a.every(v=>v===2)?2:a.some(v=>v)?1:0}
const css=document.createElement("style");css.textContent=`.rw-cf{position:fixed;top:-30px;font-size:24px;z-index:98;animation:rwf 2.4s linear forwards;pointer-events:none}@keyframes rwf{to{transform:translateY(105vh) rotate(540deg)}}
#rw-t{position:fixed;left:50%;bottom:90px;transform:translateX(-50%);font-size:26px;opacity:0;pointer-events:none;z-index:97}#rw-t.on{animation:rwt 1s ease}@keyframes rwt{0%{opacity:0;transform:translate(-50%,10px) scale(.6)}30%{opacity:1;transform:translate(-50%,0) scale(1.2)}100%{opacity:0;transform:translate(-50%,-40px)}}
.pm{font-size:15px;min-height:18px;letter-spacing:1px}.ca .pm{position:absolute;left:8px;top:6px;font-size:13px}
.rw-ban{position:sticky;top:0;z-index:99;background:#f5b301;color:#111;padding:10px;text-align:center;font-weight:700}.rw-ban button{margin-left:8px;padding:6px 12px;border-radius:8px;border:0;background:#111;color:#fff}
.rwr{font-size:12px;color:var(--mu);line-height:1.6}`;document.head.appendChild(css);
window.RW={LSOK:()=>LSOK,toast,emit,UNITS,ust,tst,TN,RULE,pget,ld,
page(uid,cfg){try{const d=ld();if(d&&!d.pmSplit){d.pm=d.pm||{};[["u5|cards|masculine","u5|cards|masculino"],["u5|cards|feminine","u5|cards|femenino"],["u5|cards|singular_en","u5|cards|singular"],["u5|cards|plural_en","u5|cards|plural"],["u5|cards|The sun is masculine.","u5|cards|El sol es masculino."],["u5|cards|The cloud is feminine.","u5|cards|La nube es femenina."]].forEach(([a,b])=>{if(d.pm[a])d.pm[b]=Math.max(d.pm[b]||0,d.pm[a])});d.pmSplit=1;sv(d)}}catch(e){}
const U=UNITS.find(x=>x.id===uid);const box=document.getElementById("rw");
const sess={quiz:[0,0],hw:null};cfg.allCards=cfg.cards;RW.cfg=cfg;RW.uid=uid;
function upd(t,fn){const d=ld();d[uid]=d[uid]||{};const x=d[uid][t]=d[uid][t]||{};const before=ust(U),bt=x.c?2:x.s?1:0;fn(x);x.s=1;sv(d);const at=x.c?2:1,after=ust(U);if(at===2&&bt!==2)emit({uid,t:"crown",ty:t});if(after===2&&before!==2)emit({uid,t:"king"});
draw()}
var draw=function(){box.innerHTML=`${LSOK?"":'<div style="color:#d64545;font-size:13px">⚠️ 這個瀏覽器無法儲存進度（可能是私密瀏覽），離開頁面後練習紀錄和💩會消失。</div>'}<div class="rwr">💩＝每個單字／題目／句子練過幾次（最多 4 個）。版本 ${window.PAGEVER||""}</div><details class="rwr"><summary>完成規則</summary>${U.types.map(t=>"・"+TN[t]+"："+RULE[t]).join("<br>")}<br><a href="#" id="rwreset" style="color:var(--mu)">重設本單元進度</a></details>`;
const r=document.getElementById("rwreset");if(r)r.onclick=e=>{e.preventDefault();if(confirm("確定重設本單元的練習進度？")){const d=ld();delete d[uid];sv(d);draw()}}}
const heard=(t,list,k)=>{if(!list.includes(k))return;upd(t,x=>{x.h=x.h||[];if(!x.h.includes(k))x.h.push(k);if(x.h.length>=list.length)x.c=1})};
const _p=window.play1;window.play1=function(k){cfg.onPlay&&cfg.onPlay(k);heard("cards",cfg.cards,k);if(cfg.story)heard("story",cfg.story,k);return _p.apply(this,arguments)};
const _q=window.quiz;window.quiz=function(){_q.apply(this,arguments);const sc=cfg.score(),dn=cfg.done();if(dn>sess.quiz[1]){const ok=sc>sess.quiz[0];sess.quiz=[sc,dn];cfg.onQuiz&&cfg.onQuiz(ok);upd("quiz",x=>{const pct=Math.round(sc/dn*100);if(dn>=10&&(!x.b||pct>parseInt(x.b)))x.b=pct+"%（"+dn+" 題）";if(dn>=10&&sc/dn>=.8)x.c=1})}};
cfg.speakBtn.addEventListener("click",()=>{const k=cfg.speakText();cfg.onSpeak&&cfg.onSpeak(k);upd("speak",x=>{x.h=x.h||[];if(!x.h.includes(k))x.h.push(k);if(x.h.length>=5)x.c=1})});
if(cfg.hang){const _h=window.hang;window.hang=function(){_h.apply(this,arguments);const w=cfg.hang();if(w&&w!==sess.hw){sess.hw=w;cfg.onHang&&cfg.onHang(w)}if(w)upd("hang",x=>{x.h=x.h||[];if(!x.h.includes(w))x.h.push(w);if(x.h.length>=3)x.c=1})}}
const P=t=>uid+"|"+t+"|";
function mark(el,key,cls){if(!el)return;let m=el.querySelector(":scope>.pm");if(!m){m=document.createElement("div");m.className="pm";el.appendChild(m)}m.textContent=POO(pget(key))}
function deco(){document.querySelectorAll("#ga .ca").forEach(el=>{const c=cfg.list()[+el.dataset.k];if(c)mark(el,P("cards")+cfg.cardKey(c))});
const c=cfg.list()[cfg.idx()];let m=document.getElementById("pmw");if(!m){m=document.createElement("div");m.id="pmw";m.className="pm";document.getElementById("w").after(m)}if(c)m.textContent=POO(pget(P("cards")+cfg.cardKey(c)));
let q=document.getElementById("pmq");if(!q){q=document.createElement("div");q.id="pmq";q.className="pm";document.getElementById("qo").before(q)}q.textContent=POO(pget(P("quiz")+cfg.qkey()));
let sp=document.getElementById("pms");if(!sp){sp=document.createElement("div");sp.id="pms";sp.className="pm";(cfg.speakBtn.parentNode.classList.contains('row')?cfg.speakBtn.parentNode:cfg.speakBtn).before(sp)}sp.textContent=POO(pget(P("speak")+cfg.speakText()));
if(cfg.story)cfg.story.forEach((k,j)=>mark(document.getElementById("s"+j),P("story")+k));
if(cfg.hang){let h=document.getElementById("pmh");if(!h){h=document.createElement("div");h.id="pmh";h.className="pm";document.getElementById("hz").after(h)}h.textContent=POO(pget(P("hang")+cfg.hkey()))}}
RW.deco=deco;const _r=window.render;window.render=function(){_r.apply(this,arguments);deco()};
const _q2=window.quiz;window.quiz=function(){_q2.apply(this,arguments);deco()};
if(cfg.hang){const _h2=window.hang;window.hang=function(){_h2.apply(this,arguments);deco()}}
if(cfg.drillFn){const n=cfg.drillFn;const o=window[n];window[n]=function(){o.apply(this,arguments);deco()}}
cfg.onPlay=k=>{let r;if(cfg.allCards.includes(k)&&(r=pinc(P("cards")+k)))emit({uid,t:"cards",isNew:r===1});if(cfg.story&&cfg.story.includes(k)&&(r=pinc(P("story")+k)))emit({uid,t:"story",isNew:r===1});deco()};
cfg.onQuiz=ok=>{const r=pinc(P("quiz")+cfg.qkey(),1);emit({uid,t:"quiz",isNew:r===1,ok});deco()};cfg.onSpeak=k=>{const r=pinc(P("speak")+k);if(r)emit({uid,t:"speak",isNew:r===1});deco()};cfg.onHang=w=>{const r=pinc(P("hang")+w,1);emit({uid,t:"hang",isNew:r===1,ok:true});deco()};
draw();deco();verCheck()},
home(el,sum){verCheck();if(sum)sum.remove();
el.innerHTML=UNITS.map(U=>{const s=ust(U);return`<a class="card" href="${U.file}"><div class="t"><span class="wk">單元 ${U.n}｜${U.name}</span></div><div class="s">${U.title}</div><div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:10px;align-items:center">${U.types.map(t=>`<span title="${TN[t]}" style="font-size:12px;color:var(--mu)">${TN[t]}</span>`).join("")}</div><div class="go">${s===2?"再練一次 →":"開始練習 →"}</div></a>`}).join("")}};
})();
