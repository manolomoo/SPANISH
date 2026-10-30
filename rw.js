/* 黑狗獎勵機制 */
(function(){
const UNITS=[
 {id:"u1",n:1,file:"week01.html",name:"冠詞",title:"定冠詞 el / la / los / las、不定冠詞 un / una / unos / unas",count:"24 個單字",types:["cards","quiz","speak"]},
 {id:"u2",n:2,file:"week02.html",name:"冠詞＋單字",title:"用冠詞認識新單字、短文 Un día de playa con Pepe",count:"29 個單字",types:["cards","quiz","speak","hang","story"]},
 {id:"u3",n:3,file:"week03.html",name:"動詞 Verbos 1",title:"10 個常用動詞的現在式變化＋現在分詞",count:"10 個動詞",types:["cards","quiz","speak"]},
 {id:"u4",n:4,file:"week04.html",name:"Estar + Gerundio",title:"正在做…：看圖說「Hay … en la foto. … está …」",count:"11 組造句",types:["cards","quiz","speak"]}];
const TN={cards:"圖卡聆聽",quiz:"小測驗",speak:"口說練習",hang:"吊人遊戲",story:"短文跟讀"};
const RULE={cards:"每張圖卡的發音都聽過一次（點圖卡、念一次或回音法都算）",quiz:"同一次練習中作答滿 10 題，且正確率 ≥ 80%",speak:"在 5 張不同的卡／題目上按「念這句」或「看答案」並跟著說",hang:"猜對 3 個不同的單字",story:"短文每一句都聽過（全文連播一次即可）"};
const KEY="esRW1";const ld=()=>{try{return JSON.parse(localStorage.getItem(KEY))||{}}catch(e){return{}}};const sv=d=>localStorage.setItem(KEY,JSON.stringify(d));
function dog(st,sz){sz=sz||44;const f=st?"#16171c":"none",s=st?"#16171c":"#a3a8b5",e=st?"#fff":"#a3a8b5";
const crown=st===2?'<path d="M17 13 L20 4 L26 10 L32 2 L38 10 L44 4 L47 13 Z" fill="#f5b301" stroke="#c78a00" stroke-width="1.5" stroke-linejoin="round"/><circle cx="32" cy="2.5" r="2" fill="#e8463a"/>':'';
return `<svg viewBox="0 0 64 64" width="${sz}" height="${sz}" aria-hidden="true">${crown}<g stroke="${s}" stroke-width="${st?0:2.5}" stroke-dasharray="${st?0:"4 3"}"><path d="M13 20 C5 22 4 38 10 44 C14 46 17 40 18 34 Z" fill="${f}"/><path d="M51 20 C59 22 60 38 54 44 C50 46 47 40 46 34 Z" fill="${f}"/><path d="M18 16 C22 12 42 12 46 16 C52 24 52 44 46 52 C40 59 24 59 18 52 C12 44 12 24 18 16 Z" fill="${f}"/></g><circle cx="25" cy="33" r="3.3" fill="${e}"/><circle cx="39" cy="33" r="3.3" fill="${e}"/><ellipse cx="32" cy="43" rx="5" ry="3.6" fill="${st?"#fff":s}"/><ellipse cx="32" cy="42.3" rx="3" ry="2" fill="${st?"#16171c":"none"}"/>${st?'<path d="M29 49 Q32 52 35 49" stroke="#fff" stroke-width="1.8" fill="none" stroke-linecap="round"/><path d="M30.5 50.5 Q32 56 33.5 50.5" fill="#ff7a8a"/>':''}</svg>`}
function tst(u,t){const x=((ld()[u]||{})[t])||{};return x.c?2:x.s?1:0}
function ust(U){const a=U.types.map(t=>tst(U.id,t));return a.every(v=>v===2)?2:a.some(v=>v)?1:0}
function celebrate(msg){document.querySelectorAll(".rw-pop,.rw-cf").forEach(x=>x.remove());const d=document.createElement("div");d.className="rw-pop";d.innerHTML=dog(2,90)+"<div>"+msg+"</div>";document.body.appendChild(d);
for(let k=0;k<26;k++){const c=document.createElement("span");c.className="rw-cf";c.textContent=["🎉","⭐","🐾","✨","👑"][k%5];c.style.left=Math.random()*100+"vw";c.style.animationDelay=Math.random()*.6+"s";document.body.appendChild(c);setTimeout(()=>c.remove(),2600)}
setTimeout(()=>d.remove(),2600)}
const css=document.createElement("style");css.textContent=`.rw-pop{position:fixed;left:50%;top:38%;transform:translate(-50%,-50%) scale(.3);background:var(--cd,#fff);color:var(--fg,#111);border:2px solid #f5b301;border-radius:20px;padding:18px 24px;text-align:center;font-size:20px;font-weight:800;z-index:99;box-shadow:0 10px 40px #0004;animation:rwp 2.6s ease forwards}
@keyframes rwp{0%{transform:translate(-50%,-50%) scale(.3);opacity:0}15%{transform:translate(-50%,-50%) scale(1.08);opacity:1}25%{transform:translate(-50%,-50%) scale(1)}85%{opacity:1}100%{opacity:0;transform:translate(-50%,-60%) scale(1)}}
.rw-cf{position:fixed;top:-30px;font-size:24px;z-index:98;animation:rwf 2.4s linear forwards;pointer-events:none}@keyframes rwf{to{transform:translateY(105vh) rotate(540deg)}}
.rwg{display:grid;grid-template-columns:repeat(auto-fill,minmax(96px,1fr));gap:8px}.rwi{text-align:center;font-size:13px;border:1px solid var(--ln);border-radius:12px;padding:6px 4px}.rwi b{display:block;font-size:14px}.rwi .p{color:var(--mu);font-size:12px}
.rwk{display:flex;align-items:center;gap:10px}.rwr{font-size:12px;color:var(--mu);line-height:1.6}`;document.head.appendChild(css);
window.RW={UNITS,dog,ust,tst,TN,RULE,celebrate,
page(uid,cfg){const U=UNITS.find(x=>x.id===uid);const box=document.getElementById("rw");
const sess={quiz:[0,0]};
function upd(t,fn){const d=ld();d[uid]=d[uid]||{};const x=d[uid][t]=d[uid][t]||{};const before=ust(U),bt=x.c?2:x.s?1:0;fn(x);x.s=1;sv(d);const at=x.c?2:1,after=ust(U);
if(after===2&&before!==2)celebrate("單元 "+U.n+" 完成！<br>獲得 黑狗王 👑");else if(at===2&&bt!==2)celebrate(TN[t]+" 完成！<br>黑狗戴上皇冠 👑");else if(bt===0)celebrate("開始 "+TN[t]+"<br>獲得 黑狗 🐾");draw()}
function prog(t){const x=((ld()[uid]||{})[t])||{};if(x.c)return"完成";if(t==="cards")return (x.h||[]).length+" / "+cfg.cards.length;if(t==="story")return (x.h||[]).length+" / "+cfg.story.length;if(t==="speak")return (x.h||[]).length+" / 5";if(t==="hang")return (x.h||[]).length+" / 3";if(t==="quiz")return x.s?"最佳 "+(x.b||"—"):"未開始";return""}
function draw(){const s=ust(U);box.innerHTML=`<div class="rwk">${dog(s,56)}<div><b style="font-size:18px">${s===2?"黑狗王！本單元全部完成":s?"黑狗徽章收集中":"還沒開始，做練習就能得到黑狗"}</b><div class="mu" style="font-size:13px">每種題型：灰色虛線＝未開始・黑狗＝已練習・戴皇冠＝完成；全部完成 → 單元黑狗王</div></div></div>
<div class="rwg">${U.types.map(t=>{const v=tst(uid,t);return`<div class="rwi">${dog(v,40)}<b>${TN[t]}</b><span class="p">${prog(t)}</span></div>`}).join("")}</div>
<details class="rwr"><summary>完成規則</summary>${U.types.map(t=>"・"+TN[t]+"："+RULE[t]).join("<br>")}<br><a href="#" id="rwreset" style="color:var(--mu)">重設本單元進度</a></details>`;
const r=document.getElementById("rwreset");if(r)r.onclick=e=>{e.preventDefault();if(confirm("確定重設本單元的黑狗進度？")){const d=ld();delete d[uid];sv(d);draw()}}}
const heard=(t,list,k)=>{if(!list.includes(k))return;upd(t,x=>{x.h=x.h||[];if(!x.h.includes(k))x.h.push(k);if(x.h.length>=list.length)x.c=1})};
const _p=window.play1;window.play1=function(k){heard("cards",cfg.cards,k);if(cfg.story)heard("story",cfg.story,k);return _p.apply(this,arguments)};
const _q=window.quiz;window.quiz=function(){_q.apply(this,arguments);const sc=cfg.score(),dn=cfg.done();if(dn>sess.quiz[1]){sess.quiz=[sc,dn];upd("quiz",x=>{const pct=Math.round(sc/dn*100);if(dn>=10&&(!x.b||pct>parseInt(x.b)))x.b=pct+"%（"+dn+" 題）";if(dn>=10&&sc/dn>=.8)x.c=1})}};
cfg.speakBtn.addEventListener("click",()=>{const k=cfg.speakText();upd("speak",x=>{x.h=x.h||[];if(!x.h.includes(k))x.h.push(k);if(x.h.length>=5)x.c=1})});
if(cfg.hang){const _h=window.hang;window.hang=function(){_h.apply(this,arguments);const w=cfg.hang();if(w)upd("hang",x=>{x.h=x.h||[];if(!x.h.includes(w))x.h.push(w);if(x.h.length>=3)x.c=1})}}
draw()},
home(el,sum){const all=UNITS.flatMap(U=>U.types.map(t=>tst(U.id,t)));const kings=UNITS.filter(U=>ust(U)===2).length;
sum.innerHTML=`<div class="rwk">${dog(kings===UNITS.length?2:all.some(v=>v)?1:0,52)}<div><b>我的黑狗進度</b><div style="font-size:15px">黑狗王 ${kings} / ${UNITS.length} 個單元・題型完成 ${all.filter(v=>v===2).length} / ${all.length}・已練習 ${all.filter(v=>v).length} / ${all.length}</div></div></div><div class="rwr">做任何一種練習就得到黑狗；某題型達成規則後黑狗戴上皇冠；一個單元的題型全部完成就是「黑狗王」。進度存在這台裝置的瀏覽器裡。</div>`;
el.innerHTML=UNITS.map(U=>{const s=ust(U);return`<a class="card" href="${U.file}"><div class="t"><span class="wk">單元 ${U.n}｜${U.name}</span>${dog(s,48)}</div><div class="s">${U.title}</div><div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:10px;align-items:center">${U.types.map(t=>`<span title="${TN[t]}" style="display:inline-flex;align-items:center;gap:2px;font-size:12px;color:var(--mu)">${dog(tst(U.id,t),24)}${TN[t]}</span>`).join("")}</div><div class="go">${s===2?"👑 黑狗王・再練一次 →":"開始練習 →"}</div></a>`}).join("")}};
})();
